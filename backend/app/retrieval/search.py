import math
import re
import time
from dataclasses import dataclass

import numpy as np
from sqlalchemy import text
from sqlalchemy.orm import Session, defer

from app.core.config import settings
from app.db.models import Chunk, Document, SearchEvent
from app.ingestion.ocr_helper import clean_and_format_ocr_text
from app.schemas.search import (
    AnswerBlock,
    AnswerClaim,
    SearchFilters,
    SearchRequest,
    SearchResponse,
    SearchResult,
)
from app.services.documents import summary
from app.services.runtime_settings import retrieval_config

STOPWORDS = {
    # English function & question words
    "a",
    "an",
    "the",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "to",
    "of",
    "for",
    "in",
    "on",
    "at",
    "by",
    "with",
    "from",
    "into",
    "onto",
    "and",
    "or",
    "what",
    "which",
    "who",
    "whom",
    "whose",
    "where",
    "when",
    "why",
    "how",
    "much",
    "many",
    "does",
    "do",
    "did",
    "can",
    "could",
    "would",
    "should",
    "will",
    "shall",
    "has",
    "have",
    "had",
    "may",
    "might",
    "there",
    "this",
    "that",
    "these",
    "those",
    "i",
    "we",
    "you",
    "he",
    "she",
    "they",
    "them",
    "it",
    "its",
    "me",
    "my",
    "our",
    "your",
    "their",
    "under",
    "about",
    "after",
    "before",
    "during",
    "between",
    "without",
    "within",
    "any",
    "all",
    "some",
    "such",
    "no",
    "nor",
    "not",
    "if",
    "then",
    "than",
    "also",
    "very",
    "just",
    "only",
    "detail",
    "details",
    "information",
    "info",
    "explain",
    "describe",
    "tell",
    "please",
    "show",
    "give",
    "discuss",
    "discusses",
    "mention",
    "mentions",
    "say",
    "says",
    "regarding",
    "concerning",
    "according",
    # Filipino / Tagalog function & question words
    "ang",
    "mga",
    "sa",
    "ng",
    "na",
    "ay",
    "at",
    "o",
    "ba",
    "po",
    "ho",
    "ko",
    "mo",
    "niya",
    "namin",
    "natin",
    "nila",
    "aking",
    "iyong",
    "kanyang",
    "ito",
    "iyan",
    "iyon",
    "dito",
    "diyan",
    "doon",
    "ano",
    "anu",
    "sino",
    "saan",
    "kailan",
    "bakit",
    "paano",
    "gaano",
    "magkano",
    "ilan",
    "alin",
    "pwede",
    "puwede",
    "maaari",
    "maari",
    "dapat",
    "kailangan",
    "may",
    "mayroon",
    "meron",
    "wala",
    "walang",
    "hindi",
    "huwag",
    "para",
    "tungkol",
    "ukol",
    "kapag",
    "kung",
    "upang",
    "dahil",
    "mula",
    "hanggang",
}

# Words that appear across almost every ordinance and therefore have low topic selectivity on their own
GENERIC_LEGAL_TERMS = {
    "ordinance",
    "ordinances",
    "resolution",
    "resolutions",
    "section",
    "sections",
    "article",
    "articles",
    "chapter",
    "title",
    "provision",
    "provisions",
    "policy",
    "policies",
    "regulate",
    "regulates",
    "regulating",
    "regulation",
    "regulations",
    "rule",
    "rules",
    "law",
    "laws",
    "code",
    "act",
    "series",
    "city",
    "municipal",
    "municipality",
    "barangay",
    "province",
    "local",
    "government",
    "public",
    "private",
    "general",
    "area",
    "areas",
    "place",
    "places",
    "allowed",
    "prohibited",
    "legal",
    "illegal",
    "unlawful",
    "kautusan",
    "kautusang",
    "kapasiyahan",
    "seksiyon",
    "artikulo",
    "lungsod",
    "munisipalidad",
    "pamahalaan",
    "lokal",
    "pampubliko",
    "bawal",
    "ipinagbabawal",
    "alituntunin",
    "batas",
}

