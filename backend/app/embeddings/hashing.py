import hashlib
import math
import re

from app.embeddings.base import EmbeddingProvider

TOKEN_RE = re.compile(r"[a-z0-9]+")


class HashingEmbeddingProvider(EmbeddingProvider):
    """Deterministic offline fallback. Not a semantic model; labelled as such in metadata."""

    def __init__(self, dimension: int = 384) -> None:
        self.dimension = dimension
        self.name = f"hashing-fallback:{dimension}"

    def _vector(self, text: str) -> list[float]:
        vector = [0.0] * self.dimension
        tokens = TOKEN_RE.findall(text.lower())
        if not tokens:
            return vector
        features: list[str] = []
        for token in tokens:
            features.append(token)
            padded = f"^{token}$"
            for i in range(len(padded) - 2):
                features.append(padded[i : i + 3])
        for feature in features:
            digest = hashlib.blake2b(feature.encode("utf-8"), digest_size=8).digest()
            index = int.from_bytes(digest[:4], "little") % self.dimension
            sign = 1.0 if digest[4] % 2 == 0 else -1.0
            vector[index] += sign
        norm = math.sqrt(sum(value * value for value in vector)) or 1.0
        return [value / norm for value in vector]

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [self._vector(text) for text in texts]

    def embed_query(self, text: str) -> list[float]:
        return self._vector(text)
