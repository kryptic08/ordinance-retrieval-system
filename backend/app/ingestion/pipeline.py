import logging
import re
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import delete
from sqlalchemy.orm import Session

from app.chunking.chunker import build_chunks
from app.chunking.parser import parse_sections
from app.core.config import settings
from app.db.models import (
    Chunk,
    Document,
    DocumentVersion,
    Page,
    ProcessingJob,
    Section,
    Signatory,
)
from app.db.session import SessionLocal
from app.embeddings.registry import get_embedding_provider
from app.ingestion.extract import ExtractionResult, PageExtraction, extract_pdf
from app.ingestion.ocr_helper import clean_and_format_ocr_text
from app.ingestion.signatures import extract_signatories, split_signature_block
from app.retrieval.vector_index import invalidate_vector_index
from app.services.gemini_ocr import is_gemini_available, refine_text_with_gemini
from app.services.runtime_settings import chunking_config
from app.services.storage import (
    document_processed_dir,
    dispose_original_pdf,
    dispose_rendered_pages,
    load_document_pdf_bytes,
    purge_ephemeral_artifacts,
    resolve_stored,
)

logger = logging.getLogger(__name__)


class IngestionError(RuntimeError):
    pass


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _append_log(job: ProcessingJob, message: str) -> None:
    stamp = _utcnow().strftime("%Y-%m-%d %H:%M:%S")
    job.logs = (job.logs or "") + f"[{stamp}] {message}\n"


def _stage(db: Session, job: ProcessingJob, stage: str, progress: int, message: str) -> None:
    job.stage = stage
    job.progress = progress
    _append_log(job, message)
    db.commit()


def _write_text(relative_dir: Path, document_id: str, version_no: int, name: str, text: str) -> str:
    base = document_processed_dir(document_id) / f"v{version_no}"
    base.mkdir(parents=True, exist_ok=True)
    target = base / name
    target.write_text(text, encoding="utf-8")
    return target.relative_to(settings.data_dir).as_posix()


def _pages_from_version(db: Session, version: DocumentVersion) -> tuple[list[PageExtraction], bool]:
    old_pages = db.query(Page).filter(Page.version_id == version.id).order_by(Page.page_number).all()
    pages: list[PageExtraction] = []
    ocr_used = False
    for page in old_pages:
        source_text = page.corrected_text if page.corrected_text is not None else page.normalized_text
        body, signature = split_signature_block(source_text)
        pages.append(
            PageExtraction(
                page_number=page.page_number,
                width=page.width,
                height=page.height,
                rotation=page.rotation,
                raw_text=page.raw_text,
                normalized_text=source_text,
                body_text=body,
                signature_text=signature,
                has_text=bool(source_text.strip()),
                is_scanned=page.is_scanned,
                text_source=page.text_source,
                page_type="signature" if signature else page.page_type,
                ocr_confidence=page.ocr_confidence,
                image_path=page.image_path,
                warnings=list(page.warnings or []),
            )
        )
        ocr_used = ocr_used or page.text_source in {"ocr", "mixed"}
    return pages, ocr_used


def _fill_metadata(doc: Document, metadata: dict) -> None:
    filename_stem = Path(doc.original_filename).stem
    if metadata.get("title") and (not doc.title or doc.title.strip() == filename_stem):
        doc.title = str(metadata["title"])[:600]
    for field in ("ordinance_number", "document_type", "date_enacted", "year", "jurisdiction", "lgu"):
        value = metadata.get(field)
        if value in (None, "", 0):
            continue
        current = getattr(doc, field)
        if current in (None, "", 0):
            setattr(doc, field, value)


def _delete_version(db: Session, version: DocumentVersion) -> None:
    db.execute(delete(Chunk).where(Chunk.version_id == version.id))
    db.execute(delete(Section).where(Section.version_id == version.id))
    db.execute(delete(Page).where(Page.version_id == version.id))
    db.execute(delete(DocumentVersion).where(DocumentVersion.id == version.id))
    db.commit()


