import os
from functools import lru_cache
from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(PROJECT_ROOT / ".env"), str(PROJECT_ROOT / "backend" / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Ordinance Retrieval System"
    environment: str = "development"
    api_prefix: str = "/api/v1"
    static_dir: Path | None = None

    secret_key: str = "insecure-development-key-change-me"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    database_url: str = f"sqlite:///{(PROJECT_ROOT / 'data' / 'ordinance.db').as_posix()}"
    data_dir: Path = PROJECT_ROOT / "data"
    originals_dir: Path | None = None
    processed_dir: Path | None = None

    max_upload_mb: int = 50
    allowed_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Ephemeral storage: when True, original PDFs and rendered page image files are cleaned up after OCR/indexing
    dispose_originals: bool = True
    dispose_page_images: bool = True

    tesseract_cmd: str = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    ocr_enabled: bool = True
    ocr_lang: str = "eng"
    ocr_dpi: int = 350
    ocr_min_chars: int = 40
    ocr_timeout_seconds: int = 180
    gemini_api_key: str = ""

    embedding_provider: str = "fastembed"
    embedding_model: str = "BAAI/bge-small-en-v1.5"
    embedding_dim: int = 0
    embedding_batch_size: int = 32

    chunk_max_chars: int = 1400
    chunk_overlap_chars: int = 180
    chunk_min_chars: int = 120

    retrieval_top_k: int = 10
    retrieval_candidate_limit: int = 400
    retrieval_min_score: float = 0.18
    retrieval_vector_min_score: float = 0.38
    vector_weight: float = 0.58
    keyword_weight: float = 0.42
    rerank_enabled: bool = True
    rate_limit_search_per_minute: int = 60

    worker_enabled: bool = True
    worker_poll_seconds: float = 1.5
    worker_max_attempts: int = 2

    admin_email: str = "admin@example.com"
    admin_password: str = "AdminPass123!"
    admin_name: str = "System Administrator"

    @model_validator(mode="after")
    def _resolve_paths(self):
        # Automatically adapt to Vercel Serverless environment (writable /tmp filesystem, disable worker threads)
        if os.environ.get("VERCEL"):
            self.data_dir = Path("/tmp/data")
            self.database_url = "sqlite:////tmp/ordinance.db"
            self.worker_enabled = False
            self.ocr_enabled = False
            self.allowed_origins = "*"

        if not self.gemini_api_key:
            self.gemini_api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or ""

        prefix = "sqlite:///"
        if self.database_url.startswith(prefix):
            raw = self.database_url[len(prefix) :]
            if raw not in {"", ":memory:"}:
                path = Path(raw)
                if not path.is_absolute():
                    path = (PROJECT_ROOT / raw).resolve()
                self.database_url = f"{prefix}{path.as_posix()}"
        for field in ("data_dir", "originals_dir", "processed_dir", "static_dir"):
            value = getattr(self, field)
            if value is not None and not Path(value).is_absolute():
                setattr(self, field, (PROJECT_ROOT / value).resolve())
        return self

    @property
    def static_path(self) -> Path:
        if self.static_dir:
            return Path(self.static_dir)
        for candidate in (
            PROJECT_ROOT / "static",
            PROJECT_ROOT / "backend" / "static",
            PROJECT_ROOT / "frontend" / "out",
            PROJECT_ROOT / "frontend" / "dist",
        ):
            if candidate.exists():
                return candidate
        return PROJECT_ROOT / "frontend" / "out"

    @property
    def originals_path(self) -> Path:
        return self.originals_dir or (self.data_dir / "originals")

    @property
    def processed_path(self) -> Path:
        return self.processed_dir or (self.data_dir / "processed")

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    def ensure_dirs(self) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        if not self.dispose_originals:
            self.originals_path.mkdir(parents=True, exist_ok=True)
        if not self.dispose_page_images or not self.dispose_originals:
            self.processed_path.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.ensure_dirs()
    return settings


settings = get_settings()
