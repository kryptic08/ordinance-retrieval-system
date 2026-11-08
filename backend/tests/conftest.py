import os
import shutil
import tempfile
from pathlib import Path

import pytest

TEST_ROOT = Path(tempfile.mkdtemp(prefix="ors-tests-"))
DATA_DIR = TEST_ROOT / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)

os.environ.update(
    {
        "ENVIRONMENT": "test",
        "SECRET_KEY": "test-secret-key-for-automated-tests-only",
        "DATABASE_URL": f"sqlite:///{(TEST_ROOT / 'test.db').as_posix()}",
        "DATA_DIR": str(DATA_DIR),
        "WORKER_ENABLED": "false",
        "EMBEDDING_PROVIDER": "hashing",
        "EMBEDDING_DIM": "384",
        "OCR_ENABLED": "true",
        "CHUNK_MIN_CHARS": "20",
        "RATE_LIMIT_SEARCH_PER_MINUTE": "1000",
        "ADMIN_EMAIL": "admin@example.com",
        "ADMIN_PASSWORD": "AdminPass123!",
        "ADMIN_NAME": "Test Administrator",
    }
)

import fitz
from fastapi.testclient import TestClient

from app.core.config import settings
from app.db.init_db import init_db
from app.db.models import Base
from app.db.session import SessionLocal, engine
from app.ingestion.pipeline import process_job_by_id
from app.main import app


def reset_database() -> None:
    Base.metadata.drop_all(engine)
    with engine.begin() as connection:
        connection.exec_driver_sql("DROP TABLE IF EXISTS chunk_fts")
    for path in (settings.originals_path, settings.processed_path):
        if path.exists():
            shutil.rmtree(path, ignore_errors=True)
    settings.ensure_dirs()
    init_db()


@pytest.fixture()
def client():
    reset_database()
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture()
def admin_client(client):
    response = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "AdminPass123!"},
    )
    assert response.status_code == 200, response.text
    return client


def write_pdf(path: Path, pages: list[list[str]]) -> Path:
    document = fitz.open()
    for lines in pages:
        page = document.new_page(width=595, height=842)
        y = 60
        for line in lines:
            if y > 800:
                break
            page.insert_text((54, y), line, fontsize=10, fontname="helv")
            y += 16
    document.save(path)
    document.close()
    return path


def digital_pdf(path: Path, ordinance_number: str = "2024-09", title_suffix: str = "") -> Path:
    pages = [
        [
            "REPUBLIC OF THE PHILIPPINES",
            "CITY OF TESTVILLE",
            "SANGGUNIANG PANLUNGSOD",
            f"ORDINANCE NO. {ordinance_number}",
            "AN ORDINANCE REGULATING THE OPERATION OF BUSINESS ESTABLISHMENTS AFTER MIDNIGHT",
            f"AND PROVIDING PENALTIES FOR VIOLATION{title_suffix}",
            "WHEREAS, the City recognizes the need to balance commerce and public order;",
            "BE IT ENACTED by the Sangguniang Panlungsod in session assembled:",
        ],
        [
            "SECTION 1. Definition of Terms. For purposes of this Ordinance, business establishment",
            "refers to any commercial enterprise operating within the City.",
            "SECTION 2. Curfew for Business Operations. No business establishment shall operate",
            "between twelve o'clock midnight and four o'clock in the morning, except drugstores,",
            "hospitals, and establishments with a special permit.",
            "SECTION 3. Penalties. Any violation of this Ordinance shall be punished by a fine of",
            "Five Thousand Pesos (PHP 5,000.00) and revocation of the business permit for a",
            "second offense.",
        ],
        [
            "SECTION 4. Effectivity. This Ordinance shall take effect upon its approval.",
            "RESPECTFULLY YOURS,",
            "HON. JUAN DELA CRUZ",
            "City Mayor",
            "APPROVED:",
            "MARIA SANTOS",
            "City Vice Mayor",
        ],
    ]
    return write_pdf(path, pages)


def upload_and_process(
    client: TestClient,
    pdf_path: Path,
    *,
    fields: dict[str, str] | None = None,
    expect_ok: bool = True,
) -> dict:
    data = fields or {}
    with pdf_path.open("rb") as handle:
        response = client.post(
            "/api/admin/documents/upload",
            files={"files": (pdf_path.name, handle.read(), "application/pdf")},
            data=data,
        )
    assert response.status_code == 201, response.text
    item = response.json()["items"][0]
    assert item["ok"] is expect_ok, item
    if not expect_ok:
        return item
    process_job_by_id(item["job"]["id"])
    detail = client.get(f"/api/admin/documents/{item['document']['id']}")
    assert detail.status_code == 200, detail.text
    return detail.json()
