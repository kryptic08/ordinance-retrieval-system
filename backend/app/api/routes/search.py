from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from app.core.ratelimit import enforce_search_rate_limit
from app.db.session import get_db
from app.retrieval.search import grounded_answer, search_documents
from app.schemas.search import GroundedAnswer, SearchFilters, SearchRequest, SearchResponse

router = APIRouter(prefix="/search", tags=["search"])


@router.post("", response_model=SearchResponse)
def search(
    payload: SearchRequest,
    request: Request,
    db: Session = Depends(get_db),
    _rate: None = Depends(enforce_search_rate_limit),
):
    return search_documents(db, payload)


@router.get("", response_model=SearchResponse)
def search_get(
    q: str = Query(min_length=1, max_length=2000),
    top_k: int = Query(default=10, ge=1, le=50),
    configuration: str = Query(default="hybrid"),
    year: int | None = None,
    document_type: str | None = None,
    jurisdiction: str | None = None,
    category: str | None = None,
    document_id: str | None = None,
    db: Session = Depends(get_db),
    _rate: None = Depends(enforce_search_rate_limit),
):
    allowed = {"keyword", "vector", "hybrid", "hybrid_rerank"}
    config = configuration if configuration in allowed else "hybrid"
    payload = SearchRequest(
        query=q,
        top_k=top_k,
        configuration=config,
        filters=SearchFilters(
            year=year,
            document_type=document_type,
            jurisdiction=jurisdiction,
            category=category,
            document_id=document_id,
        ),
    )
    return search_documents(db, payload)


@router.post("/answer", response_model=GroundedAnswer)
def answer(
    payload: SearchRequest,
    db: Session = Depends(get_db),
    _rate: None = Depends(enforce_search_rate_limit),
):
    return grounded_answer(db, payload)