# Domain synonym expansion (English + Filipino/Tagalog) mapping citizen phrasing to statutory terms
CIVIC_SYNONYMS: dict[str, list[str]] = {
    "dog": ["dogs", "animal", "animals", "pet", "pets", "canine", "stray", "astray", "rabies", "leash", "impound", "aso", "hayop"],
    "dogs": ["dog", "animal", "animals", "pet", "pets", "canine", "stray", "astray", "rabies", "leash", "aso"],
    "pet": ["pets", "dog", "dogs", "animal", "animals", "leash", "rabies", "alagang", "hayop", "aso"],
    "leash": ["leashed", "unleashed", "stray", "astray", "dog", "animal", "tether", "restraint"],
    "curfew": ["minors", "minor", "children", "youth", "juvenile", "hours", "night", "kabataan", "menor"],
    "minor": ["minors", "curfew", "child", "children", "youth", "juvenile", "parent", "guardian", "kabataan", "menor"],
    "minors": ["minor", "curfew", "child", "children", "youth", "juvenile", "parent", "guardian", "kabataan", "menor"],
    "waste": ["garbage", "trash", "solid", "litter", "littering", "dump", "dumping", "segregation", "disposal", "sanitation", "basura", "kalinisan"],
    "garbage": ["waste", "trash", "solid", "litter", "littering", "dump", "dumping", "segregation", "disposal", "basura"],
    "trash": ["waste", "garbage", "solid", "litter", "littering", "dump", "dumping", "disposal", "basura"],
    "littering": ["litter", "waste", "garbage", "trash", "dump", "dumping", "sanitation", "cleanliness", "basura", "kalinisan"],
    "dumping": ["dump", "waste", "garbage", "trash", "litter", "littering", "disposal", "basura"],
    "basura": ["waste", "garbage", "trash", "litter", "littering", "dumping", "segregation", "kalinisan"],
    "videoke": ["karaoke", "noise", "sound", "loud", "nuisance", "amplified", "singing", "decibel", "ingay", "katahimikan"],
    "karaoke": ["videoke", "noise", "sound", "loud", "nuisance", "amplified", "ingay", "katahimikan"],
    "noise": ["videoke", "karaoke", "sound", "loud", "nuisance", "decibel", "amplified", "quiet", "peace", "ingay", "katahimikan"],
    "ingay": ["noise", "videoke", "karaoke", "sound", "loud", "nuisance", "katahimikan"],
    "business": ["commercial", "establishment", "permit", "license", "mayor", "trade", "enterprise", "renewal", "fee", "negosyo", "tindahan"],
    "permit": ["permits", "license", "clearance", "registration", "business", "mayor", "fee", "renewal", "permiso", "lisensya"],
    "smoking": ["smoke", "tobacco", "cigarette", "cigarettes", "vape", "vaping", "nicotine", "sigarilyo", "paninigarilyo"],
    "vape": ["vaping", "smoking", "smoke", "tobacco", "cigarette", "electronic"],
    "liquor": ["alcohol", "alcoholic", "intoxicating", "drinking", "beer", "wine", "bar", "alak", "inumin"],
    "alcohol": ["liquor", "alcoholic", "intoxicating", "drinking", "alak"],
    "parking": ["park", "parked", "vehicle", "vehicles", "obstruction", "traffic", "towing", "sidewalk", "street", "sasakyan"],
    "tricycle": ["tricycles", "motorized", "pedicab", "fare", "franchise", "toda", "driver", "traffic", "sasakyan"],
    "penalty": ["penalties", "fine", "fines", "imprisonment", "sanction", "punished", "violation", "offense", "multa", "parusa", "pagkakakulong"],
    "penalties": ["penalty", "fine", "fines", "imprisonment", "sanction", "punished", "violation", "offense", "multa", "parusa"],
    "fine": ["fines", "penalty", "penalties", "peso", "pesos", "php", "imprisonment", "violation", "multa", "parusa"],
    "multa": ["fine", "fines", "penalty", "penalties", "peso", "php", "parusa", "paglabag"],
}

TOKEN_RE = re.compile(r"[A-Za-z0-9Ññ]+")
BRACKET_HEADER_RE = re.compile(r"^\s*\[[^\]]+\]\s*")


def _unpack_query(raw_query: str) -> tuple[str, str]:
    """
    Separates any conversational history wrapper from the user's current question.
    Returns `(primary_query, fallback_context_query)`.
    """
    cleaned = raw_query.strip()
    if "Current question:" in cleaned:
        parts = cleaned.split("Current question:", 1)
        current = parts[1].strip()
        earlier = ""
        user_match = re.search(r"User asked:\s*(.+?)(?:\n|$)", parts[0])
        if user_match:
            earlier = user_match.group(1).strip()
        return current, earlier
    return cleaned, ""


def _stem(word: str) -> str:
    """Lightweight morphological normalizer for legal English and Filipino query tokens."""
    w = word.lower()
    if len(w) <= 3:
        return w
    if w.endswith("ies") and len(w) > 4:
        return w[:-3] + "y"
    if w.endswith("ing") and len(w) > 5:
        base = w[:-3]
        if len(base) >= 3 and base[-1] == base[-2] and base[-1] not in "aeiou":
            base = base[:-1]
        return base
    if w.endswith("tions") and len(w) > 6:
        return w[:-1]
    if w.endswith("es") and len(w) > 4 and not w.endswith(("aes", "ees", "oes")):
        if w.endswith(("ches", "shes", "xes", "zes", "sses")):
            return w[:-2]
        return w[:-1]
    if w.endswith("s") and not w.endswith(("ss", "us", "is")) and len(w) > 3:
        return w[:-1]
    return w


def query_terms(query: str) -> list[str]:
    primary, _ = _unpack_query(query)
    return [token.lower() for token in TOKEN_RE.findall(primary)]


def content_terms(query: str) -> list[str]:
    primary, earlier = _unpack_query(query)
    terms = [term for term in TOKEN_RE.findall(primary.lower()) if term not in STOPWORDS]
    # If the current query is a follow-up with only generic terms (e.g., "What is the fine for that?"),
    # pull the core topic terms from the previous user question.
    core = [t for t in terms if t not in GENERIC_LEGAL_TERMS and _stem(t) not in GENERIC_LEGAL_TERMS]
    if not core and earlier:
        earlier_core = [
            t
            for t in TOKEN_RE.findall(earlier.lower())
            if t not in STOPWORDS and t not in GENERIC_LEGAL_TERMS and _stem(t) not in GENERIC_LEGAL_TERMS
        ]
        terms = earlier_core + terms
    return list(dict.fromkeys(terms))


def topic_terms(query: str) -> list[str]:
    """
    Returns the high-selectivity subject terms of a query (excluding generic legal framing words
    like 'ordinance', 'city', 'penalty', 'fine', 'section', 'rules').
    Falls back to all `content_terms` if the query consists solely of generic legal words.
    """
    all_content = content_terms(query)
    specific = [
        t
        for t in all_content
        if t not in GENERIC_LEGAL_TERMS and _stem(t) not in GENERIC_LEGAL_TERMS
    ]
    return specific if specific else all_content


def expand_query_terms(terms: list[str]) -> set[str]:
    """Expands query tokens with morphological stems and bilingual civic synonyms."""
    expanded: set[str] = set()
    for term in terms:
        t = term.lower()
        s = _stem(t)
        expanded.add(t)
        expanded.add(s)
        for key in (t, s):
            if key in CIVIC_SYNONYMS:
                expanded.update(CIVIC_SYNONYMS[key][:8])
    return expanded


