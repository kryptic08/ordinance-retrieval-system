import math
from collections.abc import Iterable


def precision_at_k(retrieved: list[str], relevant: set[str], k: int) -> float:
    if k <= 0:
        return 0.0
    hits = sum(1 for item in retrieved[:k] if item in relevant)
    return hits / k


def recall_at_k(retrieved: list[str], relevant: set[str], k: int) -> float:
    if not relevant:
        return 0.0
    hits = sum(1 for item in retrieved[:k] if item in relevant)
    return hits / len(relevant)


def reciprocal_rank(retrieved: list[str], relevant: set[str]) -> float:
    for index, item in enumerate(retrieved, start=1):
        if item in relevant:
            return 1.0 / index
    return 0.0


def ndcg_at_k(retrieved: list[str], grades: dict[str, int], k: int) -> float:
    gains = [(2 ** grades.get(item, 0)) - 1 for item in retrieved[:k]]
    dcg = sum(gain / math.log2(index + 2) for index, gain in enumerate(gains))
    ideal = sorted(
        ((2 ** grade) - 1 for grade in grades.values() if grade > 0), reverse=True
    )
    idcg = sum(gain / math.log2(index + 2) for index, gain in enumerate(ideal[:k]))
    if idcg == 0:
        return 0.0
    return dcg / idcg


def percentile(values: Iterable[float], pct: float) -> float:
    data = sorted(float(value) for value in values)
    if not data:
        return 0.0
    if len(data) == 1:
        return data[0]
    position = (len(data) - 1) * pct / 100
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return data[lower]
    return data[lower] + (data[upper] - data[lower]) * (position - lower)


def aggregate_metrics(per_query: list[dict], k: int) -> dict:
    if not per_query:
        return {
            "queries": 0,
            "precision_at_k": 0,
            "recall_at_k": 0,
            "mrr": 0,
            "ndcg_at_k": 0,
            "median_latency_ms": 0,
            "p95_latency_ms": 0,
            "empty_retrieval_rate": 0,
            "citation_correct_rate": 0,
            "no_relevant_queries": 0,
            "no_relevant_empty_rate": 0,
        }
    count = len(per_query)
    no_relevant = [row for row in per_query if row["relevant_count"] == 0]
    no_relevant_empty = [row for row in no_relevant if not row["retrieved"]]
    latencies = [row["latency_ms"] for row in per_query]
    citation_values = [row["citation_correct"] for row in per_query if row.get("citation_checked")]
    return {
        "queries": count,
        "precision_at_k": round(sum(row["precision"] for row in per_query) / count, 4),
        "recall_at_k": round(
            sum(row["recall"] for row in per_query if row["relevant_count"] > 0)
            / max(1, count - len(no_relevant)),
            4,
        ),
        "mrr": round(
            sum(row["rr"] for row in per_query if row["relevant_count"] > 0)
            / max(1, count - len(no_relevant)),
            4,
        ),
        "ndcg_at_k": round(
            sum(row["ndcg"] for row in per_query if row["relevant_count"] > 0)
            / max(1, count - len(no_relevant)),
            4,
        ),
        "median_latency_ms": round(percentile(latencies, 50), 2),
        "p95_latency_ms": round(percentile(latencies, 95), 2),
        "empty_retrieval_rate": round(
            sum(1 for row in per_query if not row["retrieved"]) / count, 4
        ),
        "citation_correct_rate": round(
            sum(1 for value in citation_values if value) / max(1, len(citation_values)), 4
        ),
        "no_relevant_queries": len(no_relevant),
        "no_relevant_empty_rate": round(len(no_relevant_empty) / len(no_relevant), 4) if no_relevant else 0,
        "k": k,
    }
