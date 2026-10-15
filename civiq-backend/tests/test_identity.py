"""Auth + projects + team + activity + notifications contract tests."""


def test_cors_preflight_allows_local_dev_ports(client):
    # Any localhost dev server (3000, 5173, …) must pass preflight, else the
    # browser blocks auth calls with an opaque network error.
    for origin in ("http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000"):
        r = client.options("/api/auth/register", headers={
            "Origin": origin,
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type,authorization",
        })
        assert r.status_code == 200, (origin, r.status_code, r.text)


def test_register_duplicate_reports_conflict(client, auth):
    r = client.post("/api/auth/register", json={
        "email": "tester@civiq.ai", "password": "test1234", "name": "Tester"})
    assert r.status_code == 409
    assert "already registered" in r.json()["detail"]


def test_login_and_me(client, auth, project):
    r = client.post("/api/auth/login", json={"email": "tester@civiq.ai", "password": "test1234"})
    assert r.status_code == 200
    token = r.json()["accessToken"]
    assert client.get("/api/auth/me").status_code == 401
    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.json()["email"] == "tester@civiq.ai"


def test_refresh_rotation(client, auth):
    r1 = client.post("/api/auth/refresh", json={"refreshToken": auth["refresh"]})
    assert r1.status_code == 200
    new_access = r1.json()["accessToken"]
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {new_access}"}).status_code == 200
    # old refresh token was rotated -> rejected
    r2 = client.post("/api/auth/refresh", json={"refreshToken": auth["refresh"]})
    assert r2.status_code == 401


def test_password_flows(client, auth):
    assert client.post("/api/auth/forgot-password", json={"email": "tester@civiq.ai"}).status_code == 200
    assert client.post("/api/auth/resend-verification", json={"email": "tester@civiq.ai"}).status_code == 200
    r = client.patch("/api/auth/profile", json={"name": "Tester Two"}, headers=auth["headers"])
    assert r.status_code == 200 and r.json()["name"] == "Tester Two"
    r = client.post("/api/auth/change-password",
                    json={"currentPassword": "test1234", "newPassword": "test5678"}, headers=auth["headers"])
    assert r.status_code == 200
    assert client.post("/api/auth/login",
                       json={"email": "tester@civiq.ai", "password": "test5678"}).status_code == 200


def test_projects_crud(client, auth, project):
    pid = project["id"]
    assert client.get(f"/api/projects/{pid}", headers=auth["headers"]).status_code == 200
    r = client.patch(f"/api/projects/{pid}", json={"status": "active"}, headers=auth["headers"])
    assert r.json()["status"] == "active"
    assert client.get(f"/api/projects/{pid}/health", headers=auth["headers"]).status_code == 200
    s = client.get(f"/api/projects/{pid}/summary", headers=auth["headers"]).json()
    assert {"progress", "health", "memberCount"} <= set(s)
    r = client.get("/api/projects", headers=auth["headers"]).json()
    assert {"data", "total", "page", "limit"} <= set(r)
    assert client.get(f"/api/projects/{pid}/settings", headers=auth["headers"]).json()["timezone"] == "Asia/Kolkata"
    r = client.patch(f"/api/projects/{pid}/settings", json={"timezone": "UTC"}, headers=auth["headers"])
    assert r.json()["timezone"] == "UTC"
    r = client.post(f"/api/projects/{pid}/duplicate", json={"name": "Copy"}, headers=auth["headers"])
    assert r.status_code == 201
    assert client.post(f"/api/projects/{pid}/archive", headers=auth["headers"]).status_code == 200
    exp = client.get(f"/api/projects/{pid}/export?format=csv", headers=auth["headers"])
    assert exp.status_code == 200


def test_team_and_feed(client, auth, project):
    pid = project["id"]
    team = client.get(f"/api/projects/{pid}/team", headers=auth["headers"]).json()
    assert len(team) >= 1
    inv = client.post(f"/api/projects/{pid}/team/invite",
                      json={"email": "mate@civiq.ai", "role": "engineer"}, headers=auth["headers"])
    assert inv.status_code == 201 and inv.json()["invited"] is True
    feed = client.get(f"/api/projects/{pid}/activity", headers=auth["headers"]).json()
    assert {"data", "total"} <= set(feed) and feed["total"] >= 1
    n = client.get("/api/notifications", headers=auth["headers"]).json()
    assert {"data", "total", "unread"} <= set(n)
    if n["data"]:
        assert client.post(f"/api/notifications/{n['data'][0]['id']}/read", headers=auth["headers"]).status_code == 200
    assert client.post("/api/notifications/read-all", headers=auth["headers"]).status_code == 200
    prefs = client.get("/api/notifications/preferences", headers=auth["headers"]).json()
    assert prefs["email"] is True
    r = client.patch("/api/notifications/preferences", json={"email": False}, headers=auth["headers"])
    assert r.json()["email"] is False