def _filter_sql(filters: SearchFilters, alias: str = "d") -> tuple[list[str], dict]:
    clauses: list[str] = []
    params: dict = {}
    if filters.year is not None:
        clauses.append(f"{alias}.year = :year")
        params["year"] = filters.year
    if filters.document_type:
        clauses.append(f"{alias}.document_type = :document_type")
        params["document_type"] = filters.document_type
    if filters.jurisdiction:
        clauses.append(f"lower({alias}.jurisdiction) LIKE :jurisdiction")
        params["jurisdiction"] = f"%{filters.jurisdiction.lower()}%"
    if filters.category:
        clauses.append(f"lower({alias}.category) = :category")
        params["category"] = filters.category.lower()
    if filters.subject:
        clauses.append(f"lower({alias}.subject) LIKE :subject")
        params["subject"] = f"%{filters.subject.lower()}%"
    if filters.document_id:
        clauses.append(f"{alias}.id = :document_id")
        params["document_id"] = filters.document_id
    return clauses, params


def _base_conditions(filters: SearchFilters, alias: str = "d") -> tuple[list[str], dict]:
    clauses = [f"{alias}.is_active = 1", f"{alias}.status IN ('processed','needs_review')"]
    filter_clauses, params = _filter_sql(filters, alias)
    clauses.extend(filter_clauses)
    return clauses, params


@dataclass
class Candidate:
    chunk: Chunk
    document: Document
    keyword_score: float = 0.0
    vector_score: float = 0.0
    lexical_score: float = 0.0
    score: float = 0.0
    matched_terms: list[str] | None = None


def _build_fts_match_expression(query: str) -> list[str]:
    """
    Builds prioritized FTS5 match terms combining core topic terms, stems/prefixes,
    and top bilingual civic synonyms so lexical search recalls both exact wording and variants.
    """
    core = topic_terms(query)
    all_terms = content_terms(query) or query_terms(query)
    ordered: list[str] = []
    seen: set[str] = set()

    def add_fts_token(tok: str, allow_prefix: bool = True) -> None:
        clean = re.sub(r"[^a-z0-9ñ]", "", tok.lower())
        if len(clean) < 2 or clean in seen:
            return
        seen.add(clean)
        ordered.append(f'"{clean}"')
        stem = _stem(clean)
        if allow_prefix and len(stem) >= 4 and stem not in seen:
            seen.add(stem)
            ordered.append(f"{stem}*")
        elif allow_prefix and len(clean) >= 5 and f"{clean}*" not in ordered:
            ordered.append(f"{clean}*")

    for t in core:
        add_fts_token(t, allow_prefix=True)
        for syn in CIVIC_SYNONYMS.get(t, CIVIC_SYNONYMS.get(_stem(t), []))[:4]:
            add_fts_token(syn, allow_prefix=False)

    for t in all_terms:
        if t not in core:
            add_fts_token(t, allow_prefix=True)

    return ordered[:32]


def keyword_candidates(db: Session, query: str, filters: SearchFilters) -> dict[str, tuple[Chunk, float]]:
    fts_parts = _build_fts_match_expression(query)
    if not fts_parts:
        return {}
    clauses, params = _base_conditions(filters)
    where = " AND ".join(clauses)
    params["fts_query"] = " OR ".join(fts_parts)
    sql = text(
        f"""
        SELECT c.id AS chunk_id, bm25(chunk_fts, 1.0, 2.5, 2.0, 1.0) AS rank
        FROM chunk_fts
        JOIN chunks c ON c.rowid = chunk_fts.rowid
        JOIN documents d ON d.id = c.document_id
        WHERE chunk_fts MATCH :fts_query AND c.is_active = 1 AND {where}
        ORDER BY rank
        LIMIT :limit
        """
    )
    params["limit"] = settings.retrieval_candidate_limit
    rows = []
    try:
        rows = db.execute(sql, params).fetchall()
    except Exception:
        db.rollback()
        # Fallback to simple quoted OR FTS query without column weights
        simple_tokens = list(dict.fromkeys(content_terms(query) or query_terms(query)))
        params["fts_query"] = " OR ".join(f'"{re.sub(r"[^a-z0-9]", "", t)}"' for t in simple_tokens[:20] if t)
        try:
            rows = db.execute(
                text(
                    f"""
                    SELECT c.id AS chunk_id, bm25(chunk_fts) AS rank
                    FROM chunk_fts
                    JOIN chunks c ON c.rowid = chunk_fts.rowid
                    JOIN documents d ON d.id = c.document_id
                    WHERE chunk_fts MATCH :fts_query AND c.is_active = 1 AND {where}
                    ORDER BY rank
                    LIMIT :limit
                    """
                ),
                params,
            ).fetchall()
        except Exception:
            db.rollback()
            primary, _ = _unpack_query(query)
            like_conditions = " OR ".join(
                ["lower(c.display_text) LIKE :like_query", "lower(c.heading) LIKE :like_query"]
            )
            params["like_query"] = f"%{primary.lower()}%"
            rows = db.execute(
                text(
                    f"""
                    SELECT c.id AS chunk_id, 0.0 AS rank
                    FROM chunks c JOIN documents d ON d.id = c.document_id
                    WHERE c.is_active = 1 AND {where} AND ({like_conditions})
                    LIMIT :limit
                    """
                ),
                params,
            ).fetchall()

    if not rows:
        return {}

    raw = [(-float(row.rank) if float(row.rank) < 0 else 1.0) for row in rows]
    max_raw = max(raw) or 1.0
    ids = [row.chunk_id for row in rows]
    chunks = db.query(Chunk).options(defer(Chunk.embedding)).filter(Chunk.id.in_(ids)).all()
    chunk_map = {chunk.id: chunk for chunk in chunks}

    primary, _ = _unpack_query(query)
    phrase = re.sub(r"\s+", " ", primary.strip().lower())
    core_terms = topic_terms(query)
    core_stems = {_stem(t) for t in core_terms}
    core_expanded = expand_query_terms(core_terms)

    scores: dict[str, tuple[Chunk, float]] = {}
    for row, raw_score in zip(rows, raw, strict=False):
        chunk = chunk_map.get(row.chunk_id)
        if not chunk:
            continue
        bm25_norm = raw_score / max_raw
        haystack_lower = f"{chunk.heading or ''} {chunk.display_text}".lower()
        haystack_tokens = set(TOKEN_RE.findall(haystack_lower))
        haystack_stems = {_stem(tok) for tok in haystack_tokens}

        # Measure how many of the query's core topic concepts are present in this chunk
        if core_stems:
            direct_hits = sum(
                1
                for t, s in zip(core_terms, [_stem(x) for x in core_terms], strict=False)
                if t in haystack_tokens or s in haystack_stems
            )
            synonym_hits = 1 if (haystack_tokens & core_expanded) else 0
            topic_ratio = min(1.0, (direct_hits + 0.35 * synonym_hits) / len(core_terms))
        else:
            topic_ratio = 0.5

        # Combine BM25 rank with topic coverage so chunks that only match a generic word like "penalties"
        # cannot outscore chunks that match the actual subject matter (e.g. "waste dumping", "curfew").
        score = min(1.0, (0.20 + 0.45 * bm25_norm) * (0.35 + 0.65 * topic_ratio) + 0.25 * topic_ratio)
        if len(phrase) >= 6 and phrase in haystack_lower:
            score = min(1.0, score + 0.15)
        scores[chunk.id] = (chunk, score)
    return scores


