from dataclasses import dataclass

from app.chunking.parser import SectionDraft, detect_subsection


@dataclass
class ChunkDraft:
    chunk_key: str
    chunk_index: int
    text: str
    embedding_text: str
    page_start: int
    page_end: int
    subsection: str | None


def _window(paragraphs: list[tuple[int, str]], max_chars: int, overlap: int) -> list[tuple[int, int, str]]:
    windows: list[tuple[int, int, str]] = []
    current = ""
    start_page: int | None = None
    end_page: int | None = None

    def flush() -> None:
        nonlocal current, start_page, end_page
        if current.strip() and start_page is not None:
            windows.append((start_page, end_page or start_page, current.strip()))
        current = ""
        start_page = None
        end_page = None

    for page, paragraph in paragraphs:
        pieces: list[tuple[int, str]] = []
        remaining = paragraph
        while len(remaining) > max_chars:
            cut = remaining.rfind(" ", 0, max_chars)
            if cut < max_chars // 2:
                cut = max_chars
            pieces.append((page, remaining[:cut].strip()))
            remaining = remaining[cut:].strip()
        if remaining:
            pieces.append((page, remaining))

        for piece_page, piece in pieces:
            addition = piece if not current else f"{current}\n\n{piece}"
            if len(addition) > max_chars and current.strip():
                flush()
                carry = current[-overlap:].strip() if overlap and current else ""
                current = f"{carry}\n\n{piece}".strip() if carry else piece
                start_page = piece_page
                end_page = piece_page
            else:
                if start_page is None:
                    start_page = piece_page
                current = addition
                end_page = piece_page
    flush()
    return windows


def build_chunks(
    draft: SectionDraft,
    document_title: str,
    parent_heading: str | None,
    max_chars: int,
    overlap: int,
    min_chars: int,
    *,
    ordinance_number: str | None = None,
    document_type: str | None = "Ordinance",
    year: int | None = None,
    jurisdiction: str | None = None,
) -> list[ChunkDraft]:
    paragraphs = draft.paragraphs()
    if not paragraphs:
        return []
    heading = (draft.heading or "").strip()
    number = (draft.section_number or "").strip()
    doc_type = (document_type or "Ordinance").strip()

    if ordinance_number:
        doc_ref = f"{doc_type} {ordinance_number}"
    else:
        doc_ref = doc_type
    if year:
        doc_ref = f"{doc_ref} ({year})"

    if number and heading and heading.lower() != f"section {number}".lower():
        section_header = f"Section {number}: {heading}"
    elif number:
        section_header = f"Section {number}"
    elif heading:
        section_header = heading
    else:
        section_header = "Unstructured Provision"

    context_parts: list[str] = []
    if ordinance_number or year:
        context_parts.append(doc_ref)
    if jurisdiction:
        context_parts.append(jurisdiction.strip())
    if document_title:
        context_parts.append(document_title.strip())
    if parent_heading:
        context_parts.append(parent_heading.strip())
    context_parts.append(section_header)

    context_tag = "[" + " | ".join(part for part in context_parts if part) + "]"

    chunks: list[ChunkDraft] = []
    for index, (start_page, end_page, text) in enumerate(_window(paragraphs, max_chars, overlap)):
        display = text.strip()
        if not display:
            continue
        subsection = detect_subsection(display)
        sub_label = f" (Subsection {subsection})" if subsection else ""
        embedding_text = f"{context_tag}{sub_label}\n\n{display}"
        if len(display) < min_chars:
            embedding_text = f"{context_tag}{sub_label}\n\n{display}\n\nContext: {section_header}"
        chunks.append(
            ChunkDraft(
                chunk_key=f"{draft.stable_key}-c{index}",
                chunk_index=index,
                text=display,
                embedding_text=embedding_text,
                page_start=start_page,
                page_end=end_page,
                subsection=subsection,
            )
        )
    return chunks
