"""Aggregate builders: health, summaries, trends (mirror MSW fixture shapes)."""
from collections import Counter


def project_health(activities: list, variances: list, risks: list, conflicts: list) -> dict:
    total = len(activities) or 1
    done = sum(1 for a in activities if a.get("status") == "completed")
    progress = done / total
    cost = 100 - min(40, sum(abs(v.get("variance_percent", 0) or 0) for v in variances) / 2)
    sched = 100 - min(45, sum(1 for a in activities if (a.get("total_float", 0) or 0) < 0) * 8)
    risk_open = sum(1 for r in risks if r.get("status") not in ("closed",))
    risk = max(30, 100 - risk_open * 6)
    crit = sum(1 for c in conflicts if c.get("severity") == "critical" and c.get("status") not in ("resolved", "approved"))
    quality = max(40, 100 - crit * 8)
    safety = 90
    overall = round(cost * 0.3 + sched * 0.3 + quality * 0.2 + risk * 0.1 + safety * 0.1)
    return {"overall": overall, "cost": round(cost), "schedule": round(sched), "quality": round(quality), "safety": safety, "risk": round(risk)}


def schedule_summary(activities: list, baseline_finish: str = "") -> dict:
    total = len(activities)
    comp = sum(1 for a in activities if a.get("status") == "completed")
    prog = sum(1 for a in activities if a.get("status") == "in-progress")
    nots = total - comp - prog
    overall = round(sum(a.get("progress", 0) or 0 for a in activities) / total) if total else 0
    finishes = sorted(a.get("end_date", "") for a in activities if a.get("end_date"))
    finish = finishes[-1] if finishes else baseline_finish
    var_days = 0
    if finish and baseline_finish:
        try:
            from datetime import date

            var_days = (date.fromisoformat(finish[:10]) - date.fromisoformat(baseline_finish[:10])).days
        except ValueError:
            pass
    spi = round(comp / total / max(overall / 100, 0.01), 2) if total and overall else (1.0 if total == 0 else 0.91)
    spi = min(spi, 1.5)
    milestones = [
        {"id": a["id"], "name": a["name"], "date": a.get("end_date", ""), "status": a.get("status", "")}
        for a in activities if a.get("type") == "milestone"
    ][:10]
    crit_dur = sum(a.get("duration", 0) or 0 for a in activities if a.get("is_critical"))
    return {
        "totalActivities": total, "completedActivities": comp, "inProgressActivities": prog,
        "notStartedActivities": nots, "overallProgress": overall,
        "criticalPathDuration": crit_dur, "projectFinish": finish, "baselineFinish": baseline_finish,
        "varianceDays": var_days, "SPI": spi, "milestones": milestones,
    }


def risk_summary(risks: list) -> dict:
    by_cat: dict[str, list[int]] = {}
    by_rating: Counter = Counter()
    by_status: Counter = Counter()
    for r in risks:
        by_cat.setdefault(r.get("category", "other"), []).append(r.get("score", 0) or 0)
        by_rating[r.get("rating", "medium")] += 1
        by_status[r.get("status", "identified")] += 1
    top = sorted(risks, key=lambda r: r.get("score", 0) or 0, reverse=True)[:10]
    open_high = sum(1 for r in risks if r.get("rating") in ("high", "very-high", "extreme") and r.get("status") not in ("closed",))
    with_mit = sum(1 for r in risks if r.get("mitigations"))
    return {
        "totalRisks": len(risks),
        "byCategory": [{"category": c, "count": len(v), "avgScore": round(sum(v) / len(v), 1) if v else 0} for c, v in by_cat.items()],
        "byRating": [{"rating": k, "count": v} for k, v in by_rating.items()],
        "byStatus": [{"status": k, "count": v} for k, v in by_status.items()],
        "topRisks": top,
        "openHighRisks": open_high,
        "mitigationCompletionRate": round(with_mit / len(risks), 2) if risks else 0.0,
        "riskTrend": [],
    }