def vector_candidates(db: Session, query: str, filters: SearchFilters) -> dict[str, tuple[Chunk, float]]:
    from app.embeddings.registry import get_embedding_provider
    from app.retrieval.vector_index import vector_index

    filter_clauses, _ = _filter_sql(filters)
    allowed_ids: list[str] | None = None
    if filter_clauses:
        clauses, params = _base_conditions(filters)
        where = " AND ".join(clauses)
        rows = db.execute(
            text(
                f"""
                SELECT c.id AS chunk_id
                FROM chunks c JOIN documents d ON d.id = c.document_id
                WHERE c.is_active = 1 AND c.embedding_dim > 0 AND {where}
                """
            ),
            params,
        ).fetchall()
        if not rows:
            return {}
        allowed_ids = [str(row.chunk_id) for row in rows]

    primary, earlier = _unpack_query(query)
    core = topic_terms(query)
    # Build a clean semantic query without conversational boilerplate
    semantic_query = primary
    if earlier and len(primary.split()) <= 6:
        semantic_query = f"{primary} ({earlier})"

    # Append lightweight bilingual/legal synonyms if the query uses colloquial terms
    synonym_hints: list[str] = []
    for t in core:
        syns = CIVIC_SYNONYMS.get(t) or CIVIC_SYNONYMS.get(_stem(t))
        if syns:
            synonym_hints.extend(syns[:3])
    if synonym_hints:
        unique_hints = [h for h in dict.fromkeys(synonym_hints) if h not in semantic_query.lower()]
        if unique_hints:
            semantic_query = f"{semantic_query} ({' '.join(unique_hints[:6])})"

    provider = get_embedding_provider()
    query_vector = np.asarray(provider.embed_query(semantic_query), dtype=np.float32)
    raw_scores = vector_index.score_query(db, query_vector, allowed_chunk_ids=allowed_ids)
    if not raw_scores:
        return {}

    sorted_items = sorted(raw_scores.items(), key=lambda item: item[1], reverse=True)[
        : settings.retrieval_candidate_limit
    ]
    top_ids = [cid for cid, _ in sorted_items]
    chunks = db.query(Chunk).options(defer(Chunk.embedding)).filter(Chunk.id.in_(top_ids)).all()
    chunk_map = {chunk.id: chunk for chunk in chunks}

    scores: dict[str, tuple[Chunk, float]] = {}
    for cid, similarity in sorted_items:
        chunk = chunk_map.get(cid)
        if chunk is not None:
            scores[cid] = (chunk, similarity)
    return scores


def _matched_query_terms(query: str, haystack_lower: str) -> list[str]:
    """Finds query terms (and morphological/stem variants) present in the candidate text for UI highlighting."""
    terms = content_terms(query) or query_terms(query)
    haystack_tokens = TOKEN_RE.findall(haystack_lower)
    matched: list[str] = []
    for term in terms:
        t_stem = _stem(term)
        if term in haystack_lower:
            matched.append(term)
            continue
        for h_tok in haystack_tokens:
            if _stem(h_tok) == t_stem or (len(t_stem) >= 4 and h_tok.startswith(t_stem)):
                matched.append(h_tok)
                break
    return list(dict.fromkeys(matched))


