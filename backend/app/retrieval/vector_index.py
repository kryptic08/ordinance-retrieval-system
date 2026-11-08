"""
Pre-normalized in-memory vector similarity index with disk persistence and automatic cache invalidation.
Eliminates per-request JSON deserialization and matrix normalization bottlenecks during semantic search.
"""

from __future__ import annotations

import json
import logging
import threading
from pathlib import Path

import numpy as np
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.config import settings

logger = logging.getLogger(__name__)


class VectorIndexCache:
    """Thread-safe cosine similarity vector index backed by pre-normalized float32 NumPy arrays."""

    def __init__(self) -> None:
        self._lock = threading.RLock()
        self._chunk_ids: list[str] = []
        self._id_to_idx: dict[str, int] = {}
        self._matrix: np.ndarray | None = None  # Shape: (N, D), L2-normalized rows
        self._dim: int = 0
        self._signature: tuple[int, str] | None = None

    @property
    def _cache_file(self) -> Path:
        return settings.data_dir / "vector_index_cache.npz"

    def invalidate(self) -> None:
        """Marks the in-memory vector index stale and removes disk cache."""
        with self._lock:
            self._signature = None
            self._matrix = None
            self._chunk_ids = []
            self._id_to_idx = {}
            self._dim = 0
            try:
                if self._cache_file.exists():
                    self._cache_file.unlink(missing_ok=True)
            except OSError:
                pass

    def _compute_db_signature(self, db: Session) -> tuple[int, str]:
        row = db.execute(
            text(
                """
                SELECT COUNT(c.id) AS cnt, COALESCE(MAX(c.id), '') AS max_id
                FROM chunks c
                JOIN documents d ON d.id = c.document_id
                WHERE c.is_active = 1
                  AND c.embedding_dim > 0
                  AND d.is_active = 1
                  AND d.status IN ('processed', 'needs_review')
                """
            )
        ).first()
        if not row:
            return (0, "")
        return (int(row.cnt or 0), str(row.max_id or ""))

    def _rebuild(self, db: Session, signature: tuple[int, str]) -> None:
        rows = db.execute(
            text(
                """
                SELECT c.id AS chunk_id, c.embedding AS embedding, c.embedding_dim AS dim
                FROM chunks c
                JOIN documents d ON d.id = c.document_id
                WHERE c.is_active = 1
                  AND c.embedding_dim > 0
                  AND d.is_active = 1
                  AND d.status IN ('processed', 'needs_review')
                ORDER BY c.id
                """
            )
        ).fetchall()

        parsed_rows: list[tuple[str, list[float]]] = []
        dim_counts: dict[int, int] = {}

        for row in rows:
            raw_emb = row.embedding
            if isinstance(raw_emb, str):
                try:
                    vec = json.loads(raw_emb)
                except Exception:
                    continue
            elif isinstance(raw_emb, (list, tuple)):
                vec = list(raw_emb)
            else:
                continue

            if not vec:
                continue
            d = len(vec)
            dim_counts[d] = dim_counts.get(d, 0) + 1
            parsed_rows.append((str(row.chunk_id), vec))

        if not parsed_rows or not dim_counts:
            self._chunk_ids = []
            self._id_to_idx = {}
            self._matrix = None
            self._dim = 0
            self._signature = signature
            return

        expected_dim = max(dim_counts.items(), key=lambda item: item[1])[0]
        chunk_ids = [cid for cid, vec in parsed_rows if len(vec) == expected_dim]
        vectors = [vec for _, vec in parsed_rows if len(vec) == expected_dim]

        matrix = np.asarray(vectors, dtype=np.float32)
        norms = np.linalg.norm(matrix, axis=1, keepdims=True)
        norms[norms == 0] = 1.0
        matrix = matrix / norms

        self._chunk_ids = chunk_ids
        self._id_to_idx = {cid: idx for idx, cid in enumerate(chunk_ids)}
        self._matrix = matrix
        self._dim = expected_dim
        self._signature = signature

        try:
            settings.data_dir.mkdir(parents=True, exist_ok=True)
            np.savez_compressed(
                self._cache_file,
                matrix=matrix,
                chunk_ids=np.asarray(chunk_ids, dtype=str),
                sig_count=np.asarray([signature[0]], dtype=np.int64),
                sig_max_id=np.asarray([signature[1]], dtype=str),
            )
        except Exception:
            logger.debug("Could not persist vector index cache to disk", exc_info=True)

    def _ensure_ready(self, db: Session) -> None:
        db_sig = self._compute_db_signature(db)
        if self._signature == db_sig:
            return
        self._rebuild(db, db_sig)

    def score_query(
        self,
        db: Session,
        query_vector: np.ndarray,
        allowed_chunk_ids: list[str] | None = None,
    ) -> dict[str, float]:
        """
        Computes cosine similarity scores between `query_vector` and active indexed chunks.
        Returns mapping of `chunk_id -> similarity_score` in [0.0, 1.0].
        """
        with self._lock:
            self._ensure_ready(db)
            if self._matrix is None or self._matrix.shape[0] == 0:
                return {}

            q_vec = np.asarray(query_vector, dtype=np.float32).ravel()
            if q_vec.shape[0] != self._dim:
                return {}

            q_norm = float(np.linalg.norm(q_vec))
            if q_norm == 0.0:
                return {}
            q_unit = q_vec / q_norm

            if allowed_chunk_ids is not None:
                valid_pairs = [
                    (cid, self._id_to_idx[cid])
                    for cid in allowed_chunk_ids
                    if cid in self._id_to_idx
                ]
                if not valid_pairs:
                    return {}
                target_ids = [pair[0] for pair in valid_pairs]
                indices = [pair[1] for pair in valid_pairs]
                sub_matrix = self._matrix[indices]
                similarities = sub_matrix @ q_unit
            else:
                target_ids = self._chunk_ids
                similarities = self._matrix @ q_unit

            return {
                cid: float(max(0.0, min(1.0, sim)))
                for cid, sim in zip(target_ids, similarities, strict=False)
            }


vector_index = VectorIndexCache()


def invalidate_vector_index() -> None:
    """Global helper to invalidate the cached vector index after corpus mutations."""
    vector_index.invalidate()
