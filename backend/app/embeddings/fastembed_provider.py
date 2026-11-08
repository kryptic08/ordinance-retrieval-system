import logging
import threading

from app.embeddings.base import EmbeddingProvider

logger = logging.getLogger(__name__)


class FastEmbedProvider(EmbeddingProvider):
    def __init__(self, model_name: str) -> None:
        from fastembed import TextEmbedding

        self.name = f"fastembed:{model_name}"
        self._model = TextEmbedding(model_name=model_name)
        self._lock = threading.Lock()
        probe = list(self._model.embed(["dimension probe"]))[0]
        self.dimension = len(probe)
        logger.info("Loaded embedding model %s (%d dimensions)", self.name, self.dimension)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        with self._lock:
            vectors = [list(map(float, vector)) for vector in self._model.embed(texts)]
        return vectors

    def embed_query(self, text: str) -> list[float]:
        with self._lock:
            try:
                vector = list(self._model.query_embed(text))[0]
            except Exception:
                vector = list(self._model.embed([text]))[0]
        return list(map(float, vector))
