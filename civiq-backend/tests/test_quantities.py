"""Takeoff + BOQ + cost + schedule + risks + simulations contract tests."""


def test_takeoff_crud(client, auth, project):
    pid, h = project["id"], auth["headers"]
    r = client.post(f"/api/projects/{pid}/takeoff", json={
        "trade": "concrete", "code": "C-9", "description": "Test pour", "unit": "m3", "quantity": 10},
        headers=h)
    assert r.status_code == 201
    tid = r.json()["id"]
    assert r.json()["quantity"] == 10
    r = client.patch(f"/api/takeoff/{tid}", json={"quantity": 12}, headers=h)
    assert r.json()["quantity"] == 12
    s = client.get(f"/api/projects/{pid}/takeoff/summary", headers=h).json()
    assert any(x["trade"] == "concrete" for x in s)
    lst = client.get(f"/api/projects/{pid}/takeoff", headers=h).json()
    assert {"data", "total", "page", "limit"} <= set(lst)
    assert client.get(f"/api/projects/{pid}/takeoff/trade/concrete", headers=h).status_code == 200
    r = client.post(f"/api/projects/{pid}/takeoff/bulk", json={"items": [
        {"trade": "steel", "code": "S-9", "description": "Bars", "unit": "t", "quantity": 5}]}, headers=h)
    assert r.status_code == 201 and len(r.json()) == 1
    exp = client.get(f"/api/projects/{pid}/takeoff/export?format=csv&includeFormulas=true&includeReferences=true&groupByTrade=true", headers=h)
    assert exp.status_code == 200
    assert client.post("/api/takeoff/templates", json={"name": "T1", "trade": "steel", "items": []}, headers=h).status_code == 201
    assert client.get("/api/takeoff/templates", headers=h).status_code == 200
    assert client.post(f"/api/takeoff/{tid}/drawing-links", json={"drawingId": "dwg-x"}, headers=h).status_code == 200
    assert client.delete(f"/api/takeoff/{tid}/drawing-links/dwg-x", headers=h).status_code == 200
    assert client.delete(f"/api/takeoff/{tid}", headers=h).status_code == 200
    # csv import
    imp = client.post(f"/api/projects/{pid}/takeoff/import", files={"file": ("t.csv", "code,description,unit,quantity\nC-1,Footing,m3,3\n", "text/csv")},
                      data={"format": "csv"}, headers=h)
    assert imp.status_code == 201 and len(imp.json()) == 1


def test_boq_flow(client, auth, project):
    pid, h = project["id"], auth["headers"]
    w = client.post(f"/api/projects/{pid}/boq/work-packages", json={"code": "WP-9", "name": "Test WP"}, headers=h)
    assert w.status_code == 201
    wid = w.json()["id"]
    it = client.post(f"/api/boq/work-packages/{wid}/items",
                     json={"workPackageId": wid, "code": "9.1", "description": "Beam", "unit": "m3",
                           "quantity": 2, "rate": 100}, headers=h)
    assert it.status_code == 201
    assert it.json()["amount"] == 200
    iid = it.json()["id"]
    up = client.patch(f"/api/boq/items/{iid}", json={"quantity": 3}, headers=h)
    assert up.json()["amount"] == 300
    ra = client.post(f"/api/boq/items/{iid}/rate-analysis",
                     json={"materials": [{"description": "Cement", "unit": "bag", "quantity": 5,
                                          "unitRate": 400, "amount": 2000, "source": "manual"}],
                           "labour": [], "equipment": [], "overheadPercent": 10,
                           "profitPercent": 5, "totalRate": 100, "currency": "INR"}, headers=h)
    assert ra.status_code == 201
    rid = ra.json()["id"]
    comp = client.post(f"/api/boq/rate-analysis/{rid}/components",
                       json={"description": "Sand", "unit": "m3", "quantity": 1, "unitRate": 500,
                             "amount": 500, "source": "manual"}, headers=h)
    assert comp.status_code == 201
    assert client.post(f"/api/boq/rate-analysis/{rid}/approve", headers=h).status_code == 200
    s = client.get(f"/api/projects/{pid}/boq/summary", headers=h).json()
    assert s["totalItems"] >= 1 and s["totalAmount"] >= 300
    v = client.post(f"/api/projects/{pid}/boq/versions", json={"name": "v1"}, headers=h)
    assert v.status_code == 201
    assert len(client.get(f"/api/projects/{pid}/boq/versions", headers=h).json()) >= 1
    assert client.get(f"/api/projects/{pid}/boq/export?format=csv", headers=h).status_code == 200
    assert client.delete(f"/api/boq/items/{iid}", headers=h).status_code == 200


