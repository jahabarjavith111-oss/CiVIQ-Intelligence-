"""Coordination + revisions + reports/documents + drawings + models contract tests."""

PDF = (b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
       b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
       b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj\n"
       b"trailer<</Root 1 0 R>>")


def test_coordination_flow(client, auth, project):
    pid, h = project["id"], auth["headers"]
    c = client.post(f"/api/projects/{pid}/coordination/conflicts",
                    json={"type": "structural-vs-mep", "severity": "critical",
                          "title": "B vs D", "description": "clash"}, headers=h)
    assert c.status_code == 201
    cid = c.json()["id"]
    assert client.post(f"/api/coordination/conflicts/{cid}/assign", json={"userId": "u-2"}, headers=h).json()["status"] == "in-review"
    r = client.patch(f"/api/coordination/conflicts/{cid}/status",
                     json={"status": "resolved", "resolution": "rerouted"}, headers=h)
    assert r.json()["status"] == "resolved"
    cm = client.post(f"/api/coordination/conflicts/{cid}/comments", json={"content": "noted"}, headers=h)
    assert cm.status_code == 201
    assert client.patch(f"/api/coordination/comments/{cm.json()['id']}", json={"content": "noted!"},
                        headers=h).status_code == 200
    s = client.get(f"/api/projects/{pid}/coordination/summary", headers=h).json()
    assert s["total"] >= 1 and s["openCritical"] == 0
    assert client.get(f"/api/projects/{pid}/coordination/matrix", headers=h).status_code == 200
    assert client.get(f"/api/projects/{pid}/coordination/trends", headers=h).status_code == 200
    assert client.get(f"/api/projects/{pid}/coordination/export?format=csv", headers=h).status_code == 200
    assert client.get(f"/api/projects/{pid}/coordination/export?format=bcf", headers=h).status_code == 200


def test_revisions_flow(client, auth, project):
    pid, h = project["id"], auth["headers"]
    r = client.post(f"/api/projects/{pid}/revisions",
                    json={"fromVersion": 1, "toVersion": 2, "title": "V1V2", "type": "drawing"}, headers=h)
    assert r.status_code == 201
    rid = r.json()["id"]
    assert r.json()["impacts"]["cost"]["magnitude"] == "none"
    assert client.post(f"/api/revisions/{rid}/submit", headers=h).json()["status"] == "submitted"
    assert client.post(f"/api/revisions/{rid}/review", json={"status": "approved"}, headers=h).json()["status"] == "approved"
    ch = client.post(f"/api/revisions/{rid}/changes",
                     json={"entityType": "drawing", "entityId": "d1", "action": "modified",
                           "description": "moved"}, headers=h)
    assert ch.status_code == 201
    ev = client.post(f"/api/revisions/changes/{ch.json()['id']}/evidence",
                     json={"type": "image", "annotations": [{"type": "point", "coordinates": [1, 2]}]}, headers=h)
    assert ev.status_code == 201
    assert client.get(f"/api/revisions/{rid}/impacts", headers=h).status_code == 200
    assert client.get(f"/api/projects/{pid}/revisions/compare?fromVersion=1&toVersion=2", headers=h).status_code == 200
    assert client.get(f"/api/projects/{pid}/revisions/export?format=csv", headers=h).status_code == 200
    assert client.get(f"/api/projects/{pid}/revisions/versions", headers=h).status_code == 200
    assert client.post(f"/api/revisions/{rid}/implement", headers=h).json()["status"] == "implemented"


