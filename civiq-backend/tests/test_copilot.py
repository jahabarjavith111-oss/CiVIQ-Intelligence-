"""Copilot + WebSocket contract tests (local responder path, no LLM key needed)."""


def test_copilot_flow(client, auth, project):
    pid, h = project["id"], auth["headers"]
    c = client.post("/api/copilot/conversations", json={"projectId": pid, "title": "Chat"}, headers=h)
    assert c.status_code == 201
    cid = c.json()["id"]
    assert len(client.get("/api/copilot/conversations", headers=h).json()) >= 1
    msg = client.post(f"/api/copilot/conversations/{cid}/messages",
                      json={"content": "What is the project budget forecast?", "context": {"projectId": pid}},
                      headers=h)
    assert msg.status_code == 200
    body = msg.json()["message"]
    assert body["role"] == "assistant" and body["content"]
    assert body["intent"] == "cost_analysis"
    assert len(body["evidence"]) >= 1
    mid = body["id"]
    assert len(client.get(f"/api/copilot/messages/{mid}/evidence", headers=h).json()) >= 1
    v = client.post(f"/api/copilot/messages/{mid}/verify", headers=h).json()
    assert v["status"] in ("verified", "partially-verified")
    assert client.post(f"/api/copilot/messages/{mid}/rating",
                       json={"rating": "helpful"}, headers=h).status_code == 200
    assert client.post("/api/copilot/intent", json={"message": "run monte carlo on risks"},
                       headers=h).json()["intent"] == "risk_analysis"
    tools = client.get("/api/copilot/tools", headers=h).json()
    assert len(tools) == 12
    ex = client.post("/api/copilot/tools/execute",
                     json={"id": "t1", "name": "project_question", "arguments": {"projectId": pid},
                           "status": "pending"}, headers=h).json()
    assert ex["success"] is True
    assert client.patch(f"/api/copilot/conversations/{cid}/context",
                        json={"context": {"projectId": pid}}, headers=h).status_code == 200
    assert client.get(f"/api/copilot/conversations/{cid}/export?format=json", headers=h).status_code == 200
    stream = client.post(f"/api/copilot/conversations/{cid}/messages/stream",
                         json={"content": "hi", "context": {"projectId": pid}}, headers=h)
    assert stream.status_code == 200 and "data:" in stream.text
    assert client.delete(f"/api/copilot/conversations/{cid}", headers=h).status_code == 200


def test_websocket_gateway(client):
    with client.websocket_connect("/ws") as ws:
        ws.send_text('{"subscribe": []}')
        msg = ws.receive_json()
        assert msg["type"] == "copilot"
        assert "at" in msg
