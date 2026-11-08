import hashlib
import re
import shutil
import threading
from pathlib import Path

from app.core.config import settings

SAFE_NAME = re.compile(r"[^A-Za-z0-9._\- ]+")

_EPHEMERAL_LOCK = threading.Lock()
_EPHEMERAL_PDF_STORE: dict[str, bytes] = {}


class StorageError(ValueError):
    pass


def sanitize_filename(filename: str) -> str:
    name = Path(filename).name
    name = SAFE_NAME.sub("_", name).strip(" .")
    if not name:
        name = "document.pdf"
    if len(name) > 180:
        stem = Path(name).stem[:150]
        name = f"{stem}.pdf"
    if not name.lower().endswith(".pdf"):
        name += ".pdf"
    return name


def checksum_bytes(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def checksum_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def validate_pdf(content: bytes) -> None:
    if len(content) < 5 or content[:5] != b"%PDF-":
        raise StorageError("Uploaded file is not a valid PDF (missing PDF header).")
    if b"%%EOF" not in content[-4096:]:
        raise StorageError("Uploaded file appears truncated or is not a complete PDF.")


def document_original_dir(document_id: str) -> Path:
    path = settings.originals_path / document_id
    if not settings.dispose_originals:
        path.mkdir(parents=True, exist_ok=True)
    return path


def document_processed_dir(document_id: str) -> Path:
    path = settings.processed_path / document_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def put_ephemeral_pdf(document_id: str, content: bytes) -> None:
    """Stores raw PDF bytes in volatile RAM for zero-retention ingestion."""
    with _EPHEMERAL_LOCK:
        _EPHEMERAL_PDF_STORE[document_id] = content


def get_ephemeral_pdf(document_id: str) -> bytes | None:
    """Retrieves raw PDF bytes from volatile RAM without removing them yet."""
    with _EPHEMERAL_LOCK:
        return _EPHEMERAL_PDF_STORE.get(document_id)


def pop_ephemeral_pdf(document_id: str) -> bytes | None:
    """Removes and returns raw PDF bytes from volatile RAM."""
    with _EPHEMERAL_LOCK:
        return _EPHEMERAL_PDF_STORE.pop(document_id, None)


def save_original(document_id: str, filename: str, content: bytes) -> str:
    safe = sanitize_filename(filename)
    if settings.dispose_originals:
        put_ephemeral_pdf(document_id, content)
        return f"ephemeral://{document_id}/{safe}"
    target = document_original_dir(document_id) / safe
    if target.exists():
        target = target.with_name(f"{target.stem}-{checksum_bytes(content)[:8]}.pdf")
    target.write_bytes(content)
    return target.relative_to(settings.data_dir).as_posix()


def load_document_pdf_bytes(document_id: str, stored_path: str | None) -> tuple[bytes, str]:
    """Loads PDF bytes from in-memory ephemeral buffer or fallback disk path."""
    ephemeral = get_ephemeral_pdf(document_id)
    filename = "document.pdf"
    if stored_path:
        filename = Path(stored_path.replace("ephemeral://", "")).name or "document.pdf"
    if ephemeral is not None:
        return ephemeral, filename
    if not stored_path or stored_path.startswith("ephemeral://"):
        raise FileNotFoundError(
            f"Ephemeral PDF stream for document {document_id} is no longer in memory."
        )
    path = resolve_stored(stored_path)
    if not path.exists():
        raise FileNotFoundError(f"Original PDF not found: {path.name}")
    return path.read_bytes(), path.name


def resolve_stored(relative_path: str) -> Path:
    if not relative_path or relative_path.startswith("ephemeral://"):
        raise StorageError("Ephemeral stream has no persistent disk path.")
    path = (settings.data_dir / relative_path).resolve()
    data_root = settings.data_dir.resolve()
    if data_root not in path.parents and path != data_root:
        raise StorageError("Invalid stored path.")
    return path


def delete_document_files(document_id: str) -> None:
    pop_ephemeral_pdf(document_id)
    for base in (settings.originals_path, settings.processed_path):
        target = (base / document_id).resolve()
        if target.exists() and base.resolve() in target.parents:
            shutil.rmtree(target, ignore_errors=True)


def dispose_original_pdf(document_id: str) -> None:
    """Disposes original PDF from both volatile memory and disk to prevent storage bloat."""
    pop_ephemeral_pdf(document_id)
    target = (settings.originals_path / document_id).resolve()
    if target.exists() and settings.originals_path.resolve() in target.parents:
        shutil.rmtree(target, ignore_errors=True)


def dispose_rendered_pages(document_id: str) -> None:
    """Disposes raw page PNGs rendered for OCR after text has been extracted."""
    target = (settings.processed_path / document_id / "pages").resolve()
    if target.exists() and settings.processed_path.resolve() in target.parents:
        shutil.rmtree(target, ignore_errors=True)
    # Also remove document processed dir if empty
    doc_proc = (settings.processed_path / document_id).resolve()
    if doc_proc.exists() and settings.processed_path.resolve() in doc_proc.parents:
        try:
            if not any(doc_proc.iterdir()):
                doc_proc.rmdir()
        except OSError:
            pass


def purge_ephemeral_artifacts(document_id: str) -> None:
    """Guaranteed cleanup of ephemeral PDF streams and temporary OCR images."""
    if settings.dispose_originals:
        dispose_original_pdf(document_id)
    else:
        pop_ephemeral_pdf(document_id)
    if settings.dispose_page_images:
        dispose_rendered_pages(document_id)

