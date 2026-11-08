import re
from dataclasses import dataclass, field

SECTION_RE = re.compile(
    r"^\s*(?:SECTION|SEC\.?|SEKSIYON|SEKSYON|SEK\.?)\s*(\d+[A-Za-z]?(?:\s*[-.]\s*\d+[A-Za-z]?)?)\s*[.:\-–—]?\s*(.*)$",
    re.IGNORECASE,
)
ARTICLE_RE = re.compile(
    r"^\s*(?:ARTICLE|ARTIKULO)\s+([IVXLCDM]+|\d+)\b[.:\-–—]?\s*(.*)$",
    re.IGNORECASE,
)
CHAPTER_RE = re.compile(
    r"^\s*(?:CHAPTER|KABANATA)\s+([IVXLCDM]+|\d+)\b[.:\-–—]?\s*(.*)$",
    re.IGNORECASE,
)
WHEREAS_RE = re.compile(r"^\s*(?:WHEREAS|SAPAGKAT|SAMANTALA)\b", re.IGNORECASE)
ENACT_RE = re.compile(
    r"^\s*(BE\s+IT\s+(?:ENACTED|ORDAINED)|NOW,?\s+THEREFORE|RESOLVED(?:\s+BY\s+THE\s+SANGGUNIANG\w*)?|DAHIL\s+DITO|IPINAG-UUTOS)\b",
    re.IGNORECASE,
)
SUBSECTION_RE = re.compile(r"^\s*(\(?[a-zA-Z0-9]{1,3}\)|\d+\.)\s+")

SKIP_HEADING_RE = re.compile(
    r"^\s*(REPUBLIC\s+OF\s+THE\s+PHILIPPINES|REPUBLIKA\s+NG\s+PILIPINAS|PROVINCE\s+OF|LALAWIGAN\s+NG|CITY\s+OF|LUNGSOD\s+NG|MUNICIPALITY\s+OF|BAYAN\s+NG|"
    r"OFFICE\s+OF\s+THE|TANGGAPAN\s+NG|SANGGUNIANG\s+(BAYAN|PANLUNGSOD|LUNGSOD|PANLALAWIGAN))",
    re.IGNORECASE,
)


@dataclass
class SectionDraft:
    stable_key: str
    section_number: str | None
    heading: str | None
    section_type: str
    level: int
    parent_key: str | None
    lines: list[tuple[int, str]] = field(default_factory=list)

    def add(self, page: int, line: str) -> None:
        self.lines.append((page, line))

    @property
    def text(self) -> str:
        return "\n".join(line for _page, line in self.lines).strip()

    @property
    def page_start(self) -> int:
        return min((page for page, _line in self.lines), default=1)

    @property
    def page_end(self) -> int:
        return max((page for page, _line in self.lines), default=1)

    def paragraphs(self) -> list[tuple[int, str]]:
        result: list[tuple[int, str]] = []
        buffer: list[str] = []
        buffer_page: int | None = None
        for page, line in self.lines + [(self.page_end, "")]:
            if not line.strip():
                if buffer:
                    result.append((buffer_page or page, " ".join(buffer).strip()))
                    buffer = []
                    buffer_page = None
                continue
            if buffer_page is not None and page != buffer_page:
                result.append((buffer_page, " ".join(buffer).strip()))
                buffer = []
            if buffer_page is None:
                buffer_page = page
            buffer.append(line.strip())
        return [(page, text) for page, text in result if text]


def _slug(value: str) -> str:
    value = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return value or "section"


class _KeyRegistry:
    def __init__(self) -> None:
        self.counts: dict[str, int] = {}

    def make(self, base: str) -> str:
        self.counts[base] = self.counts.get(base, 0) + 1
        count = self.counts[base]
        return base if count == 1 else f"{base}-{count}"


def parse_sections(page_texts: list[tuple[int, str, str]]) -> list[SectionDraft]:
    """Parse legal sections.

    page_texts is a list of (page_number, body_text, page_type).
    Returns ordered SectionDraft objects without inventing section numbers.
    """
    keys = _KeyRegistry()
    drafts: list[SectionDraft] = []
    current: SectionDraft | None = None
    chapter_key: str | None = None
    article_key: str | None = None
    saw_structured = False

    def start(
        base_key: str,
        number: str | None,
        heading: str | None,
        section_type: str,
        level: int,
        parent_key: str | None = None,
    ) -> SectionDraft:
        draft = SectionDraft(
            stable_key=keys.make(base_key),
            section_number=number,
            heading=heading,
            section_type=section_type,
            level=level,
            parent_key=parent_key,
        )
        drafts.append(draft)
        return draft

    for page_number, body_text, page_type in page_texts:
        if page_type == "empty" or not body_text.strip():
            continue
        for raw_line in body_text.splitlines():
            line = raw_line.rstrip()
            stripped = line.strip()
            if not stripped:
                if current:
                    current.add(page_number, "")
                continue

            chapter_match = CHAPTER_RE.match(stripped)
            if chapter_match:
                saw_structured = True
                number, rest = chapter_match.group(1), chapter_match.group(2).strip(" .:-")
                heading = f"Chapter {number}" + (f" — {rest}" if rest else "")
                current = start(f"chapter-{_slug(number)}", number, heading, "chapter", 1)
                current.add(page_number, stripped)
                chapter_key = current.stable_key
                article_key = None
                continue

            article_match = ARTICLE_RE.match(stripped)
            if article_match:
                saw_structured = True
                number, rest = article_match.group(1), article_match.group(2).strip(" .:-")
                heading = f"Article {number}" + (f" — {rest}" if rest else "")
                current = start(
                    f"article-{_slug(number)}", number, heading, "article", 2, chapter_key
                )
                current.add(page_number, stripped)
                article_key = current.stable_key
                continue

            section_match = SECTION_RE.match(stripped)
            if section_match:
                saw_structured = True
                number = re.sub(r"\s+", "", section_match.group(1))
                rest = section_match.group(2).strip(" .:-")
                heading = rest[:300] if rest else None
                current = start(
                    f"sec-{_slug(number)}",
                    number,
                    heading,
                    "section",
                    3,
                    article_key or chapter_key,
                )
                current.add(page_number, stripped)
                continue

            if WHEREAS_RE.match(stripped):
                saw_structured = True
                if current and current.section_type == "whereas":
                    current.add(page_number, stripped)
                else:
                    current = start("whereas", None, "WHEREAS clauses", "whereas", 2)
                    current.add(page_number, stripped)
                continue

            if ENACT_RE.match(stripped):
                saw_structured = True
                current = start("enactment-clause", None, "Enactment / Resolution clause", "enactment", 2)
                current.add(page_number, stripped)
                continue

            if current is None:
                if SKIP_HEADING_RE.match(stripped):
                    continue
                current = start("preamble", None, "Preamble / title", "preamble", 1)
                current.add(page_number, stripped)
            else:
                current.add(page_number, stripped)

    if not saw_structured:
        drafts = []
        keys = _KeyRegistry()
        for page_number, body_text, page_type in page_texts:
            if page_type == "empty" or not body_text.strip():
                continue
            draft = SectionDraft(
                stable_key=keys.make(f"unstructured-p{page_number}"),
                section_number=None,
                heading=f"Unstructured content — page {page_number}",
                section_type="unstructured",
                level=1,
                parent_key=None,
            )
            for line in body_text.splitlines():
                draft.add(page_number, line)
            drafts.append(draft)

    return [draft for draft in drafts if draft.text.strip()]


def detect_subsection(text: str) -> str | None:
    match = SUBSECTION_RE.match(text.strip())
    return match.group(1).strip("().") if match else None