def _persist_version(
    db: Session,
    doc: Document,
    job: ProcessingJob,
    pages: list[PageExtraction],
    signatories,
    metadata: dict,
    ocr_used: bool,
    extraction_method: str,
    previous_version: DocumentVersion | None,
) -> DocumentVersion:
    version_no = 1
    if previous_version:
        version_no = previous_version.version_no + 1
    version = DocumentVersion(
        document_id=doc.id,
        version_no=version_no,
        extraction_method=extraction_method,
        ocr_used=ocr_used,
        settings_json={
            "ocr_enabled": settings.ocr_enabled,
            "ocr_lang": settings.ocr_lang,
            "ocr_dpi": settings.ocr_dpi,
            "chunk_max_chars": settings.chunk_max_chars,
            "chunk_overlap_chars": settings.chunk_overlap_chars,
            "embedding_provider": settings.embedding_provider,
            "embedding_model": settings.embedding_model,
        },
        is_current=True,
        checksum=doc.checksum,
    )
    db.add(version)
    db.flush()

    raw_combined: list[str] = []
    normalized_combined: list[str] = []
    for page in pages:
        raw_combined.append(f"===== PAGE {page.page_number} =====\n{page.raw_text}")
        normalized_combined.append(f"===== PAGE {page.page_number} =====\n{page.normalized_text}")
        db.add(
            Page(
                document_id=doc.id,
                version_id=version.id,
                page_number=page.page_number,
                width=page.width,
                height=page.height,
                rotation=page.rotation,
                has_text=page.has_text,
                is_scanned=page.is_scanned,
                text_source=page.text_source,
                page_type=page.page_type,
                raw_text=page.raw_text,
                normalized_text=page.normalized_text,
                signature_text=page.signature_text,
                ocr_confidence=page.ocr_confidence,
                image_path=page.image_path,
                warnings=page.warnings,
            )
        )
    db.flush()

    if not settings.dispose_originals:
        version.raw_text_path = _write_text(
            settings.processed_path, doc.id, version_no, "raw.txt", "\n\n".join(raw_combined)
        )
        version.normalized_text_path = _write_text(
            settings.processed_path, doc.id, version_no, "normalized.txt", "\n\n".join(normalized_combined)
        )

    # Enrich document metadata prior to chunking so legal context preambles include Ordinance No., Year, and Jurisdiction
    _fill_metadata(doc, metadata)

    _stage(db, job, "chunking", 55, f"Parsing sections from {len(pages)} pages")

    drafts = parse_sections(
        [(page.page_number, page.body_text, page.page_type) for page in pages]
    )
    if not drafts:
        raise IngestionError("No indexable legal text could be parsed from this document.")

    section_rows: dict[str, Section] = {}
    gemini_on = is_gemini_available()
    for order, draft in enumerate(drafts):
        cleaned = clean_and_format_ocr_text(draft.text)
        if gemini_on:
            cleaned = refine_text_with_gemini(cleaned, doc.title)
        draft.text = cleaned
        row = Section(
            document_id=doc.id,
            version_id=version.id,
            stable_key=draft.stable_key,
            section_number=draft.section_number,
            heading=clean_and_format_ocr_text(draft.heading) if draft.heading else None,
            section_type=draft.section_type,
            level=draft.level,
            page_start=draft.page_start,
            page_end=draft.page_end,
            order_index=order,
            raw_text=draft.text,
            normalized_text=cleaned,
            corrected_text=cleaned if gemini_on else None,
            verification_status="corrected" if gemini_on else "unverified",
        )
        db.add(row)
        section_rows[draft.stable_key] = row
    db.flush()

    heading_by_key = {draft.stable_key: draft.heading for draft in drafts}
    parent_by_key = {draft.stable_key: draft.parent_key for draft in drafts}
    for draft in drafts:
        row = section_rows[draft.stable_key]
        parent_key = parent_by_key.get(draft.stable_key)
        if parent_key and parent_key in section_rows:
            row.parent_id = section_rows[parent_key].id
    db.flush()

    _stage(db, job, "embedding", 65, "Building section-aware chunks")
    chunk_cfg = chunking_config(db)
    provider = get_embedding_provider()
    pending: list[tuple[Chunk, str]] = []
    for draft in drafts:
        if draft.section_type in {"chapter", "article"} and len(draft.text) < 120:
            continue
        parent_heading = heading_by_key.get(draft.parent_key) if draft.parent_key else None
        chunks = build_chunks(
            draft,
            document_title=doc.title,
            parent_heading=parent_heading,
            max_chars=chunk_cfg["max_chars"],
            overlap=chunk_cfg["overlap_chars"],
            min_chars=chunk_cfg["min_chars"],
            ordinance_number=doc.ordinance_number,
            document_type=doc.document_type,
            year=doc.year,
            jurisdiction=doc.jurisdiction or doc.lgu,
        )
        for chunk_draft in chunks:
            chunk = Chunk(
                section_id=section_rows[draft.stable_key].id,
                document_id=doc.id,
                version_id=version.id,
                chunk_key=chunk_draft.chunk_key,
                chunk_index=chunk_draft.chunk_index,
                section_number=draft.section_number,
                heading=draft.heading,
                subsection=chunk_draft.subsection,
                page_start=chunk_draft.page_start,
                page_end=chunk_draft.page_end,
                display_text=chunk_draft.text,
                embedding_text=chunk_draft.embedding_text,
                embedding=[],
                embedding_dim=0,
                embedding_model=provider.name,
                is_active=True,
            )
            db.add(chunk)
            pending.append((chunk, chunk_draft.embedding_text))
    if not pending:
        raise IngestionError("No searchable chunks were produced from this document.")
    db.flush()

    for start in range(0, len(pending), settings.embedding_batch_size):
        batch = pending[start : start + settings.embedding_batch_size]
        vectors = provider.embed_documents([text for _chunk, text in batch])
        for (chunk, _text), vector in zip(batch, vectors, strict=True):
            chunk.embedding = [round(value, 6) for value in vector]
            chunk.embedding_dim = len(vector)
        progress = 65 + int(30 * min(start + len(batch), len(pending)) / len(pending))
        _stage(db, job, "embedding", progress, f"Embedded {start + len(batch)}/{len(pending)} chunks")

    if not doc.signatories:
        for draft in signatories:
            db.add(
                Signatory(
                    document_id=doc.id,
                    page_number=draft.page_number,
                    name=draft.name,
                    title=draft.title,
                    role=draft.role,
                    confidence=draft.confidence,
                    method=draft.method,
                    verified=False,
                    notes=draft.notes,
                )
            )

    doc.page_count = len(pages)
    doc.embedding_model = provider.name
    doc.embedding_dim = provider.dimension
    doc.processing_error = None
    doc.updated_at = _utcnow()

    # Ephemeral cleanup: dispose bulky rendered page images and original PDF stream/files
    purge_ephemeral_artifacts(doc.id)
    if settings.dispose_originals:
        doc.stored_path = ""

    page_warnings = [warning for page in pages for warning in page.warnings]
    needs_review = ocr_used or bool(page_warnings) or bool(signatories)
    doc.status = "needs_review" if needs_review else "processed"
    # Ensure freshly uploaded documents are immediately active and searchable
    doc.is_active = True
    _stage(
        db,
        job,
        "finalizing",
        98,
        f"Indexed {len(pending)} chunks across {len(drafts)} sections; document status={doc.status} (ephemeral storage cleanup applied)",
    )
    db.commit()
    invalidate_vector_index()
    return version


