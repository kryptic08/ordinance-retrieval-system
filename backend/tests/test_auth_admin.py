from conftest import digital_pdf, upload_and_process


def test_health_and_public_endpoints_are_open(client):
    assert client.get("/api/system/health").status_code == 200
    assert client.get("/api/system/stats").status_code == 200
    assert client.get("/api/documents").status_code == 200


def test_admin_endpoints_require_authentication(client):
    for path in ("/api/admin/stats", "/api/admin/documents", "/api/admin/settings", "/api/admin/audit"):
        assert client.get(path).status_code == 401, path
    assert client.post("/api/admin/documents/upload").status_code == 401


def test_login_me_logout_cookie_flow(client):
    bad = client.post("/api/auth/login", json={"email": "admin@example.com", "password": "wrong-pass"})
    assert bad.status_code == 401

    good = client.post(
        "/api/auth/login",
        json={"email": "admin@example.com", "password": "AdminPass123!"},
    )
    assert good.status_code == 200
    assert "ors_token" in client.cookies
    me = client.get("/api/auth/me")
    assert me.status_code == 200
    assert me.json()["role"] == "admin"

    assert client.post("/api/auth/logout").status_code == 200
    assert client.get("/api/auth/me").status_code == 401


def test_admin_can_create_users_and_roles_are_enforced(admin_client):
    created = admin_client.post(
        "/api/auth/users",
        json={
            "email": "reviewer@example.com",
            "full_name": "Reviewer One",
            "password": "ReviewerPass123!",
            "role": "reviewer",
        },
    )
    assert created.status_code == 201, created.text
    assert created.json()["role"] == "reviewer"

    duplicate = admin_client.post(
        "/api/auth/users",
        json={
            "email": "reviewer@example.com",
            "full_name": "Reviewer One",
            "password": "ReviewerPass123!",
            "role": "reviewer",
        },
    )
    assert duplicate.status_code == 409

    users = admin_client.get("/api/auth/users")
    assert users.status_code == 200
    assert {user["email"] for user in users.json()} == {"admin@example.com", "reviewer@example.com"}

    admin_client.post("/api/auth/logout")
    login = admin_client.post(
        "/api/auth/login",
        json={"email": "reviewer@example.com", "password": "ReviewerPass123!"},
    )
    assert login.status_code == 200
    assert admin_client.get("/api/admin/documents").status_code == 200
    denied = admin_client.post(
        "/api/admin/documents/upload",
        files={"files": ("blocked.pdf", b"%PDF-1.4 blocked", "application/pdf")},
    )
    assert denied.status_code == 403


def test_admin_stats_and_settings(admin_client, tmp_path):
    pdf = digital_pdf(tmp_path / "stats.pdf", ordinance_number="2024-20")
    document = upload_and_process(admin_client, pdf, fields={"year": "2024"})

    stats = admin_client.get("/api/admin/stats")
    assert stats.status_code == 200
    body = stats.json()
    assert body["documents"]["total"] == 1
    assert body["documents"]["awaiting_review"] >= 1
    assert body["index"]["sections"] >= 4
    assert body["system"]["embedding_provider"] == "hashing"

    settings = admin_client.get("/api/admin/settings")
    assert settings.status_code == 200
    assert settings.json()["embedding"]["dimension"] == 384

    update = admin_client.patch("/api/admin/settings/retrieval", json={"top_k": 7, "min_score": 0.2})
    assert update.status_code == 200
    assert update.json()["retrieval"]["top_k"] == 7

    invalid = admin_client.patch("/api/admin/settings/retrieval", json={"min_score": 2})
    assert invalid.status_code == 422
    unknown = admin_client.patch("/api/admin/settings/chunking", json={"bogus": 1})
    assert unknown.status_code == 422

    queue = admin_client.get("/api/admin/ocr-queue")
    assert queue.status_code == 200
    assert any(row["id"] == document["id"] for row in queue.json())

    audit = admin_client.get("/api/admin/audit")
    assert audit.status_code == 200
    actions = {row["action"] for row in audit.json()["items"]}
    assert "document.upload" in actions
    assert "settings.retrieval.update" in actions


def test_approve_marks_sections_verified_but_not_active(admin_client, tmp_path):
    pdf = digital_pdf(tmp_path / "approve.pdf", ordinance_number="2024-21")
    document = upload_and_process(admin_client, pdf)

    approved = admin_client.post(f"/api/admin/documents/{document['id']}/approve")
    assert approved.status_code == 200, approved.text
    body = approved.json()
    assert body["status"] == "processed"
    assert body["is_active"] is False
    assert all(section["verification_status"] == "verified" for section in body["sections"])