def test_reports_and_documents(client, auth, project):
    pid, h = project["id"], auth["headers"]
    g = client.post(f"/api/projects/{pid}/reports", json={"name": "R1", "type": "cost"}, headers=h)
    assert g.status_code == 201 and g.json()["status"] == "ready"
    rid = g.json()["id"]
    dl = client.get(f"/api/reports/{rid}/download", headers=h)
    assert dl.status_code == 200 and dl.headers["content-type"] == "application/pdf"
    assert len(client.get(f"/api/projects/{pid}/reports", headers=h).json()) >= 1
    up = client.post(f"/api/projects/{pid}/documents", files={"file": ("a.pdf", PDF, "application/pdf")},
                     data={"folder": "Drawings"}, headers=h)
    assert up.status_code == 201
    did = up.json()["id"]
    assert up.json()["version"] == 1
    assert len(client.get(f"/api/projects/{pid}/documents", headers=h).json()) >= 1
    dl = client.get(f"/api/documents/{did}/download", headers=h)
    assert dl.status_code == 200 and dl.content == PDF
    assert client.delete(f"/api/documents/{did}", headers=h).status_code == 200
    assert client.delete(f"/api/reports/{rid}", headers=h).status_code == 200


def test_drawings_flow(client, auth, project):
    pid, h = project["id"], auth["headers"]
    up = client.post(f"/api/projects/{pid}/drawings", files={"file": ("A-1.pdf", PDF, "application/pdf")},
                     data={"type": "architectural", "discipline": "Arch"}, headers=h)
    assert up.status_code == 201
    d = up.json()
    assert d["status"] == "uploaded" and d["pages"] == 1
    did = d["id"]
    an = client.post(f"/api/drawings/{did}/analyze", json={"options": {}}, headers=h)
    assert an.status_code == 200 and an.json()["status"] == "completed"
    assert len(client.get(f"/api/drawings/{did}/elements", headers=h).json()) == 3
    assert len(client.get(f"/api/drawings/{did}/ocr", headers=h).json()) >= 2
    assert client.get(f"/api/drawings/{did}/thumbnail?page=1", headers=h).status_code == 200
    assert client.get(f"/api/drawings/{did}/pages/1", headers=h).status_code == 200
    dl = client.get(f"/api/drawings/{did}/download", headers=h)
    assert dl.status_code == 200 and dl.content == PDF
    assert client.get(f"/api/projects/{pid}/drawings/stats", headers=h).status_code == 200
    assert client.delete(f"/api/drawings/{did}", headers=h).status_code == 200


def test_models_flow(client, auth, project):
    pid, h = project["id"], auth["headers"]
    glb = b"glTF" + b"\x00" * 100
    up = client.post(f"/api/projects/{pid}/models", files={"file": ("tower.glb", glb, "model/gltf-binary")},
                     data={"name": "Tower"}, headers=h)
    assert up.status_code == 201
    mid = up.json()["id"]
    assert up.json()["format"] == "glb"
    assert len(client.get(f"/api/projects/{pid}/models", headers=h).json()) >= 1
    assert client.get(f"/api/models/{mid}/floors", headers=h).status_code == 200
    assert client.get(f"/api/models/{mid}/elements", headers=h).status_code == 200
    m = client.post(f"/api/models/{mid}/measurements",
                    json={"type": "distance", "points": [{"x": 0, "y": 0, "z": 0}], "value": 5, "unit": "m"},
                    headers=h)
    assert m.status_code == 201
    assert client.delete(f"/api/models/{mid}/measurements/{m.json()['id']}", headers=h).status_code == 200
    sp = client.post(f"/api/models/{mid}/section-planes",
                     json={"normal": {"x": -1, "y": 0, "z": 0}, "constant": 2}, headers=h)
    assert sp.status_code == 201
    assert client.delete(f"/api/models/{mid}/section-planes/{sp.json()['id']}", headers=h).status_code == 200
    assert client.put(f"/api/models/{mid}/view-state", json={"camera": {}}, headers=h).status_code == 200
    assert client.get(f"/api/models/{mid}/view-state", headers=h).status_code == 200
    run = client.post(f"/api/models/{mid}/clash-detection", json={}, headers=h).json()
    assert "runId" in run
    assert client.get(f"/api/models/{mid}/compare?fromVersion=1&toVersion=2", headers=h).status_code == 200
    exp = client.get(f"/api/models/{mid}/export?format=glb", headers=h)
    assert exp.status_code == 200 and exp.content == glb
    assert client.delete(f"/api/models/{mid}", headers=h).status_code == 200
