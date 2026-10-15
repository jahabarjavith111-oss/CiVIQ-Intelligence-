"""Forecast + what-if simulation engines."""


def run_forecast(budget: dict, assumptions: list[dict], baseline_total: float | None = None) -> dict:
    """Apply category factor multipliers to budget actuals."""
    by_cat = []
    total = 0.0
    for row in budget.get("byCategory", []) or budget.get("by_category", []):
        cat = row.get("category")
        base = float(row.get("actual", 0) or 0)
        factor = 1.0
        for a in assumptions:
            if a.get("category") == cat:
                try:
                    factor *= float(a.get("factor", 1.0))
                except (TypeError, ValueError):
                    pass
        amount = round(base * factor)
        total += amount
        by_cat.append({"category": cat, "amount": amount})
    base = baseline_total if baseline_total is not None else float(budget.get("totalBudget", 0) or 0)
    # confidence decays with aggressiveness of assumptions
    spread = sum(abs(float(a.get("factor", 1.0)) - 1.0) for a in assumptions)
    confidence = round(max(0.5, 0.92 - spread * 0.4), 2)
    return {
        "totalForecast": round(total),
        "byCategory": by_cat,
        "varianceFromBaseline": round(total - base),
        "confidence": confidence,
    }


def run_what_if(budget_total: float, baseline_finish: str, inputs: dict) -> dict:
    """What-if scenario from slider inputs (steel/labour/concrete % + duration days)."""
    steel = float(inputs.get("steelPercent", 0) or 0)
    labour = float(inputs.get("labourPercent", 0) or 0)
    concrete = float(inputs.get("concretePercent", 0) or 0)
    days = int(inputs.get("durationDays", 0) or 0)
    # Material ~= 58% of budget, labour ~= 24% (matches demo fixtures)
    mat_delta = budget_total * 0.58 * (steel * 0.6 + concrete * 0.4) / 100.0
    lab_delta = budget_total * 0.24 * labour / 100.0
    value = round(mat_delta + lab_delta)
    pct = round(value / budget_total * 100, 1) if budget_total else 0.0
    new_risks = []
    if steel > 5:
        new_risks.append("procurement")
    if days < -10:
        new_risks.append("schedule-compression")
    return {
        "costImpact": {
            "value": value, "percent": pct,
            "breakdown": [
                {"category": "material", "delta": round(mat_delta)},
                {"category": "labour", "delta": round(lab_delta)},
            ],
        },
        "scheduleImpact": {"days": days, "criticalPathChanged": days != 0, "newFinish": baseline_finish},
        "riskImpact": {"scoreDelta": len(new_risks) * 2 + (3 if steel > 8 else 0), "newRisks": new_risks},
        "materialImpact": {"items": [{"trade": "steel", "delta": round(steel * 2.1, 1), "unit": "t"}]},
    }
