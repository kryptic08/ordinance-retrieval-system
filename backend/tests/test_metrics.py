import pytest

from app.evaluation.metrics import (
    aggregate_metrics,
    ndcg_at_k,
    precision_at_k,
    percentile,
    recall_at_k,
    reciprocal_rank,
)


def test_precision_and_recall_at_k():
    retrieved = ["a", "x", "b", "y"]
    relevant = {"a", "b", "c"}
    assert precision_at_k(retrieved, relevant, 4) == 0.5
    assert recall_at_k(retrieved, relevant, 4) == pytest.approx(2 / 3)
    assert recall_at_k(retrieved, set(), 4) == 0.0


def test_reciprocal_rank():
    assert reciprocal_rank(["x", "y", "a"], {"a"}) == pytest.approx(1 / 3)
    assert reciprocal_rank(["x", "y"], {"a"}) == 0.0


def test_ndcg_rewards_higher_grades_and_earlier_positions():
    grades = {"a": 3, "b": 1}
    perfect = ndcg_at_k(["a", "b"], grades, 5)
    weaker = ndcg_at_k(["b", "a"], grades, 5)
    assert perfect == pytest.approx(1.0)
    assert 0 < weaker < perfect
    assert ndcg_at_k(["z"], {}, 5) == 0.0


def test_percentile_and_aggregate_metrics():
    assert percentile([10, 20, 30, 40], 50) == 25
    per_query = [
        {
            "retrieved": ["a"],
            "relevant_count": 1,
            "precision": 0.2,
            "recall": 1.0,
            "rr": 1.0,
            "ndcg": 1.0,
            "latency_ms": 10.0,
            "citation_checked": True,
            "citation_correct": True,
        },
        {
            "retrieved": [],
            "relevant_count": 0,
            "precision": 0.0,
            "recall": 0.0,
            "rr": 0.0,
            "ndcg": 0.0,
            "latency_ms": 30.0,
            "citation_checked": False,
            "citation_correct": True,
        },
    ]
    metrics = aggregate_metrics(per_query, 5)
    assert metrics["queries"] == 2
    assert metrics["precision_at_k"] == 0.1
    assert metrics["recall_at_k"] == 1.0
    assert metrics["mrr"] == 1.0
    assert metrics["no_relevant_queries"] == 1
    assert metrics["no_relevant_empty_rate"] == 1.0
    assert metrics["citation_correct_rate"] == 1.0
    assert metrics["median_latency_ms"] == 20.0
    assert metrics["k"] == 5