def _lexical_rerank(query: str, chunk: Chunk, document: Document | None = None) -> float:
    all_terms = content_terms(query)
    if not all_terms:
        return 0.0
    core_terms = topic_terms(query)
    doc_title = (document.title if document else "") or ""
    doc_subject = (document.subject if document else "") or ""
    doc_category = (document.category if document else "") or ""
    chunk_heading = chunk.heading or ""

    title_heading_text = f"{doc_title} {doc_subject} {doc_category} {chunk_heading}".lower()
    full_haystack = f"{title_heading_text} {chunk.section_number or ''} {chunk.display_text}".lower()

    haystack_tokens = set(TOKEN_RE.findall(full_haystack))
    haystack_stems = {_stem(tok) for tok in haystack_tokens}

    title_tokens = set(TOKEN_RE.findall(title_heading_text))
    title_stems = {_stem(tok) for tok in title_tokens}

    # 1. Core subject coverage (exact, stem, or synonym match)
    core_hits = 0.0
    for term in core_terms:
        t_stem = _stem(term)
        if term in haystack_tokens or t_stem in haystack_stems:
            core_hits += 1.0
        else:
            syns = set(CIVIC_SYNONYMS.get(term, CIVIC_SYNONYMS.get(t_stem, [])))
            if syns & haystack_tokens:
                core_hits += 0.7
    core_coverage = min(1.0, core_hits / max(1, len(core_terms)))

    # 2. All content terms coverage (including secondary terms like 'penalty', 'exemptions', 'hours')
    all_hits = sum(
        1.0
        for term in all_terms
        if term in haystack_tokens or _stem(term) in haystack_stems
    )
    all_coverage = all_hits / len(all_terms)

    # 3. Document Title & Section Heading alignment bonus
    title_hits = 0.0
    for term in core_terms:
        t_stem = _stem(term)
        if term in title_tokens or t_stem in title_stems:
            title_hits += 1.0
        else:
            syns = set(CIVIC_SYNONYMS.get(term, CIVIC_SYNONYMS.get(t_stem, [])))
            if syns & title_tokens:
                title_hits += 0.65
    title_alignment = min(1.0, title_hits / max(1, len(core_terms)))

    # 4. Exact phrase or section number bonus
    primary, _ = _unpack_query(query)
    phrase = 1.0 if re.sub(r"\s+", " ", primary.strip().lower()) in full_haystack else 0.0
    number_bonus = 0.0
    if chunk.section_number and re.search(rf"\b{re.escape(chunk.section_number.lower())}\b", primary.lower()):
        number_bonus = 1.0

    # 5. Penalty / Exemption / Permit section intent alignment
    intent_bonus = 0.0
    q_lower = primary.lower()
    heading_lower = chunk_heading.lower()
    if re.search(r"\b(penalt|fine|sanction|punish|multa|parusa)", q_lower):
        if re.search(r"\b(penalt|fine|sanction|violation|offense|imprisonment|php|peso|multa|parusa)", full_haystack):
            intent_bonus = 1.0 if "penal" in heading_lower or "fine" in heading_lower else 0.6
    elif re.search(r"\b(exempt|exception)", q_lower):
        if re.search(r"\b(exempt|exception|unless|except)", full_haystack):
            intent_bonus = 1.0

    return min(
        1.0,
        0.42 * core_coverage
        + 0.20 * all_coverage
        + 0.22 * title_alignment
        + 0.10 * intent_bonus
        + 0.06 * max(phrase, number_bonus),
    )


SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])(?<!PHP\.)(?<!Sec\.)(?<!No\.)(?<!Art\.)(?<!Hon\.)\s+|\n{2,}")
EMAIL_RE = re.compile(r"\b[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}\b")
URL_RE = re.compile(r"https?://\S+|www\.\S+", re.IGNORECASE)


def _clean_sentence(text: str) -> str:
    cleaned = BRACKET_HEADER_RE.sub("", text)
    cleaned = EMAIL_RE.sub(" ", cleaned)
    cleaned = URL_RE.sub(" ", cleaned)
    cleaned = cleaned.replace("\ufffd", " ")
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = re.sub(r"^\d{4}\s+entitled,?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^[^\w\"'“‘(]+", "", cleaned)
    return cleaned.strip(" -–—•|\"'“”‘’")


def _term_key(term: str) -> str:
    stemmed = _stem(term)
    return stemmed[:5] if len(stemmed) > 5 else stemmed


def _sentences(text: str) -> list[str]:
    # Strip leading bracketed context header e.g. `[Ordinance No. ... | Section ...]`
    body = BRACKET_HEADER_RE.sub("", text.strip())
    # Keep single newlines inside enumerated clauses joined so `(a) First Offense... (b) Second Offense...` stay intact
    body = re.sub(r"\n(?=\s*(?:\([a-zA-Z0-9]{1,3}\)|[a-zA-Z0-9]{1,2}[.)]\s|\-\s|•\s))", " ", body)
    compact = re.sub(r"[ \t]+", " ", body).strip()
    if not compact:
        return []
    parts = [_clean_sentence(part) for part in SENTENCE_SPLIT_RE.split(compact)]
    parts = [part for part in parts if part]
    joined: list[str] = []
    for part in parts:
        if joined and (
            re.search(r"\b[A-Z]\.$", joined[-1])
            or joined[-1].endswith(":")
            or re.match(r"^\([a-z0-9]{1,3}\)", part, re.IGNORECASE)
        ):
            joined[-1] = f"{joined[-1]} {part}"
        else:
            joined.append(part)
    parts = joined
    merged: list[str] = []
    index = 0
    while index < len(parts):
        part = parts[index]
        if re.match(r"^(SECTION|SEKSIYON|ARTICLE|ARTIKULO|RULE|CHAPTER)\b", part, re.IGNORECASE) and len(part) < 120:
            combined = part
            index += 1
            while index < len(parts) and len(combined) < 140:
                combined = f"{combined} {parts[index]}"
                index += 1
            merged.append(combined)
            continue
        merged.append(part)
        index += 1
    return merged or [_clean_sentence(compact)]


def _sentence_score(sentence: str, terms: list[str], core: list[str] | None = None) -> float:
    words = TOKEN_RE.findall(sentence.lower())
    if not words or not terms:
        return 0.0
    word_set = set(words)
    word_keys = {_term_key(word) for word in words}

    target_core = core if core else terms
    core_hits = 0.0
    for t in target_core:
        tk = _term_key(t)
        if tk in word_keys or t in word_set:
            core_hits += 1.0
        else:
            syns = CIVIC_SYNONYMS.get(t, CIVIC_SYNONYMS.get(_stem(t), []))
            if any(s in word_set or _term_key(s) in word_keys for s in syns):
                core_hits += 0.65

    all_keys = {_term_key(term) for term in terms}
    all_hits = len(word_keys & all_keys) / max(1, len(all_keys))
    core_ratio = min(1.0, core_hits / max(1, len(target_core)))
    return 0.65 * core_ratio + 0.35 * all_hits


