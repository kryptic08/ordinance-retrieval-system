from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import (
    Chunk,
    Document,
    DocumentRelationship,
    DocumentVersion,
    Page,
    ProcessingJob,
    Section,
    Signatory,
)
from app.ingestion.ocr_helper import clean_and_format_ocr_text
from app.schemas.documents import (
    DocumentDetail,
    DocumentSummary,
    JobOut,
    PageOut,
    RelationshipOut,
    SectionOut,
    SignatoryOut,
)


def current_version(db: Session, document_id: str) -> DocumentVersion | None:
    return (
        db.query(DocumentVersion)
        .filter(DocumentVersion.document_id == document_id, DocumentVersion.is_current.is_(True))
        .order_by(DocumentVersion.version_no.desc())
        .first()
    )


def document_counts(db: Session, document_id: str, version_id: str | None) -> tuple[int, int, int]:
    section_query = db.query(func.count(Section.id)).filter(Section.document_id == document_id)
    chunk_query = db.query(func.count(Chunk.id)).filter(
        Chunk.document_id == document_id, Chunk.is_active.is_(True)
    )
    if version_id:
        section_query = section_query.filter(Section.version_id == version_id)
        chunk_query = chunk_query.filter(Chunk.version_id == version_id)
    sections = section_query.scalar() or 0
    chunks = chunk_query.scalar() or 0
    signatories = (
        db.query(func.count(Signatory.id)).filter(Signatory.document_id == document_id).scalar() or 0
    )
    return sections, chunks, signatories


def summary(db: Session, doc: Document) -> DocumentSummary:
    version = current_version(db, doc.id)
    sections, chunks, signatories = document_counts(db, doc.id, version.id if version else None)
    payload = DocumentSummary.model_validate(doc)
    payload.section_count = sections
    payload.chunk_count = chunks
    payload.signatory_count = signatories
    return payload


def detail(db: Session, doc: Document) -> DocumentDetail:
    version = current_version(db, doc.id)
    sections, chunks, signatories_count = document_counts(db, doc.id, version.id if version else None)
    pages = []
    sections_out = []
    jobs = []
    if version:
        pages = (
            db.query(Page).filter(Page.version_id == version.id).order_by(Page.page_number).all()
        )
        section_rows = (
            db.query(Section)
            .filter(Section.version_id == version.id)
            .order_by(Section.order_index)
            .all()
        )
        chunk_counts_by_section = dict(
            db.query(Chunk.section_id, func.count(Chunk.id))
            .filter(Chunk.version_id == version.id, Chunk.is_active.is_(True))
            .group_by(Chunk.section_id)
            .all()
        )
        for row in section_rows:
            item = SectionOut.model_validate(row)
            item.normalized_text = clean_and_format_ocr_text(item.normalized_text)
            if item.corrected_text:
                item.corrected_text = clean_and_format_ocr_text(item.corrected_text)
            item.chunk_count = int(chunk_counts_by_section.get(row.id, 0))
            sections_out.append(item)
    jobs = (
        db.query(ProcessingJob)
        .filter(ProcessingJob.document_id == doc.id)
        .order_by(ProcessingJob.created_at.desc())
        .limit(20)
        .all()
    )
    signatories = (
        db.query(Signatory).filter(Signatory.document_id == doc.id).order_by(Signatory.page_number).all()
    )
    relationships = (
        db.query(DocumentRelationship)
        .filter(
            (DocumentRelationship.from_document_id == doc.id)
            | (DocumentRelationship.to_document_id == doc.id)
        )
        .all()
    )
    pages_out: list[PageOut] = []
    for page in pages:
        p_out = PageOut.model_validate(page)
        p_out.normalized_text = clean_and_format_ocr_text(p_out.normalized_text)
        if p_out.corrected_text:
            p_out.corrected_text = clean_and_format_ocr_text(p_out.corrected_text)
        pages_out.append(p_out)

    payload = DocumentDetail.model_validate(doc)
    payload.section_count = sections
    payload.chunk_count = chunks
    payload.signatory_count = signatories_count
    payload.pages = pages_out
    payload.sections = sections_out
    payload.signatories = [SignatoryOut.model_validate(item) for item in signatories]
    payload.jobs = [JobOut.model_validate(item) for item in jobs]
    payload.relationships = [RelationshipOut.model_validate(item) for item in relationships]
    return payload
