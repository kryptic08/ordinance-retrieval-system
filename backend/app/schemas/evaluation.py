from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.schemas.common import ORMModel


class BenchmarkQueryCreate(BaseModel):
    query_text: str = Field(min_length=3, max_length=2000)
    category: str = "paraphrase"
    notes: str | None = None
    reference_answer: str | None = None


class BenchmarkQueryOut(ORMModel):
    id: str
    query_text: str
    category: str
    notes: str | None = None
    reference_answer: str | None = None
    is_active: bool
    created_at: datetime
    judgment_count: int = 0


class JudgmentCreate(BaseModel):
    section_id: str | None = None
    grade: int = Field(default=1, ge=0, le=3)
    notes: str | None = None


class JudgmentOut(ORMModel):
    id: str
    query_id: str
    section_id: str | None = None
    grade: int
    notes: str | None = None
    created_at: datetime
    section_number: str | None = None
    document_title: str | None = None
    page_start: int | None = None
    page_end: int | None = None


class ExperimentRun(BaseModel):
    name: str = Field(min_length=2, max_length=200)
    configurations: list[str] = Field(
        default_factory=lambda: ["keyword", "vector", "hybrid", "hybrid_rerank"]
    )
    top_k: int = Field(default=10, ge=1, le=50)
    notes: str | None = None

    @field_validator("configurations")
    @classmethod
    def valid_configurations(cls, value: list[str]) -> list[str]:
        allowed = {"keyword", "vector", "hybrid", "hybrid_rerank"}
        if not value or not set(value).issubset(allowed):
            raise ValueError("configurations must be a non-empty subset of keyword, vector, hybrid, hybrid_rerank")
        return value


class ExperimentOut(ORMModel):
    id: str
    name: str
    configuration: str
    config_json: dict
    dataset_json: list
    corpus_version: str
    embedding_model: str | None = None
    status: str
    metrics_json: dict
    results_json: list
    notes: str | None = None
    created_at: datetime
    finished_at: datetime | None = None


class QualityEvaluationCreate(BaseModel):
    evaluator_name: str = Field(min_length=2, max_length=200)
    evaluator_role: str | None = None
    scores: dict[str, int]
    comments: str | None = None
    is_test_data: bool = False

    @field_validator("scores")
    @classmethod
    def scores_in_range(cls, value: dict[str, int]) -> dict[str, int]:
        if not value:
            raise ValueError("scores cannot be empty")
        for key, score in value.items():
            if not isinstance(score, int) or score < 1 or score > 5:
                raise ValueError(f"score for {key} must be an integer from 1 to 5")
        return value


class QualityEvaluationOut(ORMModel):
    id: str
    evaluator_name: str
    evaluator_role: str | None = None
    questionnaire_version: str
    scores: dict
    comments: str | None = None
    is_test_data: bool
    created_at: datetime
