from conftest import digital_pdf, upload_and_process, write_pdf


def test_digital_upload_activates_review_workflow_and_searches(admin_client, tmp_path):
    pdf = digital_pdf(tmp_path / "sample_2024-09.pdf")
    document = upload_and_process(
        admin_client,
        pdf,
        fields={"year": "2024", "document_type": "Ordinance", "jurisdiction": "Testville"},
    )

    assert document["status"] == "needs_review"
    assert document["is_active"] is False
    assert document["ordinance_number"] == "2024-09"
    assert "REGULATING THE OPERATION OF BUSINESS ESTABLISHMENTS" in document["title"]
    assert document["page_count"] == 3
    assert document["section_count"] >= 4
    assert len(document["signatories"]) == 2
    assert document["signatories"][0]["name"] == "JUAN DELA CRUZ"
    assert document["signatories"][0]["verified"] is False
    assert document["pages"][0]["reviewed_at"] is None

    public_before = admin_client.post(
        "/api/search",
        json={"query": "business establishments after midnight", "configuration": "keyword"},
    )
    assert public_before.status_code == 200
    assert public_before.json()["total"] == 0
    assert admin_client.get("/api/documents").json()["total"] == 0

    activate = admin_client.post(f"/api/admin/documents/{document['id']}/activate?active=true")
    assert activate.status_code == 200, activate.text

    response = admin_client.post(
        "/api/search",
        json={
            "query": "Are businesses allowed to operate after midnight?",
            "configuration": "hybrid",
            "top_k": 5,
        },
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["total"] >= 1
    assert body["top_score"] is not None
    top = body["results"][0]
    assert top["document"]["id"] == document["id"]
    assert top["section_number"] == "2"
    assert top["page_start"] == 2
    assert top["pdf_url"].endswith("#page=2")
    assert "midnight" in top["text"].lower()
    assert body["took_ms"] >= 0
    assert body["answer"] is not None
    assert body["answer"]["mode"] == "extractive"
    assert body["answer"]["claims"]
    assert body["answer"]["claims"][0]["citation_url"].endswith("#page=2")

    public_after = admin_client.get("/api/documents")
    assert public_after.status_code == 200
    assert public_after.json()["total"] == 1


def test_detail_question_returns_cited_extractive_answer(admin_client, tmp_path):
    pdf = write_pdf(
        tmp_path / "landfill_2025-20.pdf",
        [
            [
                "REPUBLIC OF THE PHILIPPINES",
                "MUNICIPALITY OF TESTVILLE",
                "SANGGUNIANG BAYAN",
                "ORDINANCE NO. 2025-20",
                "AN ORDINANCE ESTABLISHING THE MUNICIPAL SANITARY LANDFILL",
                "AND PROVIDING FOR ITS OPERATION AND FUNDING",
                "BE IT ENACTED by the Sangguniang Bayan in session assembled:",
            ],
            [
                "SECTION 1. Establishment. There is hereby established a sanitary landfill in",
                "Barangay Malinis to serve the solid waste disposal needs of the Municipality.",
                "SECTION 2. Purpose. The sanitary landfill shall serve as the final disposal",
                "facility for residual solid waste collected from all barangays.",
                "SECTION 3. Funding. The landfill project shall be funded through a loan",
                "approved by the Sangguniang Bayan for the acquisition and development of the site.",
                "SECTION 4. Operation. The Municipal Environment Office shall operate and maintain",
                "the landfill and shall implement the approved waste acceptance procedures.",
                "SECTION 5. Penalties. Any violation of this Ordinance shall be punished by a fine",
                "of Ten Thousand Pesos and suspension of the offender's disposal privileges.",
            ],
        ],
    )
    document = upload_and_process(
        admin_client,
        pdf,
        fields={"year": "2025", "document_type": "Ordinance", "jurisdiction": "Testville"},
    )
    admin_client.post(f"/api/admin/documents/{document['id']}/activate?active=true")

    response = admin_client.post(
        "/api/search",
        json={"query": "Details of the landfill", "configuration": "hybrid", "top_k": 5},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    answer = body["answer"]
    assert answer is not None
    assert answer["mode"] == "extractive"
    assert 1 <= len(answer["claims"]) <= 4
    assert any("landfill" in claim["claim"].lower() for claim in answer["claims"])
    assert all(claim["citation_url"].endswith("#page=2") for claim in answer["claims"])
    assert all(claim["page_start"] == 2 for claim in answer["claims"])
    assert all(claim["document_id"] == document["id"] for claim in answer["claims"])
    assert "not a generated legal opinion" in answer["disclaimer"]

    answer_endpoint = admin_client.post(
        "/api/search/answer",
        json={"query": "Details of the landfill", "configuration": "hybrid", "top_k": 5},
    )
    assert answer_endpoint.status_code == 200, answer_endpoint.text
    answer_body = answer_endpoint.json()
    assert answer_body["mode"] == "extractive"
    assert answer_body["claims"] == answer["claims"]
    assert answer_body["passages"] == body["results"]


def test_keyword_search_finds_penalties_and_filters(admin_client, tmp_path):
    pdf = digital_pdf(tmp_path / "sample_2024-10.pdf", ordinance_number="2024-10")
    document = upload_and_process(
        admin_client,
        pdf,
        fields={"year": "2024", "document_type": "Ordinance"},
    )
    admin_client.post(f"/api/admin/documents/{document['id']}/activate?active=true")

    response = admin_client.post(
        "/api/search",
        json={"query": "penalty fine Five Thousand Pesos", "configuration": "keyword", "top_k": 10},
    )
    assert response.status_code == 200
    results = response.json()["results"]
    assert results
    assert any(result["section_number"] == "3" for result in results)

    filtered = admin_client.post(
        "/api/search",
        json={
            "query": "penalty fine",
            "configuration": "keyword",
            "filters": {"year": 1999},
        },
    )
    assert filtered.status_code == 200
    assert filtered.json()["total"] == 0

    by_id = admin_client.post(
        "/api/search",
        json={
            "query": "penalty fine",
            "configuration": "keyword",
            "filters": {"document_id": document["id"]},
        },
    )
    assert by_id.json()["total"] >= 1


def test_no_result_search_returns_guidance(admin_client, tmp_path):
    pdf = digital_pdf(tmp_path / "sample_2024-11.pdf", ordinance_number="2024-11")
    document = upload_and_process(admin_client, pdf)
    admin_client.post(f"/api/admin/documents/{document['id']}/activate?active=true")

    response = admin_client.post(
        "/api/search",
        json={"query": "zebra quantum blockchain orchestra", "configuration": "keyword"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 0
    assert body["message"]
    assert body["suggestions"]
    assert body["top_score"] is None
    assert body["answer"] is None


def test_duplicate_and_invalid_uploads_are_rejected(admin_client, tmp_path):
    pdf = digital_pdf(tmp_path / "duplicate.pdf", ordinance_number="2024-12")
    first = upload_and_process(admin_client, pdf)

    with pdf.open("rb") as handle:
        duplicate = admin_client.post(
            "/api/admin/documents/upload",
            files={"files": (pdf.name, handle.read(), "application/pdf")},
        )
    assert duplicate.status_code == 201
    item = duplicate.json()["items"][0]
    assert item["ok"] is False
    assert item["duplicate_of"] == first["id"]

    invalid = admin_client.post(
        "/api/admin/documents/upload",
        files={"files": ("not-a-pdf.pdf", b"this is not a pdf", "application/pdf")},
    )
    assert invalid.status_code == 201
    invalid_item = invalid.json()["items"][0]
    assert invalid_item["ok"] is False
    assert "PDF" in (invalid_item["error"] or "")


def test_section_and_page_corrections_are_versioned(admin_client, tmp_path):
    pdf = digital_pdf(tmp_path / "correction.pdf", ordinance_number="2024-13")
    document = upload_and_process(admin_client, pdf)
    section_two = next(section for section in document["sections"] if section["section_number"] == "2")

    correction = admin_client.patch(
        f"/api/admin/documents/{document['id']}/sections/{section_two['id']}",
        json={
            "corrected_text": (
                "SECTION 2. Curfew for Business Operations. No business establishment shall operate "
                "between midnight and five o'clock in the morning, except drugstores and hospitals."
            ),
            "reason": "Verified against the original PDF.",
        },
    )
    assert correction.status_code == 200, correction.text
    assert correction.json()["section"]["verification_status"] == "corrected"
    assert correction.json()["section"]["chunk_count"] >= 1

    page = document["pages"][1]
    page_correction = admin_client.patch(
        f"/api/admin/documents/{document['id']}/pages/{page['page_number']}",
        json={
            "corrected_text": page["normalized_text"] + "\nReviewed page text.",
            "reason": "Manual OCR check.",
            "approve": True,
        },
    )
    assert page_correction.status_code == 200, page_correction.text
    assert page_correction.json()["reviewed_at"] is not None

    refreshed = admin_client.get(f"/api/admin/documents/{document['id']}").json()
    corrected_page = next(row for row in refreshed["pages"] if row["page_number"] == page["page_number"])
    assert corrected_page["reviewed_by"] is not None
    assert "Reviewed page text." in corrected_page["corrected_text"]

    revisions = admin_client.get(f"/api/admin/revisions/{document['id']}")
    assert revisions.status_code == 200
    fields = {row["field"] for row in revisions.json()}
    assert {"section_text", "page_text"}.issubset(fields)

    admin_client.post(f"/api/admin/documents/{document['id']}/activate?active=true")
    search = admin_client.post(
        "/api/search",
        json={"query": "five o'clock in the morning", "configuration": "keyword"},
    )
    assert search.status_code == 200
    assert search.json()["total"] >= 1
    assert "five o'clock" in search.json()["results"][0]["text"].lower()


def test_signatory_verification_and_reindex(admin_client, tmp_path):
    pdf = digital_pdf(tmp_path / "signatory.pdf", ordinance_number="2024-14")
    document = upload_and_process(admin_client, pdf)
    signatory = document["signatories"][0]

    update = admin_client.patch(
        f"/api/admin/signatories/{signatory['id']}",
        json={"name": "JUAN DELA CRUZ", "title": "City Mayor", "verified": True},
    )
    assert update.status_code == 200
    assert update.json()["verified"] is True

    job = admin_client.post(f"/api/admin/documents/{document['id']}/jobs?mode=reindex")
    assert job.status_code == 202, job.text
    from app.ingestion.pipeline import process_job_by_id

    process_job_by_id(job.json()["id"])

    refreshed = admin_client.get(f"/api/admin/documents/{document['id']}").json()
    assert refreshed["signatories"][0]["verified"] is True
    assert refreshed["jobs"][0]["status"] == "succeeded"
    assert refreshed["section_count"] >= 4


def test_metadata_update_and_delete(admin_client, tmp_path):
    pdf = digital_pdf(tmp_path / "delete.pdf", ordinance_number="2024-15")
    document = upload_and_process(admin_client, pdf)

    updated = admin_client.patch(
        f"/api/admin/documents/{document['id']}",
        json={
            "title": "Corrected Ordinance Title",
            "category": "Public safety",
            "lgu": "City of Testville",
            "notes": "Reviewed metadata.",
        },
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Corrected Ordinance Title"
    assert updated.json()["category"] == "Public safety"

    bad_delete = admin_client.delete(f"/api/admin/documents/{document['id']}?confirm=wrong")
    assert bad_delete.status_code == 400

    deleted = admin_client.delete(f"/api/admin/documents/{document['id']}?confirm={document['id']}")
    assert deleted.status_code == 200
    assert admin_client.get(f"/api/admin/documents/{document['id']}").status_code == 404
