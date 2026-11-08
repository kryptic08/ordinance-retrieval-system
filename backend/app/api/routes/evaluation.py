import csv
import io
from collections import defaultdict

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.core.security import require_admin, require_reviewer
from app.db.models import (
    BenchmarkQuery,
    Document,
    QualityEvaluation,
    RelevanceJudgment,
    RetrievalExperiment,
    Section,
    User,
)
from app.db.session import get_db
from app.evaluation.runner import run_experiment
from app.schemas.evaluation import (
    BenchmarkQueryCreate,
    BenchmarkQueryOut,
    ExperimentOut,
    ExperimentRun,
    JudgmentCreate,
    JudgmentOut,
    QualityEvaluationCreate,
    QualityEvaluationOut,
)
from app.services.audit import record_audit

router = APIRouter(prefix="/evaluation", tags=["evaluation"])


@router.get("/queries", response_model=list[BenchmarkQueryOut])
def list_queries(db: Session = Depends(get_db), _user: User = Depends(require_reviewer)):
    rows = db.query(BenchmarkQuery).order_by(BenchmarkQuery.created_at.desc()).all()
    result = []
    for row in rows:
        item = BenchmarkQueryOut.model_validate(row)
        item.judgment_count = len(row.judgments)
        result.append(item)
    return result


@router.post("/queries", response_model=BenchmarkQueryOut, status_code=201)
def create_query(
    payload: BenchmarkQueryCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_reviewer),
):
    row = BenchmarkQuery(
        query_text=payload.query_text.strip(),
        category=payload.category,
        notes=payload.notes,
        reference_answer=payload.reference_answer,
        created_by=user.id,
    )
    db.add(row)
    record_audit(db, user, "evaluation.query.create", "benchmark_query", None, payload.model_dump(), request.client.host if request.client else None)
    db.commit()
    db.refresh(row)
    item = BenchmarkQueryOut.model_validate(row)
    item.judgment_count = 0
    return item


@router.patch("/queries/{query_id}", response_model=BenchmarkQueryOut)
def update_query(
    query_id: str,
    payload: BenchmarkQueryCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_reviewer),
):
    row = db.get(BenchmarkQuery, query_id)
    if not row:
        raise HTTPException(status_code=404, detail="Benchmark query not found")
    row.query_text = payload.query_text.strip()
    row.category = payload.category
    row.notes = payload.notes
    row.reference_answer = payload.reference_answer
    record_audit(db, user, "evaluation.query.update", "benchmark_query", row.id, payload.model_dump())
    db.commit()
    item = BenchmarkQueryOut.model_validate(row)
    item.judgment_count = len(row.judgments)
    return item


@router.delete("/queries/{query_id}")
def delete_query(
    query_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_reviewer),
):
    row = db.get(BenchmarkQuery, query_id)
    if not row:
        raise HTTPException(status_code=404, detail="Benchmark query not found")
    record_audit(db, user, "evaluation.query.delete", "benchmark_query", row.id, {"query": row.query_text})
    db.delete(row)
    db.commit()
    return {"message": "Benchmark query and its judgments were deleted"}


@router.get("/queries/{query_id}/judgments", response_model=list[JudgmentOut])
def list_judgments(
    query_id: str, db: Session = Depends(get_db), _user: User = Depends(require_reviewer)
):
    if not db.get(BenchmarkQuery, query_id):
        raise HTTPException(status_code=404, detail="Benchmark query not found")
    rows = (
        db.query(RelevanceJudgment)
        .filter(RelevanceJudgment.query_id == query_id)
        .order_by(RelevanceJudgment.created_at)
        .all()
    )
    items = []
    for row in rows:
        item = JudgmentOut.model_validate(row)
        if row.section_id:
            section = db.get(Section, row.section_id)
            if section:
                item.section_number = section.section_number
                item.page_start = section.page_start
                item.page_end = section.page_end
                document = db.get(Document, section.document_id)
                item.document_title = document.title if document else None
        items.append(item)
    return items


@router.post("/queries/{query_id}/judgments", response_model=JudgmentOut, status_code=201)
def upsert_judgment(
    query_id: str,
    payload: JudgmentCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_reviewer),
):
    query = db.get(BenchmarkQuery, query_id)
    if not query:
        raise HTTPException(status_code=404, detail="Benchmark query not found")
    if payload.section_id:
        section = db.get(Section, payload.section_id)
        if not section:
            raise HTTPException(status_code=404, detail="Section not found")
    existing = (
        db.query(RelevanceJudgment)
        .filter(
            RelevanceJudgment.query_id == query_id,
            RelevanceJudgment.section_id == payload.section_id,
        )
        .first()
    )
    if existing:
        existing.grade = payload.grade
        existing.notes = payload.notes
        existing.judged_by = user.id
        row = existing
    else:
        row = RelevanceJudgment(
            query_id=query_id,
            section_id=payload.section_id,
            grade=payload.grade,
            notes=payload.notes,
            judged_by=user.id,
        )
        db.add(row)
    record_audit(
        db,
        user,
        "evaluation.judgment.upsert",
        "relevance_judgment",
        query_id,
        {"section_id": payload.section_id, "grade": payload.grade},
    )
    db.commit()
    db.refresh(row)
    item = JudgmentOut.model_validate(row)
    if row.section_id:
        section = db.get(Section, row.section_id)
        if section:
            item.section_number = section.section_number
            item.page_start = section.page_start
            item.page_end = section.page_end
            document = db.get(Document, section.document_id)
            item.document_title = document.title if document else None
    return item


