import re
from dataclasses import dataclass

SIGNATURE_MARKERS = re.compile(
    r"^\s*(RESPECTFULLY\s+YOURS|IN\s+WITNESS\s+WHEREOF|APPROVED\s*:?|CERTIFIED\s+CORRECT\s*:?|"
    r"ATTESTED\s+BY\s*:?|SIGNED\s+IN\s+THE\s+PRESENCE|CONCURRED\s+BY\s*:?|"
    r"PASSED\s+AND\s+APPROVED|ENACTED\s*:?)[.,:]?\s*$",
    re.IGNORECASE | re.MULTILINE,
)

TITLE_PATTERN = re.compile(
    r"\b(City\s+Mayor|Municipal\s+Mayor|Provincial\s+Governor|Vice\s+Mayor|City\s+Vice\s+Mayor|"
    r"Municipal\s+Vice\s+Mayor|Sangguniang\s+Bayan\s+Member|Sangguniang\s+Panlungsod\s+Member|"
    r"Councilor|City\s+Councilor|SB\s+Member|SK\s+Chairperson|Punong\s+Barangay|"
    r"Barangay\s+Captain|City\s+Secretary|Municipal\s+Secretary|"
    r"Secretary\s+to\s+the\s+Sangguniang|Secretary|Treasurer|Chairperson|Member)\b",
    re.IGNORECASE,
)

ROLE_MAP = {
    "city mayor": "Mayor",
    "municipal mayor": "Mayor",
    "provincial governor": "Governor",
    "vice mayor": "Vice Mayor",
    "city vice mayor": "Vice Mayor",
    "municipal vice mayor": "Vice Mayor",
    "councilor": "Councilor",
    "city councilor": "Councilor",
    "sb member": "Sangguniang Member",
    "sangguniang bayan member": "Sangguniang Member",
    "sangguniang panlungsod member": "Sangguniang Member",
    "sk chairperson": "SK Chairperson",
    "punong barangay": "Barangay Captain",
    "barangay captain": "Barangay Captain",
    "city secretary": "Secretary",
    "municipal secretary": "Secretary",
    "secretary to the sangguniang": "Secretary",
    "secretary": "Secretary",
    "treasurer": "Treasurer",
    "chairperson": "Chairperson",
    "member": "Member",
}

NAME_LIKE = re.compile(r"^[A-Z][A-Z.\-' ]{3,80}$")


@dataclass
class SignatoryDraft:
    name: str | None
    title: str | None
    role: str | None
    page_number: int
    confidence: float | None
    notes: str | None = None
    method: str = "heuristic"


def split_signature_block(text: str) -> tuple[str, str]:
    if not text:
        return "", ""
    candidate = None
    for match in SIGNATURE_MARKERS.finditer(text):
        tail = text[match.end() :]
        if len(tail.strip()) >= 10 or match.start() > len(text) * 0.35:
            candidate = match
            break
    if not candidate:
        return text, ""
    return text[: candidate.start()].strip(), text[candidate.start() :].strip()


def _clean_name(value: str) -> str | None:
    value = value.strip(" .,:;-\t")
    value = re.sub(r"^(HON\.?|HONORABLE|MR\.?|MS\.?|MRS\.?)\s+", "", value, flags=re.IGNORECASE)
    value = re.sub(r"\s{2,}", " ", value).strip()
    if not value:
        return None
    letters = [ch for ch in value if ch.isalpha()]
    if len(letters) < 4:
        return None
    if len(value.split()) < 2:
        return None
    if len(value) > 80:
        return None
    return value


def extract_signatories(signature_text: str, page_number: int, ocr_confidence: float | None = None) -> list[SignatoryDraft]:
    if not signature_text:
        return []
    lines = [line.strip() for line in signature_text.splitlines() if line.strip()]
    drafts: list[SignatoryDraft] = []
    seen: set[tuple[str, str]] = set()

    for index, line in enumerate(lines):
        title_match = TITLE_PATTERN.search(line)
        if not title_match:
            continue
        title = re.sub(r"\s{2,}", " ", title_match.group(1)).strip().title()
        before = line[: title_match.start()].strip(" ,:;-")
        name = _clean_name(before)
        if not name and index > 0:
            previous = lines[index - 1]
            if NAME_LIKE.match(previous.strip(" ,:;-")) and not TITLE_PATTERN.search(previous):
                name = _clean_name(previous)
        if not name:
            continue
        key = (name.lower(), title.lower())
        if key in seen:
            continue
        seen.add(key)
        role = ROLE_MAP.get(title.lower(), title)
        notes = None
        confidence = ocr_confidence
        if confidence is None:
            confidence = 0.9
        if confidence < 0.65:
            notes = "Low OCR confidence; verify the name against the original page."
        drafts.append(
            SignatoryDraft(
                name=name,
                title=title,
                role=role,
                page_number=page_number,
                confidence=confidence,
                notes=notes,
            )
        )
    return drafts
