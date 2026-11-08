from app.ingestion.signatures import extract_signatories, split_signature_block
from app.ingestion.textnorm import normalize_text, raw_quality_warnings, repeated_margin_lines


def test_signature_block_is_split_and_excluded_from_body():
    text = (
        "SECTION 4. Effectivity. This Ordinance takes effect upon approval.\n"
        "RESPECTFULLY YOURS,\n"
        "HON. JUAN DELA CRUZ\n"
        "City Mayor\n"
        "APPROVED:\n"
        "MARIA SANTOS\n"
        "City Vice Mayor"
    )
    body, signature = split_signature_block(text)
    assert body.endswith("upon approval.")
    assert "RESPECTFULLY YOURS" in signature
    assert "JUAN DELA CRUZ" not in body


def test_signatories_are_extracted_with_titles():
    signature = (
        "RESPECTFULLY YOURS,\n"
        "HON. JUAN DELA CRUZ\n"
        "City Mayor\n"
        "APPROVED:\n"
        "MARIA SANTOS\n"
        "City Vice Mayor"
    )
    signatories = extract_signatories(signature, 1)
    assert [(item.name, item.title) for item in signatories] == [
        ("JUAN DELA CRUZ", "City Mayor"),
        ("MARIA SANTOS", "City Vice Mayor"),
    ]
    assert all(item.confidence == 0.9 for item in signatories)
    assert all(item.notes is None for item in signatories)


def test_low_confidence_ocr_signatory_is_flagged():
    signature = "RESPECTFULLY YOURS,\nJUAN DELA CRUZ\nCity Mayor"
    signatories = extract_signatories(signature, 2, ocr_confidence=0.5)
    assert len(signatories) == 1
    assert "Low OCR confidence" in (signatories[0].notes or "")


def test_signature_marker_with_trailing_comma_is_detected():
    body, signature = split_signature_block(
        "SECTION 1. Scope. This applies to everyone.\nRESPECTFULLY YOURS,\nJUAN DELA CRUZ\nCity Mayor"
    )
    assert signature.startswith("RESPECTFULLY YOURS,")
    assert "SECTION 1" in body


def test_normalization_collapses_spacing_and_preserves_line_structure():
    text = "No  business\testablishment shall\noperate after midnight. A ﬁne is imposed."
    normalized = normalize_text(text)
    assert "No business establishment shall" in normalized
    assert "operate after midnight." in normalized
    assert "A fine is imposed." in normalized


def test_repeated_margin_lines_are_removed():
    repeated = repeated_margin_lines(
        [
            ["CITY OF TESTVILLE", "SECTION 1. One.", "Page 1 of 3"],
            ["CITY OF TESTVILLE", "SECTION 2. Two.", "Page 2 of 3"],
            ["CITY OF TESTVILLE", "SECTION 3. Three.", "Page 3 of 3"],
        ]
    )
    assert "city of testville" in repeated
    assert "page 1 of 3" not in repeated


def test_quality_warnings_flag_empty_text():
    warnings = raw_quality_warnings("")
    assert warnings