@router.delete("/judgments/{judgment_id}")
def delete_judgment(
    judgment_id: str, db: Session = Depends(get_db), user: User = Depends(require_reviewer)
):
    row = db.get(RelevanceJudgment, judgment_id)
    if not row:
        raise HTTPException(status_code=404, detail="Judgment not found")
    record_audit(db, user, "evaluation.judgment.delete", "relevance_judgment", judgment_id, {})
    db.delete(row)
    db.commit()
    return {"message": "Judgment deleted"}


@router.get("/sections")
def search_sections(
    q: str = Query(min_length=2),
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    _user: User = Depends(require_reviewer),
):
    term = f"%{q.lower()}%"
    rows = (
        db.query(Section, Document)
        .join(Document, Document.id == Section.document_id)
        .filter(
            or_(
                Section.heading.ilike(term),
                Section.normalized_text.ilike(term),
                Section.section_number.ilike(term),
                Document.title.ilike(term),
                Document.ordinance_number.ilike(term),
            )
        )
        .order_by(Document.year.desc().nullslast(), Section.order_index)
        .limit(limit)
        .all()
    )
    return [
        {
            "section_id": section.id,
            "document_id": document.id,
            "document_title": document.title,
            "ordinance_number": document.ordinance_number,
            "section_number": section.section_number,
            "heading": section.heading,
            "page_start": section.page_start,
            "page_end": section.page_end,
            "excerpt": (section.corrected_text or section.normalized_text)[:300],
        }
        for section, document in rows
    ]


