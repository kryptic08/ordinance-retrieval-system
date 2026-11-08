from conftest import digital_pdf, upload_and_process


def _activate_sample(client, tmp_path):
    pdf = digital_pdf(tmp_path / "evaluation.pdf", ordinance_number="2024-30")
    document = upload_and_process(client, pdf, fields={"year": "2024"})
    assert client.post(f"/api/admin/documents/{document['id']}/activate?active=true").status_code == 200
    return document


def test_benchmark_query_judgment_and_experiment(admin_client, tmp_path):
    document = _activate_sample(admin_client, tmp_path)
    section_two = next(section for section in document["sections"] if section["section_number"] == "2")

    found = admin_client.get("/api/evaluation/sections?q=curfew")
    assert found.status_code == 200
    assert any(row["section_id"] == section_two["id"] for row in found.json())

    created = admin_client.post(
        "/api/evaluation/queries",
        json={
            "query_text": "Are businesses allowed to operate after midnight?",
            "category": "paraphrase",
            "notes": "Curfew provision",
            "reference_answer": "Only exempt establishments may operate during the curfew window.",
        },
    )
    assert created.status_code == 201, created.text
    query = created.json()
    assert query["judgment_count"] == 0

    judgment = admin_client.post(
        f"/api/evaluation/queries/{query['id']}/judgments",
        json={"section_id": section_two["id"], "grade": 3, "notes": "Directly answers the query."},
    )
    assert judgment.status_code == 201, judgment.text
    judgment_body = judgment.json()
    assert judgment_body["grade"] == 3
    assert judgment_body["section_number"] == "2"
    assert judgment_body["document_title"]
    assert judgment_body["page_start"] == 2

    judgments = admin_client.get(f"/api/evaluation/queries/{query['id']}/judgments")
    assert judgments.status_code == 200
    assert len(judgments.json()) == 1
    assert judgments.json()[0]["document_title"]

    duplicate = admin_client.post(
        f"/api/evaluation/queries/{query['id']}/judgments",
        json={"section_id": section_two["id"], "grade": 2},
    )
    assert duplicate.status_code == 201
    assert admin_client.get(f"/api/evaluation/queries/{query['id']}/judgments").json()[0]["grade"] == 2

    admin_client.post(
        f"/api/evaluation/queries/{query['id']}/judgments",
        json={"section_id": section_two["id"], "grade": 3},
    )

    experiment = admin_client.post(
        "/api/evaluation/experiments",
        json={
            "name": "Automated test run",
            "configurations": ["keyword", "hybrid"],
            "top_k": 5,
            "notes": "Pytest experiment",
        },
    )
    assert experiment.status_code == 201, experiment.text
    rows = experiment.json()
    assert len(rows) == 2
    keyword = next(row for row in rows if row["configuration"] == "keyword")
    assert keyword["status"] == "completed"
    assert keyword["metrics_json"]["queries"] == 1
    assert keyword["metrics_json"]["recall_at_k"] > 0.5
    assert keyword["results_json"][0]["retrieved"]
    assert keyword["results_json"][0]["citation_correct"] is True

    listed = admin_client.get("/api/evaluation/experiments")
    assert listed.status_code == 200
    assert len(listed.json()) == 2

    exported = admin_client.get(f"/api/evaluation/experiments/{keyword['id']}/export.csv")
    assert exported.status_code == 200
    assert "query_text" in exported.text

    benchmark_csv = admin_client.get("/api/evaluation/queries-export.csv")
    assert benchmark_csv.status_code == 200
    assert "query_id" in benchmark_csv.text


def test_benchmark_csv_import(admin_client, tmp_path):
    document = _activate_sample(admin_client, tmp_path)
    section_two = next(section for section in document["sections"] if section["section_number"] == "2")
    csv_text = (
        "query_text,category,section_id,grade,notes\n"
        f"curfew for businesses,exact,{section_two['id']},3,imported judgment\n"
        "unrelated query,negative,,,\n"
    )
    response = admin_client.post(
        "/api/evaluation/queries-import",
        files={"file": ("benchmark.csv", csv_text.encode("utf-8"), "text/csv")},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["created_queries"] == 2
    assert body["created_judgments"] == 1
    assert body["errors"] == []

    queries = admin_client.get("/api/evaluation/queries").json()
    assert {row["query_text"] for row in queries} == {"curfew for businesses", "unrelated query"}
    graded = next(row for row in queries if row["query_text"] == "curfew for businesses")
    assert graded["judgment_count"] == 1


def test_quality_evaluation_separates_test_data(admin_client):
    scores = {
        "functional_suitability": 5,
        "performance_efficiency": 4,
        "compatibility": 4,
        "usability": 5,
        "reliability": 4,
        "security": 5,
        "maintainability": 4,
        "portability": 3,
    }
    real = admin_client.post(
        "/api/evaluation/quality",
        json={"evaluator_name": "Evaluator A", "evaluator_role": "student", "scores": scores},
    )
    assert real.status_code == 201, real.text

    test = admin_client.post(
        "/api/evaluation/quality",
        json={
            "evaluator_name": "Test Entry",
            "scores": {"usability": 1},
            "is_test_data": True,
        },
    )
    assert test.status_code == 201

    invalid = admin_client.post(
        "/api/evaluation/quality",
        json={"evaluator_name": "Bad Scores", "scores": {"usability": 9}},
    )
    assert invalid.status_code == 422

    summary = admin_client.get("/api/evaluation/quality/summary")
    assert summary.status_code == 200
    body = summary.json()
    assert body["total"] == 2
    assert body["real"]["responses"] == 1
    assert body["test"]["responses"] == 1
    assert body["real"]["averages"]["usability"] == 5.0
    assert body["real"]["overall_mean"] == 4.25
    assert body["test"]["overall_mean"] == 1.0