def make_excerpt(text: str, terms: list[str], size: int = 420) -> str:
    body = BRACKET_HEADER_RE.sub("", text.strip())
    compact = re.sub(r"\s+", " ", body).strip()
    if len(compact) <= size:
        return compact
    sentences = _sentences(body)
    if len(sentences) > 1 and terms:
        scores = [_sentence_score(sentence, terms) for sentence in sentences]
        best = max(range(len(sentences)), key=lambda index: scores[index])
        if scores[best] > 0:
            selected = [best]
            used = len(sentences[best])
            for index in (best - 1, best + 1):
                if 0 <= index < len(sentences) and used + len(sentences[index]) + 1 <= size:
                    selected.append(index)
                    used += len(sentences[index]) + 1
            selected.sort()
            excerpt = " ".join(sentences[index] for index in selected)
            if len(excerpt) > size:
                excerpt = excerpt[:size].rstrip()
            if selected[0] > 0:
                excerpt = "…" + excerpt
            if selected[-1] < len(sentences) - 1:
                excerpt = excerpt + "…"
            return excerpt
    lower = compact.lower()
    positions = [lower.find(term) for term in terms if term and lower.find(term) >= 0]
    if positions:
        center = min(positions)
        start = max(0, center - size // 3)
    else:
        start = 0
    end = min(len(compact), start + size)
    excerpt = compact[start:end].strip()
    if start > 0:
        excerpt = "…" + excerpt
    if end < len(compact):
        excerpt = excerpt + "…"
    return excerpt


DETAIL_CUES = {
    "shall",
    "must",
    "may",
    "shall be",
    "hereby",
    "establish",
    "construct",
    "operate",
    "maintain",
    "acquire",
    "fund",
    "amount",
    "cost",
    "purpose",
    "require",
    "prohibit",
    "prohibited",
    "unlawful",
    "authorize",
    "designate",
    "implement",
    "provide",
    "penalty",
    "penalties",
    "fine",
    "fines",
    "imprisonment",
    "sanction",
    "exempt",
    "exempted",
    "exemption",
    "hours",
    "fee",
    "permit",
    "ipinagbabawal",
    "multa",
    "parusa",
    "pagkakakulong",
}

BOILERPLATE_RE = re.compile(
    r"^(whereas|sapagkat|now,?\s+therefore|be it enacted|respectfully yours|approved:|attested:|"
    r"prepared by|certified correct|republic of the philippines|republika ng pilipinas|"
    r"province of|municipality of|city of|office of the|hon\.)\b",
    re.IGNORECASE,
)
DETAIL_RE = re.compile(r"\b(" + "|".join(re.escape(cue) for cue in DETAIL_CUES) + r")\b", re.IGNORECASE)
INTENT_CUES = {
    "penalty": {"penal", "fine", "sanction", "punish", "violation", "offense", "imprisonment", "peso", "php", "multa", "parusa"},
    "amount": {"peso", "php", "amount", "million", "thousand", "fund", "loan", "fee", "cost", "multa"},
    "purpose": {"purpose", "finance", "construct", "establish", "acquisition", "project", "objective"},
    "authority": {"office", "department", "authorized", "responsible", "enforce", "task force", "barangay", "police"},
    "exemption": {"exempt", "exception", "unless", "accompanied", "emergency", "except"},
}


def _citation_label(result: SearchResult) -> str:
    document = result.document
    source = (
        f"{document.document_type} No. {document.ordinance_number}"
        if document.ordinance_number
        else document.title
    )
    section = f"Section {result.section_number}" if result.section_number else (result.heading or "Provision")
    return f"{source}, {section}, p. {result.page_start}"


def _is_boilerplate(sentence: str, terms: list[str]) -> bool:
    if BOILERPLATE_RE.match(sentence):
        return True
    letters = [character for character in sentence if character.isalpha()]
    lowered = sentence.lower()
    if (
        len(letters) >= 40
        and sum(character.isupper() for character in letters) / len(letters) > 0.92
        and not any(term in lowered for term in terms)
    ):
        return True
    return not any(term in lowered for term in terms) and (
        "secretary to the" in lowered or "certified correct" in lowered
    )


def _intent_cues(query: str) -> set[str]:
    primary, _ = _unpack_query(query)
    lowered = primary.lower()
    cues: set[str] = set()
    if re.search(r"\b(penalt|fine|sanction|punish|violation|offense|multa|parusa)", lowered):
        cues |= INTENT_CUES["penalty"]
    if re.search(r"\b(exempt|exception|unless)\b", lowered):
        cues |= INTENT_CUES["exemption"]
    if re.search(r"\b(purpose|why|used for|objective)\b", lowered):
        cues |= INTENT_CUES["purpose"]
    if re.search(r"\b(how much|amount|cost|price|fee|fees|funding|loan|magkano)\b", lowered):
        cues |= INTENT_CUES["amount"]
    if re.search(r"\b(who|which office|department|responsible|authority|enforce|sino)\b", lowered):
        cues |= INTENT_CUES["authority"]
    return cues


def _answer_intro(query: str) -> str:
    primary, _ = _unpack_query(query)
    lowered = primary.lower()
    if re.search(r"\b(detail|details|information|describe|explain)\b", lowered):
        return "The retrieved provisions provide these details:"
    if re.search(r"\b(penalt|fine|sanction|punish|multa|parusa)", lowered):
        return "The retrieved provisions state the following rules and penalties:"
    if re.search(r"\b(who|which office|department|responsible)\b", lowered):
        return "The retrieved provisions identify the following:"
    return "The retrieved provisions state:"


def _looks_like_fragment(sentence: str) -> bool:
    first_word = re.match(r"([A-Za-z]+)", sentence)
    if not first_word or not sentence[0].islower() or first_word.group(1).lower() in {
        "a",
        "an",
        "and",
        "any",
        "but",
        "every",
        "for",
        "in",
        "including",
        "no",
        "of",
        "or",
        "provided",
        "subject",
        "that",
        "the",
        "to",
        "which",
        "who",
    }:
        return False
    return True


def _near_duplicate(left: str, right: str) -> bool:
    left_terms = {term for term in TOKEN_RE.findall(left.lower()) if term not in STOPWORDS}
    right_terms = {term for term in TOKEN_RE.findall(right.lower()) if term not in STOPWORDS}
    if not left_terms or not right_terms:
        return False
    shared = len(left_terms & right_terms)
    jaccard = shared / len(left_terms | right_terms)
    containment = shared / min(len(left_terms), len(right_terms))
    return jaccard >= 0.68 or containment >= 0.80


def _is_preamble(result: SearchResult) -> bool:
    heading = (result.heading or "").lower()
    return result.section_number is None and ("preamble" in heading or "whereas" in heading)


def _compose_answer(query: str, results: list[SearchResult]) -> AnswerBlock | None:
    if not results:
        return None
    answer_results = [result for result in results[:4] if not _is_preamble(result)]
    if not answer_results:
        answer_results = results[:3]

    focus = list(dict.fromkeys(content_terms(query) or query_terms(query)))
    core = topic_terms(query)
    intent_cues = _intent_cues(query)

    candidates: list[tuple[float, int, int, str, SearchResult]] = []
    for result_rank, result in enumerate(answer_results):
        rank_decay = max(0.55, 1.0 - 0.15 * result_rank)
        for sentence_rank, sentence in enumerate(_sentences(result.text)):
            sentence = sentence.strip(" -")
            if len(sentence) < 25 or len(sentence) > 1400:
                continue
            if _is_boilerplate(sentence, focus) or _looks_like_fragment(sentence):
                continue
            relevance = _sentence_score(sentence, focus, core)
            cue_bonus = 1.0 if DETAIL_RE.search(sentence) else 0.0
            intent_bonus = (
                1.0
                if intent_cues and any(cue in sentence.lower() for cue in intent_cues)
                else 0.0
            )
            if relevance == 0 and intent_bonus == 0:
                continue
            score = (
                0.42 * relevance
                + 0.30 * (result.retrieval_score * rank_decay)
                + 0.13 * cue_bonus
                + 0.15 * intent_bonus
            )
            candidates.append((score, result_rank, sentence_rank, sentence, result))

    candidates.sort(key=lambda item: item[0], reverse=True)

    selected: list[tuple[int, int, str, SearchResult]] = []
    for _, result_rank, sentence_rank, sentence, result in candidates:
        if len(selected) >= 3:
            break
        if any(_near_duplicate(sentence, existing[2]) for existing in selected):
            continue
        selected.append((result_rank, sentence_rank, sentence, result))

    if not selected:
        return None
    selected.sort(key=lambda item: (item[0], item[1]))

    claims = [
        AnswerClaim(
            claim=sentence,
            citations=[_citation_label(result)],
            chunk_id=result.chunk_id,
            citation_url=result.citation,
            page_start=result.page_start,
            document_id=result.document.id,
        )
        for _, _, sentence, result in selected
    ]
    intro = _answer_intro(query)
    body = " ".join(f"“{claim.claim}” [{index}]" for index, claim in enumerate(claims, 1))
    return AnswerBlock(
        text=f"{intro} {body}",
        mode="extractive",
        claims=claims,
        disclaimer=(
            "This answer is an extractive summary of the cited provisions, not a generated "
            "legal opinion. Verify the cited ordinance section and whether it remains in force."
        ),
    )


def _reliable(configuration: str, candidate: Candidate, runtime: dict) -> bool:
    if configuration == "keyword":
        return candidate.keyword_score > 0
    if configuration == "vector":
        return candidate.vector_score >= min(runtime["vector_min_score"], 0.36)
    return (
        candidate.keyword_score >= 0.05
        or candidate.vector_score >= min(runtime["vector_min_score"], 0.38)
        or candidate.lexical_score >= 0.25
    )


def search_documents(db: Session, request: SearchRequest, log_event: bool = True) -> SearchResponse:
    started = time.perf_counter()
    configuration = request.configuration
    runtime = retrieval_config(db)
    raw_query = request.query.strip()
    primary_query, _ = _unpack_query(raw_query)
    terms = content_terms(raw_query) or query_terms(raw_query)
    core_terms = topic_terms(raw_query)
    expanded_core = expand_query_terms(core_terms)

    keyword_hits: dict[str, tuple[Chunk, float]] = {}
    vector_hits: dict[str, tuple[Chunk, float]] = {}
    if configuration in {"keyword", "hybrid", "hybrid_rerank"}:
        keyword_hits = keyword_candidates(db, raw_query, request.filters)
    if configuration in {"vector", "hybrid", "hybrid_rerank"}:
        vector_hits = vector_candidates(db, raw_query, request.filters)

    ids = set(keyword_hits) | set(vector_hits)
    chunk_map: dict[str, Chunk] = {}
    for chunk_id in ids:
        hit = keyword_hits.get(chunk_id) or vector_hits.get(chunk_id)
        if hit:
            chunk_map[chunk_id] = hit[0]
    documents = (
        {
            doc.id: doc
            for doc in db.query(Document)
            .filter(Document.id.in_({chunk.document_id for chunk in chunk_map.values()}))
            .all()
        }
        if chunk_map
        else {}
    )

    candidates: list[Candidate] = []
    for chunk_id, chunk in chunk_map.items():
        document = documents.get(chunk.document_id)
        if not document or not document.is_active:
            continue
        kw = keyword_hits.get(chunk_id, (chunk, 0.0))[1]
        vec = vector_hits.get(chunk_id, (chunk, 0.0))[1]
        lexical = _lexical_rerank(raw_query, chunk, document)

        haystack_lower = f"{document.title or ''} {chunk.heading or ''} {chunk.display_text}".lower()
        haystack_tokens = set(TOKEN_RE.findall(haystack_lower))
        has_topic_overlap = bool(haystack_tokens & expanded_core) if expanded_core else True

        if configuration == "keyword":
            score = 0.75 * kw + 0.25 * lexical
        elif configuration == "vector":
            score = vec
        elif configuration == "hybrid":
            score = runtime["vector_weight"] * vec + runtime["keyword_weight"] * kw
        else:
            base = runtime["vector_weight"] * vec + runtime["keyword_weight"] * kw
            score = 0.72 * base + 0.28 * lexical if runtime["rerank_enabled"] else base
            # Boost when both dense vector AND lexical reranker agree on the topic
            if vec >= 0.45 and lexical >= 0.35:
                score = min(1.0, score + 0.08)

        # Dampen false-positive candidates that have zero overlap with the query's core topic
        # (e.g. an unrelated ordinance matching only the word "Penalties" or "Section")
        if not has_topic_overlap and configuration != "vector":
            score *= 0.45

        matched = _matched_query_terms(raw_query, f"{chunk.heading or ''} {chunk.display_text}".lower())
        candidates.append(
            Candidate(
                chunk=chunk,
                document=document,
                keyword_score=kw,
                vector_score=vec,
                lexical_score=lexical,
                score=score,
                matched_terms=matched,
            )
        )

    min_score = request.min_score if request.min_score is not None else min(runtime["min_score"], 0.18)
    filtered_candidates = [
        candidate
        for candidate in candidates
        if candidate.score >= min_score and _reliable(configuration, candidate, runtime)
    ]
    # Graceful fallback if thresholds were slightly too strict for a rare/colloquial query
    if not filtered_candidates and candidates:
        candidates.sort(key=lambda item: item.score, reverse=True)
        filtered_candidates = [c for c in candidates[: request.top_k] if c.score >= 0.12]
    else:
        filtered_candidates.sort(key=lambda item: item.score, reverse=True)

    deduped: list[Candidate] = []
    seen_sections: set[str] = set()
    for candidate in filtered_candidates:
        if candidate.chunk.section_id in seen_sections:
            continue
        seen_sections.add(candidate.chunk.section_id)
        deduped.append(candidate)
        if len(deduped) >= request.top_k:
            break

    summaries: dict[str, object] = {}
    results: list[SearchResult] = []
    for candidate in deduped:
        if candidate.document.id not in summaries:
            summaries[candidate.document.id] = summary(db, candidate.document)
        doc_summary = summaries[candidate.document.id]
        cleaned_display = clean_and_format_ocr_text(candidate.chunk.display_text)
        highlight_terms = candidate.matched_terms or terms
        excerpt = make_excerpt(cleaned_display, highlight_terms)
        section_citation = (
            f"/documents/{candidate.document.id}?tab=Sections&section={candidate.chunk.section_id}"
            f"&page={candidate.chunk.page_start}"
        )
        results.append(
            SearchResult(
                chunk_id=candidate.chunk.id,
                section_id=candidate.chunk.section_id,
                chunk_key=candidate.chunk.chunk_key,
                document=doc_summary,
                section_number=candidate.chunk.section_number,
                heading=clean_and_format_ocr_text(candidate.chunk.heading, reflow_paragraphs=False)
                if candidate.chunk.heading
                else None,
                page_start=candidate.chunk.page_start,
                page_end=candidate.chunk.page_end,
                excerpt=excerpt,
                text=cleaned_display,
                score=round(candidate.score, 4),
                retrieval_score=round(candidate.score, 4),
                keyword_score=round(candidate.keyword_score, 4),
                vector_score=round(candidate.vector_score, 4),
                rerank_score=round(candidate.lexical_score, 4),
                matched_terms=candidate.matched_terms or [],
                verification_status=candidate.chunk.verification_status,
                citation=section_citation,
                pdf_url="",
            )
        )

    elapsed = round((time.perf_counter() - started) * 1000, 1)
    top_score = results[0].score if results else None
    message = None
    suggestions: list[str] = []
    if not results:
        message = (
            "No sufficiently relevant ordinance or policy text was found in the indexed corpus. "
            "This does not mean that no such rule exists; try different wording, remove filters, "
            "or search by ordinance number."
        )
        suggestions = [
            "Try a shorter phrase with the key legal terms.",
            "Remove year, type, or jurisdiction filters.",
            "Search by ordinance or resolution number if you know it.",
        ]
        if terms:
            suggestions.insert(0, f"Try: {' '.join(terms[:4])}")

    if log_event:
        db.add(
            SearchEvent(
                query=primary_query[:500],
                filters=request.filters.model_dump(exclude_none=True),
                result_count=len(results),
                latency_ms=elapsed,
                top_score=top_score,
            )
        )
        db.commit()

    return SearchResponse(
        query=primary_query,
        results=results,
        total=len(results),
        took_ms=elapsed,
        configuration=configuration,
        message=message,
        suggestions=suggestions,
        top_score=top_score,
        answer=_compose_answer(raw_query, results),
    )


def retrieve_section_context(db: Session, chunk_id: str) -> SearchResult | None:
    chunk = db.query(Chunk).options(defer(Chunk.embedding)).filter(Chunk.id == chunk_id).first()
    if not chunk or not chunk.is_active:
        return None
    doc = db.get(Document, chunk.document_id)
    if not doc:
        return None
    doc_summary = summary(db, doc)
    terms = content_terms(doc.title)[:5]
    cleaned_display = clean_and_format_ocr_text(chunk.display_text)
    section_citation = f"/documents/{doc.id}?tab=Sections&section={chunk.section_id}&page={chunk.page_start}"
    return SearchResult(
        chunk_id=chunk.id,
        section_id=chunk.section_id,
        chunk_key=chunk.chunk_key,
        document=doc_summary,
        section_number=chunk.section_number,
        heading=clean_and_format_ocr_text(chunk.heading, reflow_paragraphs=False) if chunk.heading else None,
        page_start=chunk.page_start,
        page_end=chunk.page_end,
        excerpt=make_excerpt(cleaned_display, terms),
        text=cleaned_display,
        score=1.0,
        retrieval_score=1.0,
        matched_terms=[],
        verification_status=chunk.verification_status,
        citation=section_citation,
        pdf_url="",
    )


def grounded_answer(db: Session, request: SearchRequest) -> dict:
    response = search_documents(db, request)
    if not response.answer:
        return {
            "query": response.query,
            "mode": "extractive",
            "answer": "",
            "claims": [],
            "passages": response.results,
            "disclaimer": (
                "This system does not provide legal advice. No generative model is configured; "
                "only retrieved source passages are shown."
            ),
            "message": response.message,
        }
    return {
        "query": response.query,
        "mode": response.answer.mode,
        "answer": response.answer.text,
        "claims": [claim.model_dump() for claim in response.answer.claims],
        "passages": response.results,
        "disclaimer": response.answer.disclaimer,
        "message": None,
    }
