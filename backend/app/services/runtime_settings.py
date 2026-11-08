from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.models import AppSetting


def get_runtime_overrides(db: Session, key: str) -> dict:
    row = db.get(AppSetting, key)
    return dict(row.value) if row and isinstance(row.value, dict) else {}


def retrieval_config(db: Session) -> dict:
    overrides = get_runtime_overrides(db, "retrieval")
    return {
        "vector_weight": float(overrides.get("vector_weight", settings.vector_weight)),
        "keyword_weight": float(overrides.get("keyword_weight", settings.keyword_weight)),
        "min_score": float(overrides.get("min_score", settings.retrieval_min_score)),
        "vector_min_score": float(
            overrides.get("vector_min_score", settings.retrieval_vector_min_score)
        ),
        "rerank_enabled": bool(overrides.get("rerank_enabled", settings.rerank_enabled)),
        "top_k": int(overrides.get("top_k", settings.retrieval_top_k)),
    }


def chunking_config(db: Session) -> dict:
    overrides = get_runtime_overrides(db, "chunking")
    return {
        "max_chars": int(overrides.get("max_chars", settings.chunk_max_chars)),
        "overlap_chars": int(overrides.get("overlap_chars", settings.chunk_overlap_chars)),
        "min_chars": int(overrides.get("min_chars", settings.chunk_min_chars)),
    }


def set_runtime_overrides(db: Session, key: str, value: dict, user_id: str | None) -> AppSetting:
    row = db.get(AppSetting, key)
    if row is None:
        row = AppSetting(key=key, value=value, updated_by=user_id)
        db.add(row)
    else:
        row.value = value
        row.updated_by = user_id
    db.commit()
    db.refresh(row)
    return row
