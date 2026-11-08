from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import Chunk, Document, ProcessingJob
from app.db.session import get_db
from app.ingestion.ocr import tesseract_available
from app.ingestion.ocr_helper import repair_corpus_ocr_text
from app.services.gemini_ocr import is_gemini_available, repair_corpus_with_gemini

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/health")
def health(db: Session = Depends(get_db)):
    database_ok = True
    detail = "ok"
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:
        database_ok = False
        detail = type(exc).__name__
    return {
        "status": "ok" if database_ok else "degraded",
        "database": {"ok": database_ok, "detail": detail, "dialect": db.bind.dialect.name if db.bind else None},
        "ocr": {"tesseract_available": tesseract_available(), "enabled": settings.ocr_enabled},
        "worker": {"enabled": settings.worker_enabled},
        "embedding": {"provider": settings.embedding_provider, "model": settings.embedding_model},
        "environment": settings.environment,
    }


@router.get("/info")
def info(db: Session = Depends(get_db)):
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "documents": db.query(Document).filter(Document.is_active.is_(True)).count(),
        "indexed_chunks": db.query(Chunk).filter(Chunk.is_active.is_(True)).count(),
        "embedding_model": settings.embedding_model,
        "ocr_languages": settings.ocr_lang,
        "retrieval_defaults": {
            "top_k": settings.retrieval_top_k,
            "vector_weight": settings.vector_weight,
            "keyword_weight": settings.keyword_weight,
            "min_score": settings.retrieval_min_score,
        },
        "notice": (
            "Retrieval scores indicate similarity, not legal certainty. "
            "Original PDF scans containing physical signatures are withheld for privacy compliance."
        ),
    }


@router.get("/stats")
def public_stats(db: Session = Depends(get_db)):
    return {
        "active_documents": db.query(Document).filter(Document.is_active.is_(True)).count(),
        "indexed_sections": db.query(Chunk.section_id)
        .filter(Chunk.is_active.is_(True))
        .distinct()
        .count(),
        "indexed_chunks": db.query(Chunk).filter(Chunk.is_active.is_(True)).count(),
        "queued_jobs": db.query(ProcessingJob).filter(ProcessingJob.status.in_(["queued", "running"])).count(),
    }


@router.post("/repair-ocr")
def trigger_ocr_corpus_repair(db: Session = Depends(get_db)):
    """
    Runs the multi-model Google Gemini AI refiner and context-aware bilingual
    OCR spell & structural formatter across all persisted Sections and Chunks.
    """
    stats = repair_corpus_ocr_text(db)
    gemini_stats = {}
    if is_gemini_available():
        gemini_stats = repair_corpus_with_gemini(db)
    return {
        "status": "ok",
        "heuristic_stats": stats,
        "gemini_stats": gemini_stats,
    }
