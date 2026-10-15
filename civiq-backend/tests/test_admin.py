"""Super-admin platform tests: RBAC, single-admin rule, suspend, audit, settings."""
import pytest


@pytest.fixture(scope="module")
def admin_user(client):
    r = client.post("/api/auth/register", json={
        "email": "admin-tester@civiq.ai", "password": "admin1234", "name": "Admin Tester"})
    assert r.status_code == 200, r.text
    uid = r.json()["user"]["id"]
    from app.db import get_session_local
    from app.models.user import User
    db = get_session_local()()
    try:
        u = db.get(User, uid)
        u.role = "admin"
        db.commit()
    finally:
        db.close()
    login = client.post("/api/auth/login", json={"email": "admin-tester@civiq.ai", "password": "admin1234"})
    assert login.status_code == 200
    return {"headers": {"Authorization": f"Bearer {login.json()['accessToken']}"}, "id": uid}


@pytest.fixture(scope="module")
def victim(client):
    r = client.post("/api/auth/register", json={
        "email": "victim@civiq.ai", "password": "victim1234", "name": "Victim"})
    assert r.status_code == 200, r.text
    return {"id": r.json()["user"]["id"]}


ADMIN_PATHS = ["/api/admin/overview", "/api/admin/users", "/api/admin/projects",
               "/api/admin/ai/analyses", "/api/admin/ai/usage", "/api/admin/health",
               "/api/admin/settings", "/api/admin/audit", "/api/admin/billing"]


def test_non_admin_forbidden_everywhere(client, auth):
    for path in ADMIN_PATHS:
        r = client.get(path, headers=auth["headers"])
        assert r.status_code == 403, (path, r.status_code)


def test_unauthenticated_rejected(client):
    assert client.get("/api/admin/overview").status_code in (401, 403)


def test_signup_role_ignored(client):
    r = client.post("/api/auth/register", json={
        "email": "sneaky@civiq.ai", "password": "sneaky1234", "name": "Sneaky",
        "role": "admin"})
    assert r.status_code == 200, r.text
    assert r.json()["user"]["role"] == "engineer"


def test_overview_shape(client, admin_user):
    body = client.get("/api/admin/overview", headers=admin_user["headers"]).json()
    assert {"users", "projects", "drawings", "copilot", "activity24h"} <= set(body)
    assert body["users"]["total"] >= 2


def test_user_search_and_suspend_flow(client, admin_user, victim):
    h = admin_user["headers"]
    found = client.get("/api/admin/users?search=victim", headers=h).json()
    assert found["total"] >= 1 and found["data"][0]["email"] == "victim@civiq.ai"

    s = client.post(f"/api/admin/users/{victim['id']}/suspend", headers=h)
    assert s.status_code == 200 and s.json()["isActive"] is False
    # full lockout even with the right password
    bad = client.post("/api/auth/login", json={"email": "victim@civiq.ai", "password": "victim1234"})
    assert bad.status_code == 401

    back = client.post(f"/api/admin/users/{victim['id']}/activate", headers=h)
    assert back.json()["isActive"] is True
    good = client.post("/api/auth/login", json={"email": "victim@civiq.ai", "password": "victim1234"})
    assert good.status_code == 200


def test_single_admin_enforced(client, admin_user, victim):
    h = admin_user["headers"]
    # no second admin
    r = client.patch(f"/api/admin/users/{victim['id']}", headers=h, json={"role": "admin"})
    assert r.status_code == 400
    # no self-demotion of the only admin
    r = client.patch(f"/api/admin/users/{admin_user['id']}", headers=h, json={"role": "engineer"})
    assert r.status_code == 400
    # no self-suspension
    r = client.post(f"/api/admin/users/{admin_user['id']}/suspend", headers=h)
    assert r.status_code == 400


def test_audit_trail_records_admin_actions(client, admin_user, victim):
    h = admin_user["headers"]
    client.post(f"/api/admin/users/{victim['id']}/suspend", headers=h)
    client.post(f"/api/admin/users/{victim['id']}/activate", headers=h)
    rows = client.get("/api/admin/audit?action=user.suspended", headers=h).json()
    assert rows["total"] >= 1
    assert rows["data"][0]["actorRole"] == "admin"


def test_settings_crud_and_validation(client, admin_user):
    h = admin_user["headers"]
    keys = [s["key"] for s in client.get("/api/admin/settings", headers=h).json()]
    assert {"upload.max_mb", "ai.provider", "ai.model", "announcement"} <= set(keys)
    r = client.put("/api/admin/settings", headers=h,
                   json={"key": "upload.max_mb", "value": {"value": 250}})
    assert r.status_code == 200 and r.json()["value"] == 250
    bad = client.put("/api/admin/settings", headers=h,
                     json={"key": "upload.max_mb", "value": {"value": 9999}})
    assert bad.status_code == 400
    unknown = client.put("/api/admin/settings", headers=h,
                         json={"key": "nope", "value": {"value": 1}})
    assert unknown.status_code == 400


def test_billing_stub_and_health(client, admin_user):
    h = admin_user["headers"]
    assert client.get("/api/admin/billing", headers=h).json()["enabled"] is False
    health = client.get("/api/admin/health", headers=h).json()
    assert health["database"]["ok"] is True
    assert {"app", "env", "storage", "redis", "ai"} <= set(health)
