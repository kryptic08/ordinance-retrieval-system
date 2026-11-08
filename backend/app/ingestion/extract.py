import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

import fitz

from app.core.config import settings
from app.ingestion.ocr import ocr_page_image, render_page, tesseract_available
from app.ingestion.signatures import SignatoryDraft, extract_signatories, split_signature_block
from app.ingestion.textnorm import (
    normalize_text,
    raw_quality_warnings,
    repeated_margin_lines,
    strip_margin_lines,
)

logger = logging.getLogger(__name__)


@dataclass
class PageExtraction:
    page_number: int
    width: float | None
    height: float | None
    rotation: int
    raw_text: str
    normalized_text: str
    body_text: str
    signature_text: str
    has_text: bool
    is_scanned: bool
    text_source: str
    page_type: str
    ocr_confidence: float | None
    image_path: str | None
    warnings: list[str] = field(default_factory=list)


@dataclass
class ExtractionResult:
    pages: list[PageExtraction]
    signatories: list[SignatoryDraft]
    page_count: int
    ocr_used: bool
    warnings: list[str]
    metadata: dict[str, str | int]


def _render_rel(path: Path) -> str:
    try:
        return path.relative_to(settings.data_dir).as_posix()
    except ValueError:
        return ""


def _extract_metadata(pages: list[PageExtraction], filename: str) -> dict[str, str | int]:
    text = "\n".join(page.normalized_text for page in pages[:5])
    metadata: dict[str, str | int] = {}

    number = re.search(
        r"\b(?:ORDINANCE|RESOLUTION)\s+(?:NO\.?|NUMBER)\s*[:\-]?\s*([0-9]{1,4}[A-Za-z]?(?:\s*[-–]\s*(?:19|20)?\d{2,4})?)",
        text,
        re.IGNORECASE,
    )
    if number:
        metadata["ordinance_number"] = re.sub(r"\s+", "", number.group(1))

    doc_type = "Ordinance"
    if re.search(r"\bRESOLUTION\b", text[:3000], re.IGNORECASE):
        doc_type = "Resolution"
    elif re.search(r"\bEXECUTIVE\s+ORDER\b", text[:3000], re.IGNORECASE):
        doc_type = "Executive Order"
    metadata["document_type"] = doc_type

    title_match = re.search(
        r"\b(AN?\s+(?:ORDINANCE|RESOLUTION|EXECUTIVE\s+ORDER)\b[\s\S]{10,900}?)(?=\n\s*WHEREAS\b|\n\s*SECTION\b|\n\s*SEC\.?\s|\n\s*BE\s+IT\s+ENACTED)",
        text,
        re.IGNORECASE,
    )
    if title_match:
        title = re.sub(r"\s+", " ", title_match.group(1)).strip(" .;:")
        if 15 < len(title) < 900:
            metadata["title"] = title

    date_match = re.search(
        r"\b(?:ENACTED|APPROVED|PASSED|ISSUED|DONE|SIGNED)(?:\s+(?:ON|THIS))?[^A-Za-z0-9]{0,20}"
        r"((?:January|February|March|April|May|June|July|August|September|October|November|December)"
        r"\s+\d{1,2}(?:st|nd|rd|th)?,?\s+(?:19|20)\d{2})",
        text,
        re.IGNORECASE,
    )
    if not date_match:
        date_match = re.search(
            r"\b((?:January|February|March|April|May|June|July|August|September|October|November|December)"
            r"\s+\d{1,2}(?:st|nd|rd|th)?,?\s+(?:19|20)\d{2})\b",
            text,
        )
    if date_match:
        metadata["date_enacted"] = re.sub(r"\s+", " ", date_match.group(1)).strip()
        year = re.search(r"(19|20)\d{2}", date_match.group(1))
        if year:
            metadata["year"] = int(year.group(0))
    else:
        year = re.search(r"(19|20)\d{2}", filename)
        if year:
            metadata["year"] = int(year.group(0))

    jurisdiction = re.search(
        r"(?:CITY|MUNICIPALITY|MUNICIPAL)\s+OF\s+([A-Z][A-Za-z.\-]+(?:\s+[A-Z][A-Za-z.\-]+){0,3})",
        text[:6000],
        re.IGNORECASE,
    )
    if jurisdiction:
        metadata["jurisdiction"] = re.sub(r"\s+", " ", jurisdiction.group(1)).strip().title()
    lgu = re.search(
        r"(?:Sangguniang\s+(?:Bayan|Panlungsod|Lungsod)\s+(?:ng|of)\s+([A-Z][A-Za-z.\-]+(?:\s+[A-Z][A-Za-z.\-]+){0,3}))",
        text[:6000],
        re.IGNORECASE,
    )
    if lgu:
        metadata["lgu"] = re.sub(r"\s+", " ", lgu.group(1)).strip().title()
    return metadata


from contextlib import contextmanager
import io