def run_ingestion_job(db: Session, job: ProcessingJob) -> None:
    doc = db.get(Document, job.document_id)
    if not doc:
        raise IngestionError("Document not found for processing job.")

    doc_id = doc.id
    job.status = "running"
    job.started_at = _utcnow()
    job.attempts += 1
    job.error = None
    _append_log(job, f"Started {job.job_type} job (attempt {job.attempts}/{job.max_attempts})")
    db.commit()

    previous = (
        db.query(DocumentVersion)
        .filter(DocumentVersion.document_id == doc.id, DocumentVersion.is_current.is_(True))
        .order_by(DocumentVersion.version_no.desc())
        .first()
    )
    mode = (job.settings_json or {}).get("mode", "extract")
    created_version: DocumentVersion | None = None
    succeeded = False
    try:
        doc.status = "processing"
        db.commit()

        if mode == "reindex" and previous:
            _stage(db, job, "reindexing", 15, f"Reindexing from version {previous.version_no}")
            pages, ocr_used = _pages_from_version(db, previous)
            metadata = {
                "ordinance_number": doc.ordinance_number,
                "title": doc.title,
                "date_enacted": doc.date_enacted,
                "year": doc.year,
                "jurisdiction": doc.jurisdiction,
                "lgu": doc.lgu,
            }
            extraction_method = f"reindex-from-v{previous.version_no}"
            signatories = []
        else:
            _stage(db, job, "inspecting", 8, "Inspecting PDF pages and text layer (ephemeral stream)")
            pdf_bytes, pdf_filename = load_document_pdf_bytes(doc.id, doc.stored_path)
            try:
                result: ExtractionResult = extract_pdf(pdf_bytes, doc.id, filename=pdf_filename)
            finally:
                del pdf_bytes
            pages = result.pages
            ocr_used = result.ocr_used
            metadata = result.metadata
            signatories = result.signatories
            extraction_method = "pymupdf+ocr" if ocr_used else "pymupdf"
            _stage(
                db,
                job,
                "extracting",
                35,
                f"Extracted {result.page_count} pages; OCR used={ocr_used}; "
                f"{len(result.warnings)} document warning(s)",
            )

        if previous:
            previous.is_current = False
            db.query(Chunk).filter(Chunk.document_id == doc.id).update({Chunk.is_active: False})
        db.flush()

        created_version = _persist_version(
            db,
            doc,
            job,
            pages,
            signatories,
            metadata,
            ocr_used,
            extraction_method,
            previous,
        )

        job.status = "succeeded"
        job.stage = "completed"
        job.progress = 100
        job.finished_at = _utcnow()
        _append_log(job, "Processing completed successfully")
        db.commit()
        succeeded = True
    except Exception as exc:
        logger.exception("Document ingestion failed for %s", doc_id)
        db.rollback()
        if created_version is not None:
            try:
                _delete_version(db, created_version)
            except Exception:
                logger.exception("Failed to clean up partial version")
        if previous:
            previous.is_current = True
            db.query(Chunk).filter(Chunk.document_id == doc_id, Chunk.version_id == previous.id).update(
                {Chunk.is_active: True}
            )
        doc = db.get(Document, job.document_id)
        if doc:
            doc.status = "failed"
            doc.is_active = False
            doc.processing_error = str(exc)[:2000]
            if job.attempts >= job.max_attempts and settings.dispose_originals:
                doc.stored_path = ""
        job.status = "failed"
        job.stage = "failed"
        job.error = str(exc)[:2000]
        job.finished_at = _utcnow()
        _append_log(job, f"Failed: {exc}")
        db.commit()
        invalidate_vector_index()
        raise
    finally:
        # Strict Zero-Retention Guarantee: always purge rendered page images, and purge raw PDF
        # upon completion or once retry attempts are exhausted.
        if settings.dispose_page_images:
            dispose_rendered_pages(doc_id)
        if succeeded or job.attempts >= job.max_attempts:
            purge_ephemeral_artifacts(doc_id)


def process_job_by_id(job_id: str) -> None:
    with SessionLocal() as db:
        job = db.get(ProcessingJob, job_id)
        if not job or job.status not in {"queued", "failed"}:
            return
        if job.attempts >= job.max_attempts:
            job.status = "failed"
            job.error = job.error or "Maximum attempts reached"
            purge_ephemeral_artifacts(job.document_id)
            db.commit()
            return
        try:
            run_ingestion_job(db, job)
        except Exception:
            pass