@router.post("/experiments", response_model=list[ExperimentOut], status_code=201)
def run_retrieval_experiment(
    payload: ExperimentRun,
    db: Session = Depends(get_db),
    user: User = Depends(require_admin),
):
    try:
        rows = run_experiment(db, payload.name, payload.configurations, payload.top_k, user.id, payload.notes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    record_audit(
        db,
        user,
        "evaluation.experiment.run",
        "retrieval_experiment",
        rows[0].id if rows else None,
        {"name": payload.name, "configurations": payload.configurations, "top_k": payload.top_k},
    )
    db.commit()
    return rows


@router.get("/experiments", response_model=list[ExperimentOut])
def list_experiments(
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    _user: User = Depends(require_reviewer),
):
    rows = (
        db.query(RetrievalExperiment)
        .order_by(RetrievalExperiment.created_at.desc())
        .limit(limit)
        .all()
    )
    return rows


@router.get("/experiments/{experiment_id}", response_model=ExperimentOut)
def get_experiment(
    experiment_id: str, db: Session = Depends(get_db), _user: User = Depends(require_reviewer)
):
    row = db.get(RetrievalExperiment, experiment_id)
    if not row:
        raise HTTPException(status_code=404, detail="Experiment not found")
    return row


@router.get("/experiments/{experiment_id}/export.csv")
def export_experiment(
    experiment_id: str, db: Session = Depends(get_db), _user: User = Depends(require_reviewer)
):
    row = db.get(RetrievalExperiment, experiment_id)
    if not row:
        raise HTTPException(status_code=404, detail="Experiment not found")
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["query_id", "query_text", "category", "rank", "retrieved_section_id", "score", "relevant", "grade"])
    for result in row.results_json:
        for rank, section_id in enumerate(result.get("retrieved", []), start=1):
            writer.writerow(
                [
                    result.get("query_id"),
                    result.get("query_text"),
                    result.get("category"),
                    rank,
                    section_id,
                    result.get("scores", [])[rank - 1] if rank - 1 < len(result.get("scores", [])) else "",
                    section_id in result.get("relevant_section_ids", []),
                    result.get("grades", {}).get(section_id, 0),
                ]
            )
    buffer.seek(0)
    filename = f"experiment-{experiment_id}.csv"
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/queries-export.csv")
def export_benchmark(db: Session = Depends(get_db), _user: User = Depends(require_reviewer)):
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["query_id", "query_text", "category", "section_id", "grade", "notes"])
    for query in db.query(BenchmarkQuery).order_by(BenchmarkQuery.created_at).all():
        if not query.judgments:
            writer.writerow([query.id, query.query_text, query.category, "", "", ""])
        for judgment in query.judgments:
            writer.writerow(
                [
                    query.id,
                    query.query_text,
                    query.category,
                    judgment.section_id or "",
                    judgment.grade,
                    judgment.notes or "",
                ]
            )
    buffer.seek(0)
    return StreamingResponse(
        iter([buffer.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="benchmark-queries.csv"'},
    )


@router.post("/queries-import")
async def import_benchmark(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_reviewer),
):
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="CSV exceeds 5 MB")
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise HTTPException(status_code=400, detail="CSV must be UTF-8 encoded") from exc
    reader = csv.DictReader(io.StringIO(text))
    required = {"query_text"}
    if not reader.fieldnames or not required.issubset({name.strip() for name in reader.fieldnames}):
        raise HTTPException(status_code=400, detail="CSV must include a query_text column")
    created_queries = 0
    created_judgments = 0
    errors: list[str] = []
    for line_number, row in enumerate(reader, start=2):
        query_text = (row.get("query_text") or "").strip()
        if not query_text:
            errors.append(f"Line {line_number}: missing query_text")
            continue
        query = db.query(BenchmarkQuery).filter(BenchmarkQuery.query_text == query_text).first()
        if not query:
            query = BenchmarkQuery(
                query_text=query_text,
                category=(row.get("category") or "imported").strip(),
                notes=(row.get("notes") or "").strip() or None,
                created_by=user.id,
            )
            db.add(query)
            db.flush()
            created_queries += 1
        section_id = (row.get("section_id") or "").strip() or None
        grade_raw = (row.get("grade") or "").strip()
        if not grade_raw and not section_id:
            continue
        try:
            grade = int(grade_raw or "0")
        except ValueError:
            errors.append(f"Line {line_number}: grade must be an integer")
            continue
        if not 0 <= grade <= 3:
            errors.append(f"Line {line_number}: grade must be 0-3")
            continue
        if section_id and not db.get(Section, section_id):
            errors.append(f"Line {line_number}: section_id not found")
            continue
        existing = (
            db.query(RelevanceJudgment)
            .filter(
                RelevanceJudgment.query_id == query.id,
                RelevanceJudgment.section_id == section_id,
            )
            .first()
        )
        if existing:
            existing.grade = grade
        else:
            db.add(
                RelevanceJudgment(
                    query_id=query.id,
                    section_id=section_id,
                    grade=grade,
                    notes=(row.get("notes") or "").strip() or None,
                    judged_by=user.id,
                )
            )
            created_judgments += 1
    record_audit(
        db,
        user,
        "evaluation.benchmark.import",
        "benchmark",
        None,
        {"queries": created_queries, "judgments": created_judgments, "errors": len(errors)},
    )
    db.commit()
    return {
        "message": "Benchmark import completed",
        "created_queries": created_queries,
        "created_judgments": created_judgments,
        "errors": errors,
    }


@router.post("/quality", response_model=QualityEvaluationOut, status_code=201)
def submit_quality_evaluation(
    payload: QualityEvaluationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_reviewer),
):
    row = QualityEvaluation(
        evaluator_name=payload.evaluator_name,
        evaluator_role=payload.evaluator_role,
        scores=payload.scores,
        comments=payload.comments,
        is_test_data=payload.is_test_data,
    )
    db.add(row)
    record_audit(db, user, "quality.evaluation.submit", "quality_evaluation", None, {"test": payload.is_test_data})
    db.commit()
    db.refresh(row)
    return row


@router.get("/quality/summary")
def quality_summary(db: Session = Depends(get_db), _user: User = Depends(require_reviewer)):
    rows = db.query(QualityEvaluation).all()
    result: dict = {"total": len(rows), "real": {}, "test": {}}
    for label, is_test in (("real", False), ("test", True)):
        subset = [row for row in rows if row.is_test_data is is_test]
        by_characteristic: dict[str, list[int]] = defaultdict(list)
        for row in subset:
            for key, value in (row.scores or {}).items():
                if isinstance(value, int):
                    by_characteristic[key].append(value)
        averages = {
            key: round(sum(values) / len(values), 2) for key, values in sorted(by_characteristic.items())
        }
        overall_values = [value for values in by_characteristic.values() for value in values]
        result[label] = {
            "responses": len(subset),
            "averages": averages,
            "overall_mean": round(sum(overall_values) / len(overall_values), 2) if overall_values else None,
        }
    result["responses"] = [
        {
            "id": row.id,
            "evaluator_name": row.evaluator_name,
            "evaluator_role": row.evaluator_role,
            "scores": row.scores,
            "comments": row.comments,
            "is_test_data": row.is_test_data,
            "created_at": row.created_at,
        }
        for row in rows
    ]
    return result


@router.get("/quality", response_model=list[QualityEvaluationOut])
def list_quality(
    db: Session = Depends(get_db), _user: User = Depends(require_reviewer)
):
    return db.query(QualityEvaluation).order_by(QualityEvaluation.created_at.desc()).all()
