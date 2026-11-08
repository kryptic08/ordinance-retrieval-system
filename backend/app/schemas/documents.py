from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import ORMModel


class DocumentSummary(ORMModel):
    id: str
    ordinance_number: str | None = None
    title: str
    document_type: str
    year: int | None = None
    date_enacted: str | None = None
    lgu: str | None = None
    jurisdiction: str | None = None
    subject: str | None = None
    category: str | None = None
    publication_status: str | None = None
    status: str
    is_active: bool
    page_count: int
    file_size: int
    checksum: str
    original_filename: str
    embedding_model: str | None = None
    processing_error: str | None = None
    created_at: datetime
    updated_at: datetime
    section_count: int = 0
    chunk_count: int = 0
    signatory_count: int = 0


class PageOut(ORMModel):
    id: str
    page_number: int
    width: float | None = None
    height: float | None = None
    rotation: int
    has_text: bool
    is_scanned: bool
    text_source: str
    page_type: str
    raw_text: str
    normalized_text: str
    corrected_text: str | None = None
    ocr_confidence: float | None = None
    warnings: list = Field(default_factory=list)
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None


class SectionOut(ORMModel):
    id: str
    stable_key: str
    section_number: str | None = None
    heading: str | None = None
    section_type: str
    level: int
    page_start: int
    page_end: int
    order_index: int
    normalized_text: str
    corrected_text: str | None = None
    verification_status: str
    parent_id: str | None = None
    chunk_count: int = 0


class SignatoryOut(ORMModel):
    id: str
    page_number: int
    name: str | None = None
    title: str | None = None
    role: str | None = None
    confidence: float | None = None
    method: str
    verified: bool
    notes: str | None = None


class JobOut(ORMModel):
    id: str
    document_id: str
    job_type: str
    status: str
    stage: str | None = None
    progress: int
    attempts: int
    max_attempts: int
    error: str | None = None
    logs: str
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None


class RelationshipOut(ORMModel):
    id: str
    from_document_id: str
    to_document_id: str
    relationship_type: str
    notes: str | None = None
    verified: bool


class RelationshipCreate(BaseModel):
    to_document_id: str
    relationship_type: str = Field(
        default="related_to",
        pattern="^(amends|repeals|supersedes|implements|related_to|possible_conflict)$",
    )
    notes: str | None = None
    verified: bool = False


class DocumentDetail(DocumentSummary):
    notes: str | None = None
    source_url: str | None = None
    original_filename: str
    embedding_dim: int | None = None
    corpus_version: str
    pages: list[PageOut] = Field(default_factory=list)
    sections: list[SectionOut] = Field(default_factory=list)
    signatories: list[SignatoryOut] = Field(default_factory=list)
    jobs: list[JobOut] = Field(default_factory=list)
    relationships: list[RelationshipOut] = Field(default_factory=list)


class DocumentUpdate(BaseModel):
    ordinance_number: str | None = None
    title: str | None = None
    document_type: str | None = None
    year: int | None = None
    date_enacted: str | None = None
    lgu: str | None = None
    jurisdiction: str | None = None
    subject: str | None = None
    category: str | None = None
    publication_status: str | None = None
    source_url: str | None = None
    notes: str | None = None


class PageCorrection(BaseModel):
    corrected_text: str
    reason: str | None = None
    approve: bool = False


class SectionCorrection(BaseModel):
    corrected_text: str
    reason: str | None = None


class SignatoryUpdate(BaseModel):
    name: str | None = None
    title: str | None = None
    role: str | None = None
    verified: bool = False
    notes: str | None = None


class UploadResponse(BaseModel):
    document: DocumentSummary
    job: JobOut | None = None
    duplicate_of: str | None = None


class UploadItem(BaseModel):
    filename: str
    ok: bool
    error: str | None = None
    duplicate_of: str | None = None
    document: DocumentSummary | None = None
    job: JobOut | None = None


class BatchUploadResponse(BaseModel):
    items: list[UploadItem]


class ExtractionPreview(BaseModel):
    document_id: str
    page: PageOut
    section: SectionOut | None = None