def test_cost_flow(client, auth, project):
    pid, h = project["id"], auth["headers"]
    b = client.get(f"/api/projects/{pid}/cost/budget", headers=h).json()
    assert {"totalBudget", "budgetHealth", "byCategory", "sCurve"} <= set(b)
    assert client.get("/api/cost/categories", headers=h).status_code == 200
    sc = client.get(f"/api/projects/{pid}/cost/s-curve", headers=h).json()
    assert {"planned", "actual", "forecast"} <= set(sc)
    cf = client.get(f"/api/projects/{pid}/cost/cash-flow", headers=h).json()
    assert isinstance(cf, list)
    v = client.post(f"/api/projects/{pid}/cost/variances",
                    json={"category": "material", "period": "2026-10", "budgeted": 100,
                          "actual": 120, "variance": 20, "variancePercent": 20}, headers=h)
    assert v.status_code == 201
    vid = v.json()["id"]
    assert client.post(f"/api/cost/variances/{vid}/resolve", json={"explanation": "ok"}, headers=h).status_code == 200
    f = client.post(f"/api/projects/{pid}/cost/forecasts",
                    json={"name": "F1", "assumptions": [{"category": "material", "factor": 1.1, "reason": "t"}]},
                    headers=h)
    assert f.status_code == 201
    fid = f.json()["id"]
    run = client.post(f"/api/cost/forecasts/{fid}/run", headers=h).json()
    assert run["results"]["totalForecast"] >= 0
    assert client.post(f"/api/cost/forecasts/{fid}/set-baseline", headers=h).status_code == 200
    assert client.get(f"/api/projects/{pid}/cost/export?format=csv", headers=h).status_code == 200


def test_schedule_flow(client, auth, project):
    pid, h = project["id"], auth["headers"]
    a = client.post(f"/api/projects/{pid}/schedule/activities",
                    json={"wbsCode": "1.1", "name": "Footings", "startDate": "2026-02-01",
                          "endDate": "2026-03-10", "duration": 28}, headers=h)
    assert a.status_code == 201
    a2 = client.post(f"/api/projects/{pid}/schedule/activities",
                     json={"wbsCode": "1.2", "name": "Columns", "startDate": "2026-02-28",
                           "endDate": "2026-03-28", "duration": 30}, headers=h).json()
    dep = client.post(f"/api/projects/{pid}/schedule/dependencies",
                      json={"fromActivityId": a.json()["id"], "toActivityId": a2["id"],
                            "type": "FS", "lag": 0}, headers=h)
    assert dep.status_code == 201
    calc = client.post(f"/api/projects/{pid}/schedule/calculate", headers=h).json()
    assert "criticalPath" in calc and len(calc["criticalPath"]["activities"]) == 2
    cp = client.get(f"/api/projects/{pid}/schedule/critical-path", headers=h).json()
    assert cp["totalDuration"] == 58
    s = client.get(f"/api/projects/{pid}/schedule/summary", headers=h).json()
    assert s["totalActivities"] == 2 and "SPI" in s
    b = client.post(f"/api/projects/{pid}/schedule/baselines", json={"name": "BL-01"}, headers=h)
    assert b.status_code == 201
    bid = b.json()["id"]
    assert client.post(f"/api/projects/{pid}/schedule/baselines/{bid}/set-current", headers=h).status_code == 200
    assert client.get(f"/api/projects/{pid}/schedule/gantt", headers=h).status_code == 200
    assert client.get(f"/api/projects/{pid}/schedule/export?format=csv", headers=h).status_code == 200
    cal = client.post(f"/api/projects/{pid}/schedule/calendars", json={"name": "Std"}, headers=h)
    assert cal.status_code == 201
    assert client.get(f"/api/projects/{pid}/schedule/calendars", headers=h).status_code == 200


def test_risk_and_simulation(client, auth, project):
    pid, h = project["id"], auth["headers"]
    r = client.post(f"/api/projects/{pid}/risks",
                    json={"title": "Delay", "category": "schedule", "probability": 4, "impact": 5}, headers=h)
    assert r.status_code == 201
    body = r.json()
    assert body["score"] == 20 and body["rating"] == "extreme"
    rid = body["id"]
    assert client.post(f"/api/risks/{rid}/assess",
                       json={"probability": 3, "impact": 4, "assessedBy": "u"}, headers=h).status_code == 200
    m = client.post(f"/api/risks/{rid}/mitigations",
                    json={"title": " expedite", "responsibleId": "u", "responsibleName": "U",
                          "dueDate": "2026-12-01"}, headers=h)
    assert m.status_code == 201
    assert client.post(f"/api/risks/mitigations/{m.json()['id']}/complete", json={}, headers=h).status_code == 200
    t = client.post(f"/api/risks/{rid}/triggers", json={"description": "d", "indicator": "i", "threshold": "t"}, headers=h)
    assert t.status_code == 201
    assert client.post(f"/api/risks/triggers/{t.json()['id']}/activate", headers=h).status_code == 200
    mc = client.post(f"/api/projects/{pid}/risks/monte-carlo", json={"runs": 500}, headers=h).json()
    assert mc["runs"] == 500 and mc["p50Cost"] > 0
    assert len(client.get(f"/api/projects/{pid}/risks/monte-carlo/results", headers=h).json()) >= 1
    hm = client.get(f"/api/projects/{pid}/risks/heatmap", headers=h).json()
    assert len(hm) == 5 and len(hm[0]) == 5
    assert client.get("/api/risks/categories", headers=h).status_code == 200
    assert client.get(f"/api/projects/{pid}/risks/export?format=csv", headers=h).status_code == 200
    s = client.post(f"/api/projects/{pid}/simulations",
                    json={"name": "S1", "inputs": {"steelPercent": 10, "durationDays": -5}}, headers=h)
    assert s.status_code == 201
    run = client.post(f"/api/simulations/{s.json()['id']}/run", headers=h).json()
    assert run["status"] == "completed" and run["results"]["costImpact"]["value"] > 0
    assert client.post(f"/api/projects/{pid}/simulations/compare", json={"ids": [s.json()["id"]]}, headers=h).status_code == 200
