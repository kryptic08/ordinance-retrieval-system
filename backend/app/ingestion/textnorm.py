import re

from app.ingestion.ocr_helper import MULTI_NEWLINE_RE, clean_and_format_ocr_text


def normalize_text(text: str) -> str:
    if not text:
        return ""
    return clean_and_format_ocr_text(text, reflow_paragraphs=True)


def raw_quality_warnings(text: str) -> list[str]:
    warnings: list[str] = []
    stripped = text.strip()
    if not stripped:
        warnings.append("No extractable text found on this page.")
        return warnings
    alnum = sum(ch.isalnum() for ch in stripped)
    ratio = alnum / max(len(stripped), 1)
    if len(stripped) > 80 and ratio < 0.45:
        warnings.append("Unusually low alphanumeric ratio; text may be garbled.")
    replacement = stripped.count("\ufffd")
    if replacement > 3:
        warnings.append("Replacement characters detected; check OCR quality.")
    if re.search(r"(.)\1{7,}", stripped):
        warnings.append("Repeated character runs detected; check OCR quality.")
    return warnings


def repeated_margin_lines(pages: list[list[str]], min_pages: int = 3) -> set[str]:
    counts: dict[str, int] = {}
    for lines in pages:
        candidates = {
            line.strip().lower()
            for line in (lines[:3] + lines[-3:])
            if 3 < len(line.strip()) < 100
        }
        for line in candidates:
            counts[line] = counts.get(line, 0) + 1
    threshold = max(min_pages, int(len(pages) * 0.6))
    return {
        line
        for line, count in counts.items()
        if count >= threshold
        and not re.search(
            r"\b(section|sec\.?|seksiyon|seksyon|article|artikulo|ordinance no|resolution no|kautusan)\b",
            line,
        )
    }


def strip_margin_lines(text: str, repeated: set[str]) -> str:
    if not repeated:
        return text
    lines = text.split("\n")
    kept = [line for line in lines if line.strip().lower() not in repeated]
    return MULTI_NEWLINE_RE.sub("\n\n", "\n".join(kept)).strip()