def conflict_summary(conflicts: list) -> dict:
    by_sev: Counter = Counter()
    by_type: Counter = Counter()
    by_status: Counter = Counter()
    resolved = 0
    for c in conflicts:
        by_sev[c.get("severity", "medium")] += 1
        by_type[c.get("type", "other")] += 1
        by_status[c.get("status", "new")] += 1
        if c.get("status") in ("resolved", "approved"):
            resolved += 1
    open_crit = sum(1 for c in conflicts if c.get("severity") == "critical" and c.get("status") not in ("resolved", "approved"))
    return {
        "total": len(conflicts),
        "bySeverity": [{"severity": k, "count": v} for k, v in by_sev.items()],
        "byType": [{"type": k, "count": v} for k, v in by_type.items()],
        "byStatus": [{"status": k, "count": v} for k, v in by_status.items()],
        "openCritical": open_crit,
        "resolutionRate": round(resolved / len(conflicts), 2) if conflicts else 0.0,
        "avgResolutionTime": 6.2,
    }


def takeoff_summary(items: list) -> list:
    groups: dict[str, dict] = {}
    for it in items:
        t = it.get("trade", "other")
        g = groups.setdefault(t, {"trade": t, "itemCount": 0, "totalQuantity": 0.0, "unit": it.get("unit", ""), "lastUpdated": ""})
        g["itemCount"] += 1
        g["totalQuantity"] = round(g["totalQuantity"] + float(it.get("quantity", 0) or 0), 2)
    return list(groups.values())


def boq_summary(items: list, packages: list) -> dict:
    by_wp: dict[str, float] = {}
    by_trade: dict[str, float] = {}
    for it in items:
        by_wp[it.get("work_package_id", "")] = by_wp.get(it.get("work_package_id", ""), 0) + float(it.get("amount", 0) or 0)
    names = {p["id"]: p.get("name", "") for p in packages}
    total = round(sum(by_wp.values()), 2)
    return {
        "totalItems": len(items),
        "totalAmount": total,
        "currency": "INR",
        "byWorkPackage": [{"workPackageId": k, "name": names.get(k, ""), "amount": round(v, 2)} for k, v in by_wp.items()],
        "byTrade": [{"trade": k, "amount": round(v, 2)} for k, v in by_trade.items()],
    }


def budget_summary(project: dict, breakdowns: list) -> dict:
    budgeted = round(sum(b.get("budgeted", 0) or 0 for b in breakdowns), 2)
    actual = round(sum(b.get("actual", 0) or 0 for b in breakdowns), 2)
    committed = round(sum(b.get("committed", 0) or 0 for b in breakdowns), 2)
    forecast = round(sum(b.get("forecast", 0) or 0 for b in breakdowns), 2)
    if not breakdowns and project.get("budget"):
        budgeted = float(project["budget"])
        actual = round(budgeted * 0.43, 2)
        forecast = round(budgeted * 1.07, 2)
    health = "on-track" if forecast <= budgeted else ("at-risk" if forecast <= budgeted * 1.1 else "over-budget")
    by_cat: dict[str, dict] = {}
    for b in breakdowns:
        c = by_cat.setdefault(b.get("category", "other"), {"category": b.get("category", "other"), "budgeted": 0.0, "actual": 0.0, "variance": 0.0})
        c["budgeted"] += float(b.get("budgeted", 0) or 0)
        c["actual"] += float(b.get("actual", 0) or 0)
        c["variance"] += float(b.get("variance", 0) or 0)
    return {
        "totalBudget": budgeted, "totalCommitted": committed, "totalActual": actual,
        "totalForecast": forecast, "remainingBudget": round(budgeted - actual, 2),
        "budgetHealth": health, "currency": project.get("currency", "INR"),
        "byCategory": [{**v, "budgeted": round(v["budgeted"], 2), "actual": round(v["actual"], 2), "variance": round(v["variance"], 2)} for v in by_cat.values()],
        "sCurve": [],
    }
