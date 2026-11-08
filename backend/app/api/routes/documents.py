from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import get_optional_user
from app.db.models import Chunk, Document, Page, Section, User
from app.db.session import get_db
from app.schemas.common import Paginated
from app.schemas.documents import DocumentDetail, DocumentSummary, PageOut, SectionOut
from app.services.documents import current_version, detail, summary
from app.services.storage import resolve_stored

router = APIRouter(prefix="/documents", tags=["documents"])


def visible_document(db: Session, document_id: str, user: User | None) -> Document:
    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if not doc.is_active and (not user or user.role not in {"admin", "reviewer"}):
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("", response_model=Paginated[DocumentSummary])
def list_documents(
    q: str | None = None,
    year: int | None = None,
    document_type: str | None = None,
    jurisdiction: str | None = None,
    category: str | None = None,
    include_inactive: bool = False,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    query = db.query(Document)
    can_see_inactive = bool(user and user.role in {"admin", "reviewer"}) and include_inactive
    if not can_see_inactive:
        query = query.filter(Document.is_active.is_(True))
    if q:
        term = f"%{q.strip().lower()}%"
        query = query.filter(
            or_(
                Document.title.ilike(term),
                Document.ordinance_number.ilike(term),
                Document.subject.ilike(term),
                Document.category.ilike(term),
            )
        )
    if year is not None:
        query = query.filter(Document.year == year)
    if document_type:
        query = query.filter(Document.document_type == document_type)
    if jurisdiction:
        query = query.filter(Document.jurisdiction.ilike(f"%{jurisdiction}%"))
    if category:
        query = query.filter(Document.category == category)
    total = query.count()
    docs = (
        query.order_by(Document.year.desc().nullslast(), Document.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return Paginated[DocumentSummary](
        items=[summary(db, doc) for doc in docs], total=total, page=page, page_size=page_size
    )


@router.get("/options")
def document_options(db: Session = Depends(get_db)):
    years = [
        row[0]
        for row in db.query(Document.year)
        .filter(Document.is_active.is_(True), Document.year.is_not(None))
        .distinct()
        .order_by(Document.year.desc())
        .all()
    ]
    types = [
        row[0]
        for row in db.query(Document.document_type)
        .filter(Document.is_active.is_(True))
        .distinct()
        .order_by(Document.document_type)
        .all()
    ]
    jurisdictions = [
        row[0]
        for row in db.query(Document.jurisdiction)
        .filter(Document.is_active.is_(True), Document.jurisdiction.is_not(None))
        .distinct()
        .order_by(Document.jurisdiction)
        .all()
    ]
    categories = [
        row[0]
        for row in db.query(Document.category)
        .filter(Document.is_active.is_(True), Document.category.is_not(None))
        .distinct()
        .order_by(Document.category)
        .all()
    ]
    return {
        "years": years,
        "document_types": types,
        "jurisdictions": jurisdictions,
        "categories": categories,
    }


@router.get("/{document_id}", response_model=DocumentDetail)
def get_document(
    document_id: str,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    doc = visible_document(db, document_id, user)
    return detail(db, doc)


@router.get("/{document_id}/sections/{section_id}")
def get_section(
    document_id: str,
    section_id: str,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    from app.ingestion.ocr_helper import clean_and_format_ocr_text

    doc = visible_document(db, document_id, user)
    section = db.get(Section, section_id)
    if not section or section.document_id != doc.id:
        raise HTTPException(status_code=404, detail="Section not found")
    version = current_version(db, doc.id)
    if version and section.version_id != version.id:
        raise HTTPException(status_code=404, detail="Section belongs to a superseded version")
    chunks = (
        db.query(Chunk)
        .filter(Chunk.section_id == section.id, Chunk.is_active.is_(True))
        .order_by(Chunk.chunk_index)
        .all()
    )
    sec_out = SectionOut.model_validate(section)
    sec_out.normalized_text = clean_and_format_ocr_text(sec_out.normalized_text)
    if sec_out.corrected_text:
        sec_out.corrected_text = clean_and_format_ocr_text(sec_out.corrected_text)
    return {
        "section": sec_out,
        "chunks": [
            {
                "id": chunk.id,
                "chunk_key": chunk.chunk_key,
                "text": clean_and_format_ocr_text(chunk.display_text),
                "page_start": chunk.page_start,
                "page_end": chunk.page_end,
                "verification_status": chunk.verification_status,
            }
            for chunk in chunks
        ],
    }


@router.get("/{document_id}/pages/{page_number}")
def get_page(
    document_id: str,
    page_number: int,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    from app.ingestion.ocr_helper import clean_and_format_ocr_text

    doc = visible_document(db, document_id, user)
    version = current_version(db, doc.id)
    if not version:
        raise HTTPException(status_code=404, detail="Document has no processed version")
    page = (
        db.query(Page)
        .filter(Page.version_id == version.id, Page.page_number == page_number)
        .first()
    )
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    p_out = PageOut.model_validate(page)
    p_out.normalized_text = clean_and_format_ocr_text(p_out.normalized_text)
    if p_out.corrected_text:
        p_out.corrected_text = clean_and_format_ocr_text(p_out.corrected_text)
    return p_out


@router.get("/{document_id}/file")
def get_document_file(
    document_id: str,
    request: Request,
    download: bool = False,
    db: Session = Depends(get_db),
    user: User | None = Depends(get_optional_user),
):
    _ = visible_document(db, document_id, user)
    raise HTTPException(
        status_code=403,
        detail=(
            "Source PDF viewing and downloads are disabled to protect physical signatures "
            "and personal data under privacy policy. Please inspect the parsed statutory sections."
        ),
    )
