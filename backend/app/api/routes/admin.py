import os
import shutil
import logging
from datetime import datetime, timezone
from pathlib import Path

import fitz
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import delete, func, or_
from sqlalchemy.orm import Session

from app.chunking.chunker import build_chunks
from app.chunking.parser import SectionDraft
from app.core.config import settings
from app.core.security import get_current_user, require_admin, require_reviewer
from app.db.models import (
    AuditLog,
    Chunk,
    Document,
    DocumentRelationship,
    DocumentVersion,
    Page,
    ProcessingJob,
    Section,
    Signatory,
    TextRevision,
    User,
)
from app.db.session import get_db
from app.embeddings.registry import get_embedding_provider
from app.ingestion.ocr import tesseract_available
from app.schemas.common import AuditOut, Message, Paginated
from app.schemas.documents import (
    BatchUploadResponse,
    DocumentDetail,
    DocumentSummary,
    DocumentUpdate,
    JobOut,
    PageCorrection,
    PageOut,
    RelationshipCreate,
    RelationshipOut,
    SectionCorrection,
    SignatoryUpdate,
    UploadItem,
)
from app.retrieval.vector_index import invalidate_vector_index
from app.services.audit import record_audit
from app.services.documents import current_version, detail, summary
from app.services.runtime_settings import (
    chunking_config,
    get_runtime_overrides,
    retrieval_config,
    set_runtime_overrides,
)
from app.services.storage import (
    StorageError,
    checksum_bytes,
    delete_document_files,
    document_original_dir,
    purge_ephemeral_artifacts,
    resolve_stored,
    sanitize_filename,
    save_original,
    validate_pdf,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/admin", tags=["administration"])


def _ip(request: Request) -> str | None:
    return request.client.host if request.client else None


def _job_payload(job: ProcessingJob) -> JobOut:
    return JobOut.model_validate(job)


@router.post("/documents/upload", response_model=BatchUploadResponse, status_code=201)
async def upload_documents(
    request: Request,
    files: list[UploadFile] = File(...),
    ordinance_number: str | None = Form(default=None),
    title: str | None = Form(default=None),
    document_type: str = Form(default="Ordinance"),
    year: int | None = Form(default=None),
    date_enacted: str | None = Form(default=None),
    lgu: str | None = Form(default=None),
    jurisdiction: str | None = Form(default=None),
    subject: str | None = Form(default=None),
    category: str | None = Form(default=None),
    publication_status: str | None = Form(default=None),
    source_url: str | None = Form(default=None),
    notes: str | None = Form(default=None),
    is_active: bool = Form(default=True),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    if not files:
        raise HTTPException(status_code=400, detail="At least one PDF file is required")
    max_bytes = settings.max_upload_mb * 1024 * 1024
    items: list[UploadItem] = []
    for upload in files:
        filename = upload.filename or "document.pdf"
        try:
            content = await upload.read(max_bytes + 1)
            if len(content) > max_bytes:
                raise StorageError(f"File exceeds the {settings.max_upload_mb} MB limit")
            validate_pdf(content)
            try:
                with fitz.open(stream=content, filetype="pdf") as pdf:
                    if pdf.needs_pass:
                        raise StorageError("Password-protected PDFs are not supported")
                    page_count = pdf.page_count
                    if page_count == 0:
                        raise StorageError("PDF has no pages")
            except StorageError:
                raise
            except Exception as exc:
                raise StorageError(f"PDF could not be opened: {exc}") from exc

            digest = checksum_bytes(content)
            duplicate = db.query(Document).filter(Document.checksum == digest).first()
            if duplicate:
                items.append(
                    UploadItem(
                        filename=filename,
                        ok=False,
                        duplicate_of=duplicate.id,
                        error="Duplicate upload: this exact PDF is already in the repository.",
                        document=summary(db, duplicate),
                    )
                )
                continue

            safe_name = sanitize_filename(filename)
            doc = Document(
                ordinance_number=ordinance_number or None,
                title=(title or Path(safe_name).stem).strip()[:600],
                document_type=document_type or "Ordinance",
                year=year,
                date_enacted=date_enacted or None,
                lgu=lgu or None,
                jurisdiction=jurisdiction or None,
                subject=subject or None,
                category=category or None,
                publication_status=publication_status or None,
                source_url=source_url or None,
                notes=notes or None,
                original_filename=safe_name,
                stored_path="",
                checksum=digest,
                file_size=len(content),
                page_count=page_count,
                status="uploaded",
                is_active=is_active,
                uploaded_by=user.id,
            )
            db.add(doc)
            db.flush()
            created_doc_id = doc.id
            try:
                document_original_dir(doc.id)
                doc.stored_path = save_original(doc.id, safe_name, content)
                job = ProcessingJob(
                    document_id=doc.id,
                    job_type="ingest",
                    status="queued",
                    settings_json={"mode": "extract"},
                    max_attempts=settings.worker_max_attempts,
                    created_by=user.id,
                    logs="Job queued after upload\n",
                )
                db.add(job)
                record_audit(
                    db,
                    user,
                    "document.upload",
                    "document",
                    doc.id,
                    {"filename": safe_name, "checksum": digest, "size": len(content)},
                    _ip(request),
                )
                db.commit()
                if not settings.worker_enabled:
                    from app.ingestion.pipeline import run_ingestion_job
                    try:
                        run_ingestion_job(db, job)
                    except Exception as exc:
                        logger.warning("Synchronous ingestion failed for job %s: %s", job.id, exc)
            except Exception:
                purge_ephemeral_artifacts(created_doc_id)
                raise
            finally:
                del content
            db.refresh(doc)
            db.refresh(job)
            items.append(
                UploadItem(
                    filename=filename,
                    ok=True,
                    document=summary(db, doc),
                    job=_job_payload(job),
                )
            )
        except StorageError as exc:
            db.rollback()
            items.append(UploadItem(filename=filename, ok=False, error=str(exc)))
        except Exception as exc:
            db.rollback()
            logger.exception("Upload failed for %s", filename)
            items.append(UploadItem(filename=filename, ok=False, error="Upload failed due to an internal error."))
        finally:
            await upload.close()
    return BatchUploadResponse(items=items)


@router.post("/documents/upload-chunk", response_model=BatchUploadResponse | dict)
async def upload_document_chunk(
    request: Request,
    upload_id: str = Form(...),
    chunk_index: int = Form(...),
    total_chunks: int = Form(...),
    filename: str = Form(...),
    chunk: UploadFile = File(...),
    ordinance_number: str | None = Form(default=None),
    title: str | None = Form(default=None),
    document_type: str = Form(default="Ordinance"),
    year: int | None = Form(default=None),
    date_enacted: str | None = Form(default=None),
    lgu: str | None = Form(default=None),
    jurisdiction: str | None = Form(default=None),
    subject: str | None = Form(default=None),
    category: str | None = Form(default=None),
    publication_status: str | None = Form(default=None),
    source_url: str | None = Form(default=None),
    notes: str | None = Form(default=None),
    is_active: bool = Form(default=True),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    """
    Chunked / Sliced PDF upload endpoint. Bypasses serverless payload size restrictions
    by accepting binary slices (<= 3.5 MB each) and assembling the full document upon arrival
    of the final chunk.
    """
    tmp_root = Path("/tmp/chunks" if os.environ.get("VERCEL") else settings.data_dir / "tmp_chunks")
    upload_dir = tmp_root / upload_id
    upload_dir.mkdir(parents=True, exist_ok=True)
    part_file = upload_dir / f"part_{chunk_index:05d}.bin"
    chunk_bytes = await chunk.read()
    part_file.write_bytes(chunk_bytes)
    await chunk.close()

    if chunk_index < total_chunks - 1:
        return {
            "status": "chunk_received",
            "upload_id": upload_id,
            "chunk_index": chunk_index,
            "total_chunks": total_chunks,
        }

    # Last chunk received: reassemble complete PDF file
    try:
        parts: list[bytes] = []
        for i in range(total_chunks):
            p = upload_dir / f"part_{i:05d}.bin"
            if not p.exists():
                raise HTTPException(status_code=400, detail=f"Missing chunk {i} of {total_chunks}")
            parts.append(p.read_bytes())
        content = b"".join(parts)
        del parts
    finally:
        shutil.rmtree(upload_dir, ignore_errors=True)

    safe_name = sanitize_filename(filename)
    try:
        validate_pdf(content)
        try:
            with fitz.open(stream=content, filetype="pdf") as pdf:
                page_count = pdf.page_count
        except Exception as exc:
            raise StorageError(f"Failed to inspect PDF structure: {exc}") from exc

        digest = checksum_bytes(content)
        duplicate = db.query(Document).filter(Document.checksum == digest).first()
        if duplicate:
            return BatchUploadResponse(
                items=[
                    UploadItem(
                        filename=filename,
                        ok=False,
                        duplicate_of=duplicate.id,
                        error=f"Duplicate file (identical to '{duplicate.title}')",
                    )
                ]
            )

        resolved_title = (title or "").strip()
        if not resolved_title:
            stem = Path(safe_name).stem.replace("_", " ").replace("-", " ")
            resolved_title = stem[:250].strip().title() or "Untitled Document"

        doc = Document(
            title=resolved_title,
            ordinance_number=ordinance_number.strip() if ordinance_number and ordinance_number.strip() else None,
            document_type=document_type.strip() or "Ordinance",
            year=year,
            date_enacted=date_enacted.strip() if date_enacted and date_enacted.strip() else None,
            lgu=lgu.strip() if lgu and lgu.strip() else None,
            jurisdiction=jurisdiction.strip() if jurisdiction and jurisdiction.strip() else None,
            subject=subject.strip() if subject and subject.strip() else None,
            category=category.strip() if category and category.strip() else None,
            publication_status=publication_status.strip() if publication_status and publication_status.strip() else None,
            source_url=source_url.strip() if source_url and source_url.strip() else None,
            notes=notes.strip() if notes and notes.strip() else None,
            original_filename=safe_name,
            stored_path="",
            checksum=digest,
            file_size=len(content),
            page_count=page_count,
            status="uploaded",
            is_active=is_active,
            uploaded_by=user.id,
        )
        db.add(doc)
        db.flush()
        created_doc_id = doc.id
        try:
            document_original_dir(doc.id)
            doc.stored_path = save_original(doc.id, safe_name, content)
            job = ProcessingJob(
                document_id=doc.id,
                job_type="ingest",
                status="queued",
                settings_json={"mode": "extract"},
                max_attempts=settings.worker_max_attempts,
                created_by=user.id,
                logs="Job queued after slice reassembly upload\n",
            )
            db.add(job)
            record_audit(
                db,
                user,
                "document.upload_chunked",
                "document",
                doc.id,
                {"filename": safe_name, "checksum": digest, "size": len(content), "chunks": total_chunks},
                _ip(request),
            )
            db.commit()
            if not settings.worker_enabled:
                from app.ingestion.pipeline import run_ingestion_job
                try:
                    run_ingestion_job(db, job)
                except Exception as exc:
                    logger.warning("Synchronous ingestion failed for job %s: %s", job.id, exc)
        except Exception:
            purge_ephemeral_artifacts(created_doc_id)
            raise
        finally:
            del content
        db.refresh(doc)
        db.refresh(job)
        return BatchUploadResponse(
            items=[
                UploadItem(
                    filename=filename,
                    ok=True,
                    document=summary(db, doc),
                    job=_job_payload(job),
                )
            ]
        )
    except StorageError as exc:
        db.rollback()
        return BatchUploadResponse(items=[UploadItem(filename=filename, ok=False, error=str(exc))])
    except Exception as exc:
        db.rollback()
        logger.exception("Upload reassembly failed for %s", filename)
        return BatchUploadResponse(items=[UploadItem(filename=filename, ok=False, error=f"Upload processing failed: {exc}")])


@router.get("/documents", response_model=Paginated[DocumentSummary])
def admin_list_documents(
    q: str | None = None,
    status: str | None = None,
    year: int | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
    _user: User = Depends(require_reviewer),
):
    query = db.query(Document)
    if q:
        term = f"%{q.lower()}%"
        query = query.filter(
            or_(
                Document.title.ilike(term),
                Document.ordinance_number.ilike(term),
                Document.original_filename.ilike(term),
            )
        )
    if status:
        query = query.filter(Document.status == status)
    if year is not None:
        query = query.filter(Document.year == year)
    total = query.count()
    docs = (
        query.order_by(Document.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    )
    return Paginated[DocumentSummary](
        items=[summary(db, doc) for doc in docs], total=total, page=page, page_size=page_size
    )


@router.get("/documents/{document_id}", response_model=DocumentDetail)
def admin_get_document(
    document_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(require_reviewer),
):
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return detail(db, doc)


@router.patch("/documents/{document_id}", response_model=DocumentDetail)
def update_document(
    document_id: str,
    payload: DocumentUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    updates = payload.model_dump(exclude_unset=True)
    if "title" in updates and not (updates["title"] or "").strip():
        raise HTTPException(status_code=422, detail="Title cannot be blank")
    if "year" in updates and updates["year"] is not None and not (1900 <= updates["year"] <= 2100):
        raise HTTPException(status_code=422, detail="Year must be between 1900 and 2100")
    for field, value in updates.items():
        setattr(doc, field, value)
    record_audit(db, user, "document.update", "document", doc.id, {"fields": sorted(updates)}, _ip(request))
    db.commit()
    db.refresh(doc)
    return detail(db, doc)


@router.post("/documents/{document_id}/jobs", response_model=JobOut, status_code=202)
def create_processing_job(
    document_id: str,
    request: Request,
    mode: str = Query(default="extract", pattern="^(extract|reindex)$"),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    active = (
        db.query(ProcessingJob)
        .filter(
            ProcessingJob.document_id == doc.id,
            ProcessingJob.status.in_(["queued", "running"]),
        )
        .first()
    )
    if active:
        raise HTTPException(status_code=409, detail="A processing job is already queued or running")
    if mode == "reindex" and not current_version(db, doc.id):
        raise HTTPException(status_code=400, detail="Document has no processed version to reindex")
    job = ProcessingJob(
        document_id=doc.id,
        job_type="reindex" if mode == "reindex" else "ingest",
        status="queued",
        settings_json={"mode": mode},
        max_attempts=settings.worker_max_attempts,
        created_by=user.id,
        logs=f"Job queued ({mode})\n",
    )
    db.add(job)
    doc.status = "queued"
    record_audit(db, user, f"document.job.{mode}", "document", doc.id, {}, _ip(request))
    db.commit()
    if not settings.worker_enabled:
        from app.ingestion.pipeline import run_ingestion_job
        try:
            run_ingestion_job(db, job)
        except Exception as exc:
            logger.warning("Synchronous job %s failed: %s", job.id, exc)
    db.refresh(job)
    return _job_payload(job)


@router.post("/jobs/{job_id}/retry", response_model=JobOut)
def retry_job(
    job_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    job = db.get(ProcessingJob, job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status == "running":
        raise HTTPException(status_code=409, detail="Job is currently running")
    job.status = "queued"
    job.attempts = 0
    job.error = None
    job.stage = "queued"
    job.progress = 0
    doc = db.get(Document, job.document_id)
    if doc:
        doc.status = "queued"
        doc.processing_error = None
    record_audit(db, user, "job.retry", "job", job.id, {}, _ip(request))
    db.commit()
    if not settings.worker_enabled:
        from app.ingestion.pipeline import run_ingestion_job
        try:
            run_ingestion_job(db, job)
        except Exception as exc:
            logger.warning("Synchronous retry of job %s failed: %s", job.id, exc)
    db.refresh(job)
    return _job_payload(job)


@router.get("/jobs", response_model=Paginated[JobOut])
def list_jobs(
    status: str | None = None,
    document_id: str | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
    _user: User = Depends(require_reviewer),
):
    query = db.query(ProcessingJob)
    if status:
        query = query.filter(ProcessingJob.status == status)
    if document_id:
        query = query.filter(ProcessingJob.document_id == document_id)
    total = query.count()
    jobs = (
        query.order_by(ProcessingJob.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return Paginated[JobOut](
        items=[_job_payload(job) for job in jobs], total=total, page=page, page_size=page_size
    )


@router.post("/documents/{document_id}/activate", response_model=Message)
def activate_document(
    document_id: str,
    request: Request,
    active: bool = True,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    version = current_version(db, doc.id)
    if active and not version:
        raise HTTPException(status_code=400, detail="Document must be processed before activation")
    if active and doc.status == "failed":
        raise HTTPException(status_code=400, detail="Failed documents cannot be activated")
    doc.is_active = active
    record_audit(
        db, user, "document.activate" if active else "document.deactivate", "document", doc.id, {}, _ip(request)
    )
    db.commit()
    invalidate_vector_index()
    return Message(message="Document activated for public search" if active else "Document deactivated")


@router.post("/documents/{document_id}/approve", response_model=DocumentDetail)
def approve_document(
    document_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_reviewer),
):
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    version = current_version(db, doc.id)
    if not version:
        raise HTTPException(status_code=400, detail="Document has no processed version")
    version.approved_by = user.id
    version.approved_at = datetime.now(timezone.utc)
    db.query(Section).filter(Section.version_id == version.id).update(
        {Section.verification_status: "verified"}
    )
    db.query(Chunk).filter(Chunk.version_id == version.id).update(
        {Chunk.verification_status: "verified"}
    )
    doc.status = "processed"
    record_audit(db, user, "document.approve", "document", doc.id, {}, _ip(request))
    db.commit()
    invalidate_vector_index()
    return detail(db, doc)


@router.delete("/documents/{document_id}", response_model=Message)
def delete_document(
    document_id: str,
    request: Request,
    confirm: str = Query(min_length=1, description="Must match the document title or id"),
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if confirm not in {doc.id, doc.title}:
        raise HTTPException(
            status_code=400,
            detail="Confirmation value must exactly match the document title or id.",
        )
    document_id = doc.id
    audit_details = {
        "title": doc.title,
        "checksum": doc.checksum,
        "filename": doc.original_filename,
    }
    db.execute(delete(Chunk).where(Chunk.document_id == document_id))
    db.execute(delete(Section).where(Section.document_id == document_id))
    db.execute(delete(Page).where(Page.document_id == document_id))
    db.execute(delete(DocumentVersion).where(DocumentVersion.document_id == document_id))
    db.expunge_all()
    doc = db.get(Document, document_id)
    if doc:
        db.delete(doc)
    db.commit()
    record_audit(
        db,
        user,
        "document.delete",
        "document",
        document_id,
        audit_details,
        _ip(request),
    )
    db.commit()
    delete_document_files(document_id)
    invalidate_vector_index()
    return Message(message="Document and derived files were deleted")


@router.get("/ocr-queue", response_model=list[DocumentSummary])
def ocr_queue(db: Session = Depends(get_db), _user: User = Depends(require_reviewer)):
    docs = (
        db.query(Document)
        .filter(Document.status.in_(["needs_review", "failed"]))
        .order_by(Document.updated_at.desc())
        .all()
    )
    return [summary(db, doc) for doc in docs]


@router.get("/documents/{document_id}/pages/{page_number}/image")
def get_page_image(
    document_id: str,
    page_number: int,
    db: Session = Depends(get_db),
    _user: User = Depends(require_reviewer),
):
    version = current_version(db, document_id)
    if not version:
        raise HTTPException(status_code=404, detail="Document has no processed version")
    page = (
        db.query(Page)
        .filter(Page.version_id == version.id, Page.page_number == page_number)
        .first()
    )
    if not page or not page.image_path:
        raise HTTPException(status_code=404, detail="Rendered page image is not available")
    path = resolve_stored(page.image_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Rendered page image is not available")
    return FileResponse(path, media_type="image/png", filename=f"page-{page_number}.png")


@router.patch("/documents/{document_id}/pages/{page_number}", response_model=PageOut)
def correct_page(
    document_id: str,
    page_number: int,
    payload: PageCorrection,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_reviewer),
):
    version = current_version(db, document_id)
    if not version:
        raise HTTPException(status_code=404, detail="Document has no processed version")
    page = (
        db.query(Page)
        .filter(Page.version_id == version.id, Page.page_number == page_number)
        .first()
    )
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    old_text = page.corrected_text if page.corrected_text is not None else page.normalized_text
    new_text = payload.corrected_text.strip()
    if new_text == old_text and not payload.approve:
        raise HTTPException(status_code=400, detail="No changes were submitted")
    if len(new_text) > 500_000:
        raise HTTPException(status_code=413, detail="Corrected page text is too large")
    page.corrected_text = new_text
    revision = TextRevision(
        document_id=document_id,
        page_id=page.id,
        field="page_text",
        old_text=old_text,
        new_text=new_text,
        reason=payload.reason,
        revised_by=user.id,
    )
    db.add(revision)
    if payload.approve:
        page.reviewed_by = user.id
        page.reviewed_at = datetime.now(timezone.utc)
    record_audit(
        db,
        user,
        "ocr.page.correct",
        "page",
        page.id,
        {"page": page_number, "approved": payload.approve, "reason": payload.reason},
        _ip(request),
    )
    db.commit()
    db.refresh(page)
    return PageOut.model_validate(page)


@router.patch("/documents/{document_id}/sections/{section_id}", response_model=dict)
def correct_section(
    document_id: str,
    section_id: str,
    payload: SectionCorrection,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_reviewer),
):
    section = db.get(Section, section_id)
    if not section or section.document_id != document_id:
        raise HTTPException(status_code=404, detail="Section not found")
    version = current_version(db, document_id)
    if not version or section.version_id != version.id:
        raise HTTPException(status_code=400, detail="Only the current version can be corrected")
    new_text = payload.corrected_text.strip()
    if not new_text:
        raise HTTPException(status_code=422, detail="Corrected section text cannot be empty")
    old_text = section.corrected_text if section.corrected_text is not None else section.normalized_text
    section.corrected_text = new_text
    section.verification_status = "corrected"
    revision = TextRevision(
        document_id=document_id,
        section_id=section.id,
        field="section_text",
        old_text=old_text,
        new_text=new_text,
        reason=payload.reason,
        revised_by=user.id,
    )
    db.add(revision)

    draft = SectionDraft(
        stable_key=section.stable_key,
        section_number=section.section_number,
        heading=section.heading,
        section_type=section.section_type,
        level=section.level,
        parent_key=None,
        lines=[(section.page_start, line) for line in new_text.splitlines()],
    )
    doc = db.get(Document, document_id)
    chunk_cfg = chunking_config(db)
    chunks = build_chunks(
        draft,
        document_title=doc.title if doc else "",
        parent_heading=None,
        max_chars=chunk_cfg["max_chars"],
        overlap=chunk_cfg["overlap_chars"],
        min_chars=chunk_cfg["min_chars"],
        ordinance_number=doc.ordinance_number if doc else None,
        document_type=doc.document_type if doc else "Ordinance",
        year=doc.year if doc else None,
        jurisdiction=(doc.jurisdiction or doc.lgu) if doc else None,
    )
    db.query(Chunk).filter(Chunk.section_id == section.id).delete()
    db.flush()
    provider = get_embedding_provider()
    vectors = provider.embed_documents([chunk.embedding_text for chunk in chunks])
    for chunk_draft, vector in zip(chunks, vectors, strict=True):
        db.add(
            Chunk(
                section_id=section.id,
                document_id=document_id,
                version_id=version.id,
                chunk_key=chunk_draft.chunk_key,
                chunk_index=chunk_draft.chunk_index,
                section_number=section.section_number,
                heading=section.heading,
                subsection=chunk_draft.subsection,
                page_start=chunk_draft.page_start,
                page_end=chunk_draft.page_end,
                display_text=chunk_draft.text,
                embedding_text=chunk_draft.embedding_text,
                embedding=[round(value, 6) for value in vector],
                embedding_dim=len(vector),
                embedding_model=provider.name,
                verification_status="corrected",
                is_active=True,
            )
        )
    record_audit(
        db,
        user,
        "section.correct",
        "section",
        section.id,
        {"reason": payload.reason, "chunk_count": len(chunks)},
        _ip(request),
    )
    db.commit()
    invalidate_vector_index()
    db.refresh(section)
    return {
        "section": {
            "id": section.id,
            "verification_status": section.verification_status,
            "chunk_count": len(chunks),
        },
        "message": "Section text corrected and its chunks re-embedded.",
    }


@router.patch("/signatories/{signatory_id}", response_model=dict)
def update_signatory(
    signatory_id: str,
    payload: SignatoryUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_reviewer),
):
    signatory = db.get(Signatory, signatory_id)
    if not signatory:
        raise HTTPException(status_code=404, detail="Signatory not found")
    updates = payload.model_dump(exclude_unset=True)
    if updates.get("verified"):
        updates["verified_by"] = user.id
    for field, value in updates.items():
        setattr(signatory, field, value)
    record_audit(
        db, user, "signatory.update", "signatory", signatory.id, {"fields": sorted(updates)}, _ip(request)
    )
    db.commit()
    return {"message": "Signatory updated", "verified": signatory.verified}


@router.post("/documents/{document_id}/relationships", response_model=RelationshipOut, status_code=201)
def create_relationship(
    document_id: str,
    payload: RelationshipCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    if not db.get(Document, document_id) or not db.get(Document, payload.to_document_id):
        raise HTTPException(status_code=404, detail="Document not found")
    if document_id == payload.to_document_id:
        raise HTTPException(status_code=400, detail="A document cannot relate to itself")
    relationship = DocumentRelationship(
        from_document_id=document_id,
        to_document_id=payload.to_document_id,
        relationship_type=payload.relationship_type,
        notes=payload.notes,
        verified=payload.verified,
        created_by=user.id,
    )
    db.add(relationship)
    record_audit(
        db,
        user,
        "relationship.create",
        "document_relationship",
        document_id,
        payload.model_dump(),
        _ip(request),
    )
    db.commit()
    db.refresh(relationship)
    return RelationshipOut.model_validate(relationship)


@router.delete("/relationships/{relationship_id}", response_model=Message)
def delete_relationship(
    relationship_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    relationship = db.get(DocumentRelationship, relationship_id)
    if not relationship:
        raise HTTPException(status_code=404, detail="Relationship not found")
    record_audit(db, user, "relationship.delete", "document_relationship", relationship.id, {}, _ip(request))
    db.delete(relationship)
    db.commit()
    return Message(message="Relationship deleted")


@router.get("/stats")
def admin_stats(db: Session = Depends(get_db), _user: User = Depends(require_reviewer)):
    current_versions = db.query(DocumentVersion.id).filter(DocumentVersion.is_current.is_(True)).subquery()
    total_docs = db.query(func.count(Document.id)).scalar() or 0
    active_docs = db.query(func.count(Document.id)).filter(Document.is_active.is_(True)).scalar() or 0
    processed = (
        db.query(func.count(Document.id))
        .filter(Document.status.in_(["processed", "needs_review"]))
        .scalar()
        or 0
    )
    review = db.query(func.count(Document.id)).filter(Document.status == "needs_review").scalar() or 0
    failed_docs = db.query(func.count(Document.id)).filter(Document.status == "failed").scalar() or 0
    failed_jobs = (
        db.query(func.count(ProcessingJob.id)).filter(ProcessingJob.status == "failed").scalar() or 0
    )
    indexed_sections = (
        db.query(func.count(Section.id))
        .filter(Section.version_id.in_(db.query(current_versions.c.id)))
        .scalar()
        or 0
    )
    verified_sections = (
        db.query(func.count(Section.id))
        .filter(
            Section.version_id.in_(db.query(current_versions.c.id)),
            Section.verification_status == "verified",
        )
        .scalar()
        or 0
    )
    chunks = db.query(func.count(Chunk.id)).filter(Chunk.is_active.is_(True)).scalar() or 0
    signatories = db.query(func.count(Signatory.id)).scalar() or 0
    unverified_signatories = (
        db.query(func.count(Signatory.id)).filter(Signatory.verified.is_(False)).scalar() or 0
    )
    recent_audit = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(8).all()
    recent_jobs = db.query(ProcessingJob).order_by(ProcessingJob.created_at.desc()).limit(6).all()
    return {
        "documents": {
            "total": total_docs,
            "active": active_docs,
            "processed": processed,
            "awaiting_review": review,
            "failed": failed_docs,
        },
        "jobs": {"failed": failed_jobs, "recent": [_job_payload(job) for job in recent_jobs]},
        "index": {
            "sections": indexed_sections,
            "verified_sections": verified_sections,
            "chunks": chunks,
            "embedding_model": settings.embedding_model,
        },
        "signatories": {"total": signatories, "unverified": unverified_signatories},
        "recent_activity": [AuditOut.model_validate(entry) for entry in recent_audit],
        "system": {
            "ocr_available": tesseract_available(),
            "ocr_enabled": settings.ocr_enabled,
            "ocr_lang": settings.ocr_lang,
            "worker_enabled": settings.worker_enabled,
            "embedding_provider": settings.embedding_provider,
            "embedding_dim": db.query(Chunk.embedding_dim).filter(Chunk.embedding_dim > 0).first()[0]
            if db.query(Chunk).filter(Chunk.embedding_dim > 0).first()
            else None,
        },
    }


@router.get("/settings")
def get_settings_admin(db: Session = Depends(get_db), _user: User = Depends(require_admin)):
    return {
        "embedding": {
            "provider": settings.embedding_provider,
            "model": settings.embedding_model,
            "dimension": db.query(Chunk.embedding_dim).filter(Chunk.embedding_dim > 0).first()[0]
            if db.query(Chunk).filter(Chunk.embedding_dim > 0).first()
            else None,
        },
        "retrieval": retrieval_config(db),
        "chunking": chunking_config(db),
        "ocr": {
            "enabled": settings.ocr_enabled,
            "lang": settings.ocr_lang,
            "dpi": settings.ocr_dpi,
            "available": tesseract_available(),
        },
        "processing": {
            "worker_enabled": settings.worker_enabled,
            "max_upload_mb": settings.max_upload_mb,
            "embedding_batch_size": settings.embedding_batch_size,
        },
        "overrides": {
            "retrieval": get_runtime_overrides(db, "retrieval"),
            "chunking": get_runtime_overrides(db, "chunking"),
        },
    }


@router.patch("/settings/retrieval")
def update_retrieval_settings(
    payload: dict,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    allowed = {"vector_weight", "keyword_weight", "min_score", "vector_min_score", "rerank_enabled", "top_k"}
    unknown = set(payload) - allowed
    if unknown:
        raise HTTPException(status_code=422, detail=f"Unknown settings: {', '.join(sorted(unknown))}")
    for key in ("vector_weight", "keyword_weight", "min_score", "vector_min_score"):
        if key in payload:
            value = float(payload[key])
            if not 0 <= value <= 1:
                raise HTTPException(status_code=422, detail=f"{key} must be between 0 and 1")
            payload[key] = value
    if "top_k" in payload:
        top_k = int(payload["top_k"])
        if not 1 <= top_k <= 50:
            raise HTTPException(status_code=422, detail="top_k must be between 1 and 50")
        payload["top_k"] = top_k
    if "rerank_enabled" in payload:
        payload["rerank_enabled"] = bool(payload["rerank_enabled"])
    current = get_runtime_overrides(db, "retrieval")
    current.update(payload)
    set_runtime_overrides(db, "retrieval", current, user.id)
    record_audit(db, user, "settings.retrieval.update", "settings", "retrieval", payload, _ip(request))
    db.commit()
    return {"message": "Retrieval settings updated", "retrieval": retrieval_config(db)}


@router.patch("/settings/chunking")
def update_chunking_settings(
    payload: dict,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    allowed = {"max_chars", "overlap_chars", "min_chars"}
    unknown = set(payload) - allowed
    if unknown:
        raise HTTPException(status_code=422, detail=f"Unknown settings: {', '.join(sorted(unknown))}")
    for key, value in payload.items():
        payload[key] = int(value)
    if "max_chars" in payload and not 200 <= payload["max_chars"] <= 8000:
        raise HTTPException(status_code=422, detail="max_chars must be between 200 and 8000")
    if "overlap_chars" in payload and not 0 <= payload["overlap_chars"] <= 1000:
        raise HTTPException(status_code=422, detail="overlap_chars must be between 0 and 1000")
    if "min_chars" in payload and not 0 <= payload["min_chars"] <= 1000:
        raise HTTPException(status_code=422, detail="min_chars must be between 0 and 1000")
    current = get_runtime_overrides(db, "chunking")
    current.update(payload)
    set_runtime_overrides(db, "chunking", current, user.id)
    record_audit(db, user, "settings.chunking.update", "settings", "chunking", payload, _ip(request))
    db.commit()
    return {"message": "Chunking settings updated for future jobs", "chunking": chunking_config(db)}


@router.get("/audit", response_model=Paginated[AuditOut])
def list_audit(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=30, ge=1, le=100),
    db: Session = Depends(get_db),
    _user: User = Depends(require_admin),
):
    query = db.query(AuditLog)
    total = query.count()
    rows = (
        query.order_by(AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return Paginated[AuditOut](
        items=[AuditOut.model_validate(row) for row in rows], total=total, page=page, page_size=page_size
    )


@router.get("/revisions/{document_id}")
def list_revisions(
    document_id: str,
    db: Session = Depends(get_db),
    _user: User = Depends(require_reviewer),
):
    rows = (
        db.query(TextRevision)
        .filter(TextRevision.document_id == document_id)
        .order_by(TextRevision.created_at.desc())
        .limit(200)
        .all()
    )
    return [
        {
            "id": row.id,
            "page_id": row.page_id,
            "section_id": row.section_id,
            "field": row.field,
            "old_text": row.old_text,
            "new_text": row.new_text,
            "reason": row.reason,
            "revised_by": row.revised_by,
            "created_at": row.created_at,
        }
        for row in rows
    ]


@router.post("/documents/{document_id}/refine-ocr")
def admin_refine_document_ocr(
    document_id: str,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    """
    Applies the bilingual (English + Filipino) spelling & Google Gemini AI formatter
    across all sections of the document, repairing typos and re-embedding updated chunks.
    """
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    version = current_version(db, doc.id)
    if not version:
        raise HTTPException(status_code=400, detail="Document has no processed version to refine")

    from app.services.gemini_ocr import refine_text_with_gemini
    from app.retrieval.vector_index import invalidate_vector_index

    sections = db.query(Section).filter(Section.version_id == version.id).order_by(Section.order_index).all()
    refined_count = 0
    for section in sections:
        source_text = section.corrected_text if section.corrected_text else section.normalized_text
        refined = refine_text_with_gemini(source_text, doc.title)
        if refined and refined.strip() != source_text.strip():
            section.corrected_text = refined
            section.verification_status = "corrected"
            refined_count += 1
    db.commit()
    invalidate_vector_index()
    record_audit(db, user, "document.refine_ocr", "document", doc.id, {"refined_sections": refined_count}, _ip(request))
    return {
        "message": f"Successfully refined statutory text across {refined_count} section(s).",
        "refined_sections": refined_count,
        "total_sections": len(sections),
    }


@router.patch("/settings/ai")
def update_ai_settings(
    payload: dict,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    """Updates Google Gemini AI API key configuration."""
    if "gemini_api_key" in payload:
        key_val = str(payload["gemini_api_key"]).strip()
        settings.gemini_api_key = key_val
        os.environ["GEMINI_API_KEY"] = key_val
    record_audit(db, user, "settings.ai.update", "settings", "ai", {"configured": bool(settings.gemini_api_key)}, _ip(request))
    from app.services.gemini_ocr import is_gemini_available
    return {
        "message": "AI settings updated",
        "gemini_configured": is_gemini_available(),
    }
