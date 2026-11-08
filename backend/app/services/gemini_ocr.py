"""
Google Gemini AI Assistant & Multi-Model OCR Spell / Statutory Formatting Helper.
Cycles through active Gemini models when any model is unavailable, rate-limited, or timing out.
Preserves statutory citations and provisions with 100% fidelity.
"""

from __future__ import annotations

import logging
import re
import threading
import time
from typing import TYPE_CHECKING

import httpx

from app.core.config import settings
from app.ingestion.ocr_helper import clean_and_format_ocr_text

if TYPE_CHECKING:
    from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Primary candidate models supported by Google AI Studio
# Ordered by tested responsiveness and free-tier compatibility
GEMINI_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite-preview",
    "gemini-3.1-flash-lite",
    "gemini-3-flash-preview",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
]

SYSTEM_INSTRUCTION = (
    "You are an expert municipal legal transcription and OCR repair assistant for the Municipality of Polangui, Albay, Philippines. "
    "Your task is to fix OCR noise, misspelled legal terminology, misread typewriter glyphs (e.g. '0rdinance' -> 'Ordinance', 'rn' -> 'm', "
    "'1' -> 'l', 'VVhereas' -> 'WHEREAS', 'w4ste' -> 'waste', 'disp0sal' -> 'disposal'), broken hyphenated words across lines, and punctuation defects. "
    "CRITICAL RULES:\n"
    "1. Preserve the exact legal meaning, section numbers (e.g. SECTION 1, SEC. 2), statutory citations, and penalty amounts.\n"
    "2. Respect bilingual English and Filipino/Tagalog legal provisions, and local terms (e.g. Sangguniang Bayan, Punong Barangay, Munisipalidad ng Polangui, Lalawigan ng Albay).\n"
    "3. Never hallucinate, add commentary, conversational preamble (like 'Here is the corrected text:'), or markdown backticks. Output ONLY the cleaned legal text."
)

_lock = threading.Lock()
_active_model_idx = 0
_shared_client: httpx.Client | None = None


def _get_http_client() -> httpx.Client:
    global _shared_client
    if _shared_client is None or _shared_client.is_closed:
        _shared_client = httpx.Client(
            timeout=httpx.Timeout(connect=5.0, read=25.0, write=5.0, pool=10.0),
            limits=httpx.Limits(max_keepalive_connections=5, max_connections=10),
        )
    return _shared_client


def is_gemini_available() -> bool:
    """Returns True if a Google Gemini API key is configured."""
    return bool(settings.gemini_api_key and settings.gemini_api_key.strip())


def get_active_model() -> str:
    """Returns the currently active Gemini model name."""
    global _active_model_idx
    with _lock:
        return GEMINI_MODELS[_active_model_idx % len(GEMINI_MODELS)]


def cycle_to_next_model() -> str:
    """Cycles to the next available model in the pool."""
    global _active_model_idx
    with _lock:
        _active_model_idx = (_active_model_idx + 1) % len(GEMINI_MODELS)
        next_model = GEMINI_MODELS[_active_model_idx]
        logger.info("Cycled active Gemini model to: %s", next_model)
        return next_model


def _clean_ai_output(text: str) -> str:
    """Removes code blocks and conversational artifacts."""
    out = text.strip()
    if out.startswith("```") and out.endswith("```"):
        lines = out.splitlines()
        out = "\n".join(lines[1:-1]).strip()
    # Remove common preamble phrases
    preamble_patterns = [
        r"^Here is the corrected (?:legal )?(?:text|spelling)[:\s]*\n*",
        r"^The corrected spelling is[:\s]*\n*",
        r"^Corrected text[:\s]*\n*",
    ]
    for pat in preamble_patterns:
        out = re.sub(pat, "", out, flags=re.IGNORECASE).strip()
    return out


def _call_gemini_api(prompt: str, api_key: str) -> str | None:
    payload = {
        "systemInstruction": {
            "parts": [{"text": SYSTEM_INSTRUCTION}]
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.1,
            "maxOutputTokens": 4096,
        }
    }

    client = _get_http_client()
    total_models = len(GEMINI_MODELS)

    for _ in range(total_models):
        model_name = get_active_model()
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
        try:
            resp = client.post(url, json=payload)
            if resp.status_code == 200:
                res_body = resp.json()
                candidates = res_body.get("candidates", [])
                if candidates:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and "text" in parts[0]:
                        refined = _clean_ai_output(parts[0]["text"])
                        if refined:
                            return refined
            elif resp.status_code == 429:
                logger.info("Gemini model '%s' rate limited (429). Waiting 1s and cycling...", model_name)
                time.sleep(1.0)
                cycle_to_next_model()
            elif resp.status_code in (503, 404, 500):
                logger.info("Gemini model '%s' status %d. Cycling to next model...", model_name, resp.status_code)
                cycle_to_next_model()
            else:
                cycle_to_next_model()
        except httpx.TimeoutException:
            logger.info("Gemini model '%s' timed out (>25s). Cycling to next model...", model_name)
            cycle_to_next_model()
        except Exception as exc:
            logger.info("Gemini model '%s' error: %s. Cycling to next model...", model_name, exc)
            cycle_to_next_model()

    return None