@contextmanager
def _open_pdf_source(source: bytes | Path):
    """Safely opens a PDF from an in-memory byte stream or filesystem Path with guaranteed cleanup."""
    stream: io.BytesIO | None = None
    pdf: fitz.Document | None = None
    try:
        if isinstance(source, (bytes, bytearray, memoryview)):
            stream = io.BytesIO(bytes(source))
            pdf = fitz.open(stream=stream, filetype="pdf")
        else:
            path = Path(source)
            if not path.exists():
                raise FileNotFoundError(f"Original PDF not found: {path.name}")
            pdf = fitz.open(path)
        yield pdf
    finally:
        if pdf is not None:
            pdf.close()
        if stream is not None:
            stream.close()


def extract_pdf(
    source: bytes | Path,
    document_id: str,
    filename: str = "document.pdf",
) -> ExtractionResult:
    source_name = filename if isinstance(source, (bytes, bytearray, memoryview)) else Path(source).name
    source_stem = Path(source_name).stem

    page_records: list[PageExtraction] = []
    all_warnings: list[str] = []
    ocr_any = False
    ocr_ready = tesseract_available()

    with _open_pdf_source(source) as pdf:
        if pdf.page_count == 0:
            raise ValueError("PDF contains no pages.")
        for index, page in enumerate(pdf):
            page_number = index + 1
            raw = page.get_text("text") or ""
            stripped_chars = len(re.sub(r"\s", "", raw))
            image_count = len(page.get_images(full=True))
            warnings = raw_quality_warnings(raw)
            scanned = stripped_chars < settings.ocr_min_chars
            used_ocr = False
            confidence: float | None = None
            image_path: str | None = None
            text_source = "digital"

            if scanned or (image_count > 0 and stripped_chars < settings.ocr_min_chars * 2):
                if ocr_ready and settings.ocr_enabled:
                    image: Path | None = None
                    try:
                        image, render_warnings = render_page(page, document_id, page_number)
                        warnings.extend(render_warnings)
                        if not settings.dispose_page_images:
                            image_path = _render_rel(image) or None
                        result = ocr_page_image(image)
                        warnings.extend(result.warnings)
                        if result.text.strip():
                            raw = result.text
                            confidence = result.confidence
                            used_ocr = True
                            ocr_any = True
                            text_source = "ocr" if stripped_chars == 0 else "mixed"
                        else:
                            text_source = "digital_empty" if stripped_chars == 0 else "digital"
                    finally:
                        if settings.dispose_page_images and image is not None:
                            image.unlink(missing_ok=True)
                else:
                    warnings.append(
                        "Page appears scanned but OCR is not available. Install Tesseract or enable OCR."
                    )
                    text_source = "unavailable"
                scanned = True
            else:
                scanned = False

            normalized = normalize_text(raw)
            if used_ocr and confidence is not None and confidence < 0.65:
                warnings.append("OCR result has low confidence; review before relying on this page.")
            if not normalized:
                warnings.append("Page has no searchable text after extraction.")

            page_records.append(
                PageExtraction(
                    page_number=page_number,
                    width=float(page.rect.width),
                    height=float(page.rect.height),
                    rotation=int(page.rotation),
                    raw_text=raw,
                    normalized_text=normalized,
                    body_text=normalized,
                    signature_text="",
                    has_text=bool(normalized),
                    is_scanned=scanned,
                    text_source=text_source,
                    page_type="body",
                    ocr_confidence=confidence,
                    image_path=image_path,
                    warnings=sorted(set(warnings)),
                )
            )

    repeated = repeated_margin_lines([page.normalized_text.splitlines() for page in page_records])
    signatories: list[SignatoryDraft] = []
    for page in page_records:
        page.normalized_text = strip_margin_lines(page.normalized_text, repeated)
        body, signature = split_signature_block(page.normalized_text)
        page.body_text = body
        page.signature_text = signature
        if signature:
            page.page_type = "signature"
            page.warnings.append(
                "Signature/approval block detected. It is preserved but excluded from semantic indexing."
            )
            signatories.extend(extract_signatories(signature, page.page_number, page.ocr_confidence))
        elif page.page_type == "body" and not page.normalized_text:
            page.page_type = "empty"

    if repeated:
        all_warnings.append(f"Removed {len(repeated)} repeated header/footer line(s) from the searchable text.")
    if any(page.is_scanned for page in page_records) and not ocr_any:
        all_warnings.append("One or more scanned pages could not be OCR-processed.")

    first_page = page_records[0].normalized_text if page_records else ""
    metadata = _extract_metadata(page_records, source_name)
    if first_page:
        metadata.setdefault("title", source_stem.replace("_", " ").strip())

    signatory_warnings = sum(1 for s in signatories if s.notes)
    if signatory_warnings:
        all_warnings.append(f"{signatory_warnings} extracted signator(ies) require manual verification.")

    return ExtractionResult(
        pages=page_records,
        signatories=signatories,
        page_count=len(page_records),
        ocr_used=ocr_any,
        warnings=all_warnings,
        metadata=metadata,
    )
