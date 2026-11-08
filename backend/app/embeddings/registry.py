import logging
import threading

from app.core.config import settings
from app.embeddings.base import EmbeddingProvider
from app.embeddings.hashing import HashingEmbeddingProvider

logger = logging.getLogger(__name__)

_provider: EmbeddingProvider | None = None
_lock = threading.Lock()


def _detect_corpus_model() -> str:
    """
    Checks the majority active chunk embedding_model/embedding_dim in the database
    so query vectors always use the exact same model space as the indexed corpus.
    """
    try:
        from sqlalchemy import func
        from app.db.models import Chunk, Document
        from app.db.session import SessionLocal

        with SessionLocal() as db:
            row = (
                db.query(Chunk.embedding_dim, Chunk.embedding_model, func.count(Chunk.id).label("cnt"))
                .join(Document, Document.id == Chunk.document_id)
                .filter(Chunk.is_active.is_(True), Chunk.embedding_dim > 0, Document.is_active.is_(True))
                .group_by(Chunk.embedding_dim, Chunk.embedding_model)
                .order_by(func.count(Chunk.id).desc())
                .first()
            )
            if row:
                dim, chunk_model, _ = row[0], row[1], row[2]
                if chunk_model and chunk_model.startswith("fastembed:"):
                    return chunk_model.split("fastembed:", 1)[1]
                if dim == 384:
                    return "BAAI/bge-small-en-v1.5"
                if dim == 768:
                    return "BAAI/bge-base-en-v1.5"
    except Exception:
        pass
    return settings.embedding_model


def get_embedding_provider(force_configured: bool = False) -> EmbeddingProvider:
    global _provider
    if _provider is not None and not force_configured:
        return _provider
    with _lock:
        if _provider is not None and not force_configured:
            return _provider
        provider_name = (settings.embedding_provider or "fastembed").lower()
        target_model = settings.embedding_model if force_configured else _detect_corpus_model()
        try:
            if provider_name in {"fastembed", "sentence_transformers", "sentence-transformers"}:
                if provider_name == "fastembed":
                    from app.embeddings.fastembed_provider import FastEmbedProvider

                    try:
                        _provider = FastEmbedProvider(target_model)
                    except Exception:
                        if target_model != "BAAI/bge-small-en-v1.5":
                            logger.warning(
                                "FastEmbed model %s unavailable locally; falling back to BAAI/bge-small-en-v1.5",
                                target_model,
                            )
                            _provider = FastEmbedProvider("BAAI/bge-small-en-v1.5")
                        else:
                            raise
                else:
                    from app.embeddings.sentence_transformer import SentenceTransformerProvider

                    _provider = SentenceTransformerProvider(target_model)
            elif provider_name == "hashing":
                _provider = HashingEmbeddingProvider(settings.embedding_dim or 384)
            else:
                raise ValueError(f"Unknown embedding provider: {provider_name}")
        except Exception as exc:
            logger.exception("Configured embedding provider unavailable; falling back to hashing")
            fallback = HashingEmbeddingProvider(settings.embedding_dim or 384)
            fallback.name = f"{fallback.name}:after-error"
            _provider = fallback
            _provider.fallback_reason = str(exc)  # type: ignore[attr-defined]
        return _provider


def reset_embedding_provider() -> None:
    global _provider
    with _lock:
        _provider = None
