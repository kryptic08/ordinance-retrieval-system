from typing import Literal

from pydantic import BaseModel, Field

from app.schemas.documents import DocumentSummary


class SearchFilters(BaseModel):
    year: int | None = None
    document_type: str | None = None
    jurisdiction: str | None = None
    category: str | None = None
    subject: str | None = None
    document_id: str | None = None


class SearchRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000)
    top_k: int = Field(default=10, ge=1, le=50)
    configuration: Literal["keyword", "vector", "hybrid", "hybrid_rerank"] = "hybrid"
    filters: SearchFilters = Field(default_factory=SearchFilters)
    min_score: float | None = Field(default=None, ge=0, le=1)


class SearchResult(BaseModel):
    chunk_id: str
    section_id: str
    chunk_key: str
    document: DocumentSummary
    section_number: str | None = None
    heading: str | None = None
    page_start: int
    page_end: int
    excerpt: str
    text: str
    score: float
    retrieval_score: float
    keyword_score: float = 0
    vector_score: float = 0
    rerank_score: float = 0
    matched_terms: list[str] = Field(default_factory=list)
    verification_status: str
    citation: str
    pdf_url: str


class AnswerClaim(BaseModel):
    claim: str
    citations: list[str]
    chunk_id: str | None = None
    citation_url: str | None = None
    page_start: int | None = None
    document_id: str | None = None


class AnswerBlock(BaseModel):
    text: str
    mode: str = "extractive"
    claims: list[AnswerClaim] = Field(default_factory=list)
    disclaimer: str


class SearchResponse(BaseModel):
    query: str
    results: list[SearchResult]
    total: int
    took_ms: float
    configuration: str
    message: str | None = None
    suggestions: list[str] = Field(default_factory=list)
    top_score: float | None = None
    answer: AnswerBlock | None = None


class GroundedAnswer(BaseModel):
    query: str
    mode: str
    answer: str
    claims: list[AnswerClaim] = Field(default_factory=list)
    passages: list[SearchResult] = Field(default_factory=list)
    disclaimer: str
    message: str | None = None
