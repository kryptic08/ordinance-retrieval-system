import logging
from datetime import datetime, timezone

from sqlalchemy import text

from app.core.config import settings
from app.core.security import hash_password
from app.db.models import Base, User
from app.db.session import SessionLocal, engine

logger = logging.getLogger(__name__)

SCHEMA_VERSION = 1

FTS_DDL = [
    """
    CREATE VIRTUAL TABLE IF NOT EXISTS chunk_fts USING fts5(
        chunk_key UNINDEXED,
        heading,
        section_number,
        content,
        tokenize='unicode61 remove_diacritics 2'
    )
    """,
    """
    CREATE TRIGGER IF NOT EXISTS chunks_ai AFTER INSERT ON chunks BEGIN
        INSERT INTO chunk_fts(rowid, chunk_key, heading, section_number, content)
        VALUES (new.rowid, new.chunk_key, coalesce(new.heading,''), coalesce(new.section_number,''), new.display_text);
    END
    """,
    """
    CREATE TRIGGER IF NOT EXISTS chunks_ad AFTER DELETE ON chunks BEGIN
        DELETE FROM chunk_fts WHERE rowid = old.rowid;
    END
    """,
    """
    CREATE TRIGGER IF NOT EXISTS chunks_au AFTER UPDATE OF display_text, heading, section_number ON chunks BEGIN
        DELETE FROM chunk_fts WHERE rowid = old.rowid;
        INSERT INTO chunk_fts(rowid, chunk_key, heading, section_number, content)
        VALUES (new.rowid, new.chunk_key, coalesce(new.heading,''), coalesce(new.section_number,''), new.display_text);
    END
    """,
]


def _fts_available(db) -> bool:
    try:
        row = db.execute(text("SELECT sqlite_compileoption_used('ENABLE_FTS5')")).scalar()
        return bool(row)
    except Exception:
        return False


def init_db() -> None:
    settings.ensure_dirs()
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as db:
        if engine.dialect.name == "sqlite" and _fts_available(db):
            for statement in FTS_DDL:
                db.execute(text(statement))
            db.commit()
        else:
            logger.warning("SQLite FTS5 unavailable; keyword search will use a LIKE fallback.")

        admin = db.query(User).filter(User.email == settings.admin_email).first()
        if not admin:
            admin = User(
                email=settings.admin_email,
                full_name=settings.admin_name,
                password_hash=hash_password(settings.admin_password),
                role="admin",
            )
            db.add(admin)
            db.commit()
            logger.info("Seeded initial administrator %s", settings.admin_email)

        db.execute(
            text(
                "CREATE TABLE IF NOT EXISTS schema_migrations "
                "(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)"
            )
        )
        exists = db.execute(text("SELECT 1 FROM schema_migrations WHERE version=:v"), {"v": SCHEMA_VERSION}).first()
        if not exists:
            db.execute(
                text("INSERT INTO schema_migrations(version, applied_at) VALUES (:v, :t)"),
                {"v": SCHEMA_VERSION, "t": datetime.now(timezone.utc).isoformat()},
            )
        db.commit()
