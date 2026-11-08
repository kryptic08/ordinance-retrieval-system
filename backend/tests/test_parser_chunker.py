from app.chunking.chunker import build_chunks
from app.chunking.parser import parse_sections


def test_sections_are_parsed_with_page_numbers():
    pages = [
        (
            1,
            "REPUBLIC OF THE PHILIPPINES\nCITY OF TESTVILLE\n"
            "ORDINANCE NO. 2024-09\nAN ORDINANCE REGULATING BUSINESS HOURS\n"
            "WHEREAS, public order requires regulation;\n"
            "BE IT ENACTED by the Sangguniang Panlungsod:",
            "body",
        ),
        (
            2,
            "SECTION 1. Definition of Terms. Business establishment refers to a commercial enterprise.\n"
            "SECTION 2. Curfew. No business establishment shall operate after midnight.",
            "body",
        ),
        (
            3,
            "SECTION 3. Penalties. A fine of Five Thousand Pesos shall be imposed.",
            "body",
        ),
    ]
    drafts = parse_sections(pages)
    numbers = [draft.section_number for draft in drafts if draft.section_type == "section"]
    assert numbers == ["1", "2", "3"]
    section_two = next(draft for draft in drafts if draft.section_number == "2")
    assert section_two.page_start == 2
    assert section_two.page_end == 2
    assert section_two.heading.startswith("Curfew")
    assert "after midnight" in section_two.text
    assert all(row.section_type for row in drafts)


def test_unstructured_document_does_not_invent_section_numbers():
    pages = [(1, "A general policy statement without any numbered provision.", "body")]
    drafts = parse_sections(pages)
    assert len(drafts) == 1
    assert drafts[0].section_type == "unstructured"
    assert drafts[0].section_number is None
    assert drafts[0].heading == "Unstructured content — page 1"


def test_empty_signature_page_is_ignored():
    pages = [
        (1, "SECTION 1. Scope. This Ordinance applies to all businesses.", "body"),
        (2, "", "signature"),
    ]
    drafts = parse_sections(pages)
    assert [draft.section_number for draft in drafts] == ["1"]


def test_chunks_keep_page_ranges_and_overlap():
    pages = [
        (
            4,
            "SECTION 5. Long Provision. " + " ".join(["Business permits must be renewed annually."] * 40),
            "body",
        )
    ]
    draft = parse_sections(pages)[0]
    chunks = build_chunks(
        draft,
        document_title="Test Ordinance",
        parent_heading=None,
        max_chars=400,
        overlap=80,
        min_chars=20,
    )
    assert len(chunks) > 1
    assert all(chunk.page_start == 4 and chunk.page_end == 4 for chunk in chunks)
    assert all(len(chunk.text) <= 450 for chunk in chunks)
    assert chunks[0].chunk_key == "sec-5-c0"
    assert chunks[1].chunk_key == "sec-5-c1"
    assert "Test Ordinance" in chunks[0].embedding_text


def test_articles_and_chapters_become_parent_context():
    pages = [
        (
            1,
            "CHAPTER I. GENERAL PROVISIONS\n"
            "ARTICLE 1. DEFINITIONS\n"
            "SECTION 1. Terms. Words used here have their ordinary meaning.",
            "body",
        )
    ]
    drafts = parse_sections(pages)
    chapter = next(draft for draft in drafts if draft.section_type == "chapter")
    article = next(draft for draft in drafts if draft.section_type == "article")
    section = next(draft for draft in drafts if draft.section_type == "section")
    assert article.parent_key == chapter.stable_key
    assert section.parent_key == article.stable_key
