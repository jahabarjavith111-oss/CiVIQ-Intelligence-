import os

os.environ["DATABASE_URL"] = "sqlite:///./data/test.db"

import pytest
from fastapi.testclient import TestClient

from app import models  # noqa: F401
from app.db import Base, get_engine


@pytest.fixture(scope="session")
def client():
    if os.path.exists("./data/test.db"):
        os.remove("./data/test.db")
    os.makedirs("./data", exist_ok=True)
    Base.metadata.create_all(bind=get_engine())
    from app.main import app

    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def auth(client):
    r = client.post("/api/auth/register", json={
        "email": "tester@civiq.ai", "password": "test1234", "name": "Tester"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert set(body) == {"user", "accessToken", "refreshToken"}
    assert body["user"]["email"] == "tester@civiq.ai"
    # promote like the demo project-manager so write paths are exercised
    from app.db import get_session_local
    from app.models.user import User

    db = get_session_local()()
    try:
        u = db.query(User).filter(User.email == "tester@civiq.ai").first()
        u.role = "project-manager"
        db.commit()
    finally:
        db.close()
    return {"headers": {"Authorization": f"Bearer {body['accessToken']}"},
            "refresh": body["refreshToken"], "user": body["user"]}


@pytest.fixture(scope="session")
def project(client, auth):
    r = client.post("/api/projects", json={"name": "Test Tower", "startDate": "2026-01-01",
                                           "budget": 1000000}, headers=auth["headers"])
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["startDate"] == "2026-01-01"  # camelCase wire format
    assert body["settings"]["units"] == "metric"
    return body