def refine_text_with_gemini(text: str, context_title: str = "") -> str:
    """
    Refines raw or noisy OCR text using Google Gemini Flash models, automatically
    cycling through available models if one is busy, rate-limited, or timing out.
    Falls back cleanly to algorithmic bilingual cleaner if network fails.
    """
    cleaned_heuristics = clean_and_format_ocr_text(text)
    api_key = settings.gemini_api_key.strip()
    if not api_key:
        return cleaned_heuristics

    if len(text.strip()) < 15:
        return cleaned_heuristics

    # If text is excessively long, refine the primary 3,000 characters and keep the rest heuristically cleaned
    if len(cleaned_heuristics) > 3500:
        head = cleaned_heuristics[:3000]
        tail = cleaned_heuristics[3000:]
        prompt = (
            f"Document context: {context_title or 'Municipal Ordinance'}\n\n"
            f"Raw legal OCR text to correct:\n{head}"
        )
        refined_head = _call_gemini_api(prompt, api_key)
        if refined_head:
            return f"{refined_head}\n{tail}"
        return cleaned_heuristics

    prompt = (
        f"Document context: {context_title or 'Municipal Ordinance'}\n\n"
        f"Raw legal OCR text to correct:\n{cleaned_heuristics}"
    )

    refined = _call_gemini_api(prompt, api_key)
    return refined if refined else cleaned_heuristics


def repair_corpus_with_gemini(db: Session, max_sections: int = 500) -> dict[str, int]:
    """
    Scans uncorrected Sections and Chunks in the database, runs the multi-model Gemini
    helper across them, updates their text, re-embeds vectors, and invalidates vector cache.
    """
    from app.db.models import Chunk, Document, DocumentVersion, Section
    from app.embeddings.registry import get_embedding_provider
    from app.retrieval.vector_index import invalidate_vector_index

    current_versions = db.query(DocumentVersion.id).filter(DocumentVersion.is_current.is_(True)).all()
    version_ids = [v[0] for v in current_versions]

    sections = (
        db.query(Section)
        .filter(Section.version_id.in_(version_ids), Section.verification_status != "corrected")
        .order_by(Section.document_id, Section.order_index)
        .limit(max_sections)
        .all()
    )

    doc_titles: dict[str, str] = {}
    provider = get_embedding_provider()
    sections_repaired = 0
    chunks_repaired = 0

    for idx, sec in enumerate(sections):
        if sec.document_id not in doc_titles:
            doc = db.get(Document, sec.document_id)
            doc_titles[sec.document_id] = doc.title if doc else ""

        current_text = sec.corrected_text if sec.corrected_text else sec.normalized_text
        refined = refine_text_with_gemini(current_text, doc_titles[sec.document_id])

        if refined:
            sec.corrected_text = refined
            sec.verification_status = "corrected"
            sections_repaired += 1

            # Update corresponding chunks
            chunks = db.query(Chunk).filter(Chunk.section_id == sec.id).all()
            if chunks:
                for chk in chunks:
                    chk.display_text = refined
                    chk.verification_status = "corrected"
                    chunks_repaired += 1

                # Re-embed updated chunks
                batch_texts = [chk.display_text for chk in chunks]
                try:
                    vectors = provider.embed_documents(batch_texts)
                    for chk, vector in zip(chunks, vectors, strict=True):
                        chk.embedding = [round(v, 6) for v in vector]
                        chk.embedding_dim = len(vector)
                except Exception as exc:
                    logger.warning("Re-embedding chunks for section %s failed: %s", sec.id, exc)

            db.commit()

        # Slight 200ms throttle between calls to stay well within free-tier quotas
        time.sleep(0.20)

    if sections_repaired > 0:
        db.commit()
        invalidate_vector_index()
        logger.info(
            "Gemini OCR repair completed: %d sections repaired, %d chunks re-embedded",
            sections_repaired,
            chunks_repaired,
        )

    return {
        "sections_repaired": sections_repaired,
        "chunks_repaired": chunks_repaired,
        "total_evaluated": len(sections),
    }
