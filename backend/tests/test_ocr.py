import uuid

import fitz
import pytest

from app.core.config import settings
from app.ingestion.extract import extract_pdf
from app.ingestion.ocr import tesseract_available
from conftest import digital_pdf, write_pdf

pytestmark = pytest.mark.skipif(
    not tesseract_available(), reason="Tesseract OCR is not available on this machine"
)


def test_scanned_pdf_uses_ocr_and_extracts_metadata(tmp_path):
    source = digital_pdf(tmp_path / "source.pdf", ordinance_number="2024-40")
    with fitz.open(source) as opened:
        scanned = tmp_path / "scanned.pdf"
        pages = fitz.open()
        for page_number in range(1, opened.page_count + 1):
            pixmap = opened[page_number - 1].get_pixmap(dpi=220)
            page = pages.new_page(width=opened[page_number - 1].rect.width, height=opened[page_number - 1].rect.height)
            page.insert_image(page.rect, pixmap=pixmap)
        pages.save(scanned)
        pages.close()

    result = extract_pdf(scanned, uuid.uuid4().hex)
    assert result.page_count == 3
    assert result.ocr_used is True
    assert all(page.is_scanned for page in result.pages)
    assert all(page.text_source == "ocr" for page in result.pages)
    combined = " ".join(page.normalized_text for page in result.pages).upper()
    assert "ORDINANCE" in combined
    assert "MIDNIGHT" in combined
    assert any(page.ocr_confidence is not None for page in result.pages)


def test_mixed_pdf_keeps_digital_and_scanned_sources(tmp_path):
    original = digital_pdf(tmp_path / "mixed-source.pdf", ordinance_number="2024-41")
    mixed = tmp_path / "mixed.pdf"
    with fitz.open(original) as source:
        pages = fitz.open()
        digital = pages.new_page(width=source[0].rect.width, height=source[0].rect.height)
        digital.insert_text((54, 72), "ORDINANCE NO. 2024-41", fontsize=12)
        digital.insert_text((54, 92), "SECTION 1. Digital page about business permits.", fontsize=10)
        pixmap = source[1].get_pixmap(dpi=220)
        image_page = pages.new_page(width=source[1].rect.width, height=source[1].rect.height)
        image_page.insert_image(image_page.rect, pixmap=pixmap)
        pages.save(mixed)
        pages.close()

    result = extract_pdf(mixed, uuid.uuid4().hex)
    assert result.page_count == 2
    assert result.pages[0].is_scanned is False
    assert result.pages[0].text_source == "digital"
    assert result.pages[1].is_scanned is True
    assert result.pages[1].text_source == "ocr"


def test_signature_page_is_not_indexed_as_body(tmp_path):
    path = write_pdf(
        tmp_path / "signature.pdf",
        [
            [
                "ORDINANCE NO. 2024-42",
                "AN ORDINANCE ESTABLISHING A TEST RULE FOR BUSINESS PERMITS AND FEES",
                "SECTION 1. Scope. This Ordinance covers all business permits.",
            ],
            [
                "RESPECTFULLY YOURS,",
                "HON. ANA REYES",
                "City Mayor",
            ],
        ],
    )
    result = extract_pdf(path, uuid.uuid4().hex)
    body = " ".join(page.body_text for page in result.pages)
    assert "ANA REYES" not in body
    assert any("ANA REYES" in page.signature_text for page in result.pages)
    assert any(signatory.name == "ANA REYES" for signatory in result.signatories)
    assert settings.ocr_enabled is True
