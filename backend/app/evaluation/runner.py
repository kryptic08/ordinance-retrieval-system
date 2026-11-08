from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.db.models import (
    BenchmarkQuery,
    Chunk,
    Document,
    RelevanceJudgment,
    RetrievalExperiment,
    Section,
)
from app.embeddings.registry import get_embedding_provider
from app.evaluation.metrics import (
    aggregate_metrics,
    ndcg_at_k,
    precision_at_k,
    recall_at_k,
    reciprocal_rank,
)
from app.retrieval.search import search_documents
from app.schemas.search import SearchFilters, SearchRequest
from app.services.runtime_settings import chunking_config, retrieval_config


def _citation_ok(db: Session, result) -> bool:
    chunk = db.get(Chunk, result.chunk_id)
    if not chunk:
        return False
    if chunk.document_id != result.document.id or chunk.section_id != result.section_id:
        return False
    section = db.get(Section, chunk.section_id)
    document = db.get(Document, chunk.document_id)
    if not section or not document:
        return False
    if chunk.page_start < 1 or chunk.page_end > max(document.page_count, 1):
        return False
    return not (chunk.page_start > chunk.page_end)


def run_experiment(
    db: Session,
    name: str,
    configurations: list[str],
    top_k: int,
    user_id: str | None = None,
    notes: str | None = None,
) -> list[RetrievalExperiment]:
    queries = (
        db.query(BenchmarkQuery)
        .filter(BenchmarkQuery.is_active.is_(True))
        .order_by(BenchmarkQuery.created_at)
        .all()
    )
    if not queries:
        raise ValueError("No active benchmark queries. Add benchmark queries and relevance judgments first.")
    judged = [query for query in queries if query.judgments]
    if not judged:
        raise ValueError("No benchmark queries have relevance judgments yet.")

    dataset = [
        {
            "query_id": query.id,
            "query_text": query.query_text,
            "category": query.category,
            "judgments": [
                {"section_id": judgment.section_id, "grade": judgment.grade}
                for judgment in query.judgments
            ],
        }
        for query in judged
    ]

    retrieval = retrieval_config(db)
    chunking = chunking_config(db)
    provider = get_embedding_provider()
    experiments: list[RetrievalExperiment] = []
    for configuration in configurations:
        per_query: list[dict] = []
        for query in judged:
            grades = {
                judgment.section_id: judgment.grade
                for judgment in query.judgments
                if judgment.section_id
            }
            relevant = {section_id for section_id, grade in grades.items() if grade > 0}
            request = SearchRequest(
                query=query.query_text,
                top_k=top_k,
                configuration=configuration,
                filters=SearchFilters(),
            )
            response = search_documents(db, request, log_event=False)
            retrieved = [result.section_id for result in response.results]
            citation_values = [_citation_ok(db, result) for result in response.results[:top_k]]
            per_query.append(
                {
                    "query_id": query.id,
                    "query_text": query.query_text,
                    "category": query.category,
                    "retrieved": retrieved,
                    "scores": [result.score for result in response.results],
                    "relevant_section_ids": sorted(relevant),
                    "grades": grades,
                    "relevant_count": len(relevant),
                    "precision": precision_at_k(retrieved, relevant, top_k),
                    "recall": recall_at_k(retrieved, relevant, top_k),
                    "rr": reciprocal_rank(retrieved, relevant),
                    "ndcg": ndcg_at_k(retrieved, grades, top_k),
                    "latency_ms": response.took_ms,
                    "citation_checked": bool(citation_values),
                    "citation_correct": all(citation_values) if citation_values else True,
                }
            )
        metrics = aggregate_metrics(per_query, top_k)
        experiment = RetrievalExperiment(
            name=f"{name} — {configuration}",
            configuration=configuration,
            config_json={
                "configuration": configuration,
                "top_k": top_k,
                "vector_weight": retrieval["vector_weight"],
                "keyword_weight": retrieval["keyword_weight"],
                "min_score": retrieval["min_score"],
                "vector_min_score": retrieval["vector_min_score"],
                "rerank_enabled": retrieval["rerank_enabled"],
                "chunk_max_chars": chunking["max_chars"],
                "chunk_overlap_chars": chunking["overlap_chars"],
                "chunk_min_chars": chunking["min_chars"],
                "embedding_provider": provider.name,
                "embedding_dimension": provider.dimension,
            },
            dataset_json=dataset,
            corpus_version=str(
                db.query(Document.corpus_version).filter(Document.is_active.is_(True)).first()[0]
                if db.query(Document).filter(Document.is_active.is_(True)).first()
                else "empty"
            ),
            embedding_model=provider.name,
            status="completed",
            metrics_json=metrics,
            results_json=per_query,
            notes=notes,
            created_by=user_id,
            finished_at=datetime.now(timezone.utc),
        )
        db.add(experiment)
        experiments.append(experiment)
    db.commit()
    for experiment in experiments:
        db.refresh(experiment)
    return experiments
