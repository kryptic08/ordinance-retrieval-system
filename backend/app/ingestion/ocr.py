import csv
import io
import logging
import shutil
import subprocess
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

import fitz
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

from app.core.config import settings
from app.ingestion.ocr_helper import clean_and_format_ocr_text

logger = logging.getLogger(__name__)


@dataclass
class OCRResult:
    text: str
    confidence: float | None
    warnings: list[str]
    image_path: str | None


def tesseract_available() -> bool:
    configured = Path(settings.tesseract_cmd) if settings.tesseract_cmd else None
    if configured and configured.exists():
        return True
    return shutil.which("tesseract") is not None


def _tesseract_command() -> list[str]:
    configured = Path(settings.tesseract_cmd) if settings.tesseract_cmd else None
    if configured and configured.exists():
        return [str(configured)]
    found = shutil.which("tesseract")
    if found:
        return [found]
    raise FileNotFoundError("Tesseract OCR executable was not found.")


@lru_cache(maxsize=1)
def _resolve_ocr_lang() -> str:
    """
    Detects whether Filipino/Tagalog ('fil' or 'tgl') tessdata is installed alongside
    English ('eng') and enables bilingual OCR automatically when available.
    """
    default_lang = settings.ocr_lang or "eng"
    if "+" in default_lang:
        return default_lang
    try:
        proc = subprocess.run(
            _tesseract_command() + ["--list-langs"],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=10,
        )
        if proc.returncode == 0:
            installed = {
                line.strip().lower()
                for line in (proc.stdout or "").splitlines()
                if line.strip() and not line.lower().startswith("list of")
            }
            if "fil" in installed and "eng" in installed:
                return "eng+fil"
            if "tgl" in installed and "eng" in installed:
                return "eng+tgl"
    except Exception:
        pass
    return default_lang


def render_page(page: fitz.Page, document_id: str, page_number: int) -> tuple[Path, list[str]]:
    import tempfile

    warnings: list[str] = []
    if settings.dispose_page_images:
        tmp = tempfile.NamedTemporaryFile(
            prefix=f"ocr-{document_id[:8]}-p{page_number:04d}-",
            suffix=".png",
            delete=False,
        )
        tmp.close()
        image_path = Path(tmp.name)
    else:
        target_dir = settings.processed_path / document_id / "pages"
        target_dir.mkdir(parents=True, exist_ok=True)
        image_path = target_dir / f"page-{page_number:04d}.png"

    dpi = max(settings.ocr_dpi, 350)
    pix = page.get_pixmap(dpi=dpi, colorspace=fitz.csGRAY, alpha=False)
    pix.save(str(image_path))
    del pix

    try:
        with Image.open(image_path) as img:
            img = ImageOps.autocontrast(img, cutoff=1)
            if img.width > 3400:
                ratio = 3400 / img.width
                img = img.resize((3400, int(img.height * ratio)), Image.Resampling.LANCZOS)
            elif img.width < 1800:
                ratio = 2200 / max(img.width, 1)
                img = img.resize((2200, int(img.height * ratio)), Image.Resampling.LANCZOS)
            img = ImageEnhance.Contrast(img).enhance(1.4)
            img = img.filter(ImageFilter.UnsharpMask(radius=1.8, percent=175, threshold=3))
            img = img.filter(ImageFilter.MedianFilter(size=3))
            img.save(image_path)
        if page.rotation:
            warnings.append(f"Page is rotated {page.rotation} degrees in the source PDF.")
    except Exception as exc:  # pragma: no cover - image preprocessing is best effort
        warnings.append(f"Image preprocessing failed: {exc}")
    return image_path, warnings


def _parse_tsv(output: str) -> tuple[str, float | None]:
    reader = csv.DictReader(io.StringIO(output), delimiter="\t", quoting=csv.QUOTE_NONE)
    lines: dict[tuple[str, str, str, str], list[str]] = {}
    confidences: list[float] = []
    for row in reader:
        text = (row.get("text") or "").strip()
        if not text:
            continue
        key = (
            row.get("page_num", "1"),
            row.get("block_num", "0"),
            row.get("par_num", "0"),
            row.get("line_num", "0"),
        )
        lines.setdefault(key, []).append(text)
        try:
            conf = float(row.get("conf", "-1"))
            if conf >= 0:
                confidences.append(conf)
        except ValueError:
            pass
    blocks: list[str] = []
    current_block: str | None = None
    for key, words in lines.items():
        block = key[1]
        if current_block is not None and block != current_block:
            blocks.append("")
        current_block = block
        blocks.append(" ".join(words))
    raw_text = "\n".join(blocks)
    cleaned_text = clean_and_format_ocr_text(raw_text, reflow_paragraphs=True)
    confidence = round(sum(confidences) / len(confidences) / 100, 3) if confidences else None
    return cleaned_text, confidence


def _run_tesseract_pass(image_path: Path, lang: str, psm: str) -> tuple[str, float | None, str | None]:
    command = _tesseract_command() + [
        str(image_path),
        "stdout",
        "-l",
        lang,
        "--psm",
        psm,
        "--oem",
        "1",
        "-c",
        "preserve_interword_spaces=1",
        "tsv",
    ]
    proc = subprocess.run(
        command,
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=settings.ocr_timeout_seconds,
    )
    if proc.returncode != 0:
        detail = (proc.stderr or "unknown error").strip().splitlines()[-1][:300]
        return "", None, detail
    text, confidence = _parse_tsv(proc.stdout)
    return text, confidence, None


def ocr_page_image(image_path: Path) -> OCRResult:
    if not settings.ocr_enabled:
        return OCRResult("", None, ["OCR is disabled by configuration."], str(image_path))
    try:
        lang = _resolve_ocr_lang()
        text, confidence, err = _run_tesseract_pass(image_path, lang, psm="3")
        if err is not None:
            return OCRResult("", None, [f"OCR failed: {err}"], str(image_path))

        # Multi-PSM fallback: if layout segmentation (PSM 3) produced low confidence or very short text,
        # run uniform block segmentation (PSM 6) and keep the higher-quality extraction.
        if (confidence is not None and confidence < 0.72) or len(text.strip()) < 80:
            alt_text, alt_conf, alt_err = _run_tesseract_pass(image_path, lang, psm="6")
            if alt_err is None and alt_text.strip():
                base_score = (confidence or 0.0) * max(len(text.strip()), 1)
                alt_score = (alt_conf or 0.0) * max(len(alt_text.strip()), 1)
                if alt_score > base_score:
                    text, confidence = alt_text, alt_conf

        warnings: list[str] = []
        if not text.strip():
            warnings.append("OCR produced no text for this page.")
        if confidence is not None and confidence < 0.65:
            warnings.append(f"Low OCR confidence ({confidence:.2f}); manual verification recommended.")
        return OCRResult(text, confidence, warnings, str(image_path))
    except subprocess.TimeoutExpired:
        return OCRResult("", None, ["OCR timed out for this page."], str(image_path))
    except FileNotFoundError as exc:
        return OCRResult("", None, [str(exc)], str(image_path))
    except Exception as exc:  # pragma: no cover - defensive
        logger.exception("Unexpected OCR error")
        return OCRResult("", None, [f"OCR error: {exc}"], str(image_path))
