from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app import deps, serializers as S
from app.db import get_db
from app.models.cost import CostBreakdown, CostVariance, Forecast
from app.models.project import Project
from app.models.user import User
from app.schemas import cost as sch
from app.services import analytics, engines
from app.services.exports import build as build_export, filename

router = APIRouter(tags=["cost"])

CATEGORIES = [
    {"category": "material", "label": "Material", "color": "#0d9488"},
    {"category": "labour", "label": "Labour", "color": "#0f172a"},
    {"category": "equipment", "label": "Equipment", "color": "#d97706"},
    {"category": "transport", "label": "Transport", "color": "#0284c7"},
    {"category": "overhead", "label": "Overhead", "color": "#7c3aed"},
    {"category": "tax", "label": "Tax", "color": "#dc2626"},
    {"category": "wastage", "label": "Wastage", "color": "#ea580c"},
    {"category": "markup", "label": "Markup", "color": "#059669"},
]


@router.get("/projects/{pid}/cost/breakdown")
def breakdown(pid: str, category: str | None = None, period: str | None = None,
              user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    q = db.query(CostBreakdown).filter(CostBreakdown.project_id == pid)
    if category:
        q = q.filter(CostBreakdown.category == category)
    if period:
        q = q.filter(CostBreakdown.period == period)
    return [S.breakdown_out(b) for b in q.all()]


@router.get("/projects/{pid}/cost/budget")
def budget(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    p = deps.get_or_404(db, Project, pid, "Project")
    br = db.query(CostBreakdown).filter(CostBreakdown.project_id == pid).all()
    b = analytics.budget_summary(
        {"budget": p.budget or 0, "currency": p.currency},
        [{"category": x.category, "budgeted": x.budgeted, "actual": x.actual, "committed": x.committed,
          "forecast": x.forecast, "variance": x.variance} for x in br])
    # s-curve from stored monthly points if present
    pts = sorted({(x.period or ""): x for x in br if x.period}.values(), key=lambda x: x.period)
    if pts:
        b["sCurve"] = [{"period": x.period, "planned": x.budgeted, "actual": x.actual, "forecast": x.forecast} for x in pts]
    else:
        b["sCurve"] = [{"period": "2026-06", "planned": round(b["totalBudget"] * 0.27), "actual": round(b["totalActual"] * 0.55), "forecast": round(b["totalForecast"] * 0.4)},
                       {"period": "2026-09", "planned": round(b["totalBudget"] * 0.49), "actual": b["totalActual"], "forecast": round(b["totalForecast"] * 0.75)}]
    return b


@router.get("/projects/{pid}/cost/variances")
def list_variances(pid: str, category: str | None = None, period: str | None = None, status: str | None = None,
                   user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    q = db.query(CostVariance).filter(CostVariance.project_id == pid)
    if category:
        q = q.filter(CostVariance.category == category)
    if period:
        q = q.filter(CostVariance.period == period)
    if status:
        q = q.filter(CostVariance.status == status)
    return [S.variance_out(v) for v in q.all()]


@router.post("/projects/{pid}/cost/variances", status_code=201)
def create_variance(pid: str, body: sch.VarianceCreate, user: User = Depends(deps.get_current_user),
                    db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    v = CostVariance(id=deps.uid(), project_id=pid, category=body.category, period=body.period,
                     budgeted=body.budgeted, actual=body.actual, variance=body.variance,
                     variance_percent=body.variance_percent, explanation=body.explanation,
                     impact=body.impact, status=body.status)
    db.add(v)
    db.commit()
    return S.variance_out(v)


@router.patch("/cost/variances/{vid}")
def update_variance(vid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    v = deps.get_or_404(db, CostVariance, vid, "Variance")
    deps.require_project_member(db, v.project_id, user)
    for k in ("category", "period", "budgeted", "actual", "variance", "variance_percent",
              "variancePercent", "explanation", "impact", "status"):
        if k in body:
            setattr(v, "variance_percent" if k == "variancePercent" else k, body[k])
    db.commit()
    return S.variance_out(v)


@router.post("/cost/variances/{vid}/resolve")
def resolve_variance(vid: str, body: sch.ResolveIn, user: User = Depends(deps.get_current_user),
                     db: Session = Depends(get_db)):
    from datetime import datetime

    v = deps.get_or_404(db, CostVariance, vid, "Variance")
    deps.require_project_member(db, v.project_id, user)
    v.status = "resolved"
    v.explanation = body.explanation
    v.resolved_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


@router.get("/projects/{pid}/cost/forecasts")
def list_forecasts(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    return [S.forecast_out(f) for f in db.query(Forecast).filter(Forecast.project_id == pid).all()]


@router.post("/projects/{pid}/cost/forecasts", status_code=201)
def create_forecast(pid: str, body: sch.ForecastCreate, user: User = Depends(deps.get_current_user),
                    db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    f = Forecast(id=deps.uid(), project_id=pid, name=body.name, description=body.description,
                 assumptions=list(body.assumptions), is_baseline=body.is_baseline, created_by=user.id)
    db.add(f)
    db.commit()
    return S.forecast_out(f)


@router.post("/cost/forecasts/{fid}/run")
def run_forecast(fid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    f = deps.get_or_404(db, Forecast, fid, "Forecast")
    deps.require_project_member(db, f.project_id, user)
    p = db.get(Project, f.project_id)
    br = db.query(CostBreakdown).filter(CostBreakdown.project_id == f.project_id).all()
    b = analytics.budget_summary(
        {"budget": p.budget if p and p.budget else 0, "currency": p.currency if p else "INR"},
        [{"category": x.category, "budgeted": x.budgeted, "actual": x.actual, "committed": x.committed,
          "forecast": x.forecast, "variance": x.variance} for x in br])
    results = engines.run_forecast(b, f.assumptions or [], b["totalBudget"])
    f.results = results
    db.commit()
    return {"results": results}


@router.patch("/cost/forecasts/{fid}")
def update_forecast(fid: str, body: sch.AssumptionsIn, user: User = Depends(deps.get_current_user),
                    db: Session = Depends(get_db)):
    f = deps.get_or_404(db, Forecast, fid, "Forecast")
    deps.require_project_member(db, f.project_id, user)
    f.assumptions = list(body.assumptions)
    db.commit()
    return S.forecast_out(f)


@router.delete("/cost/forecasts/{fid}")
def delete_forecast(fid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    f = deps.get_or_404(db, Forecast, fid, "Forecast")
    deps.require_project_member(db, f.project_id, user)
    db.delete(f)
    db.commit()
    return {"ok": True}


@router.post("/cost/forecasts/{fid}/set-baseline")
def set_baseline(fid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    f = deps.get_or_404(db, Forecast, fid, "Forecast")
    deps.require_project_member(db, f.project_id, user)
    db.query(Forecast).filter(Forecast.project_id == f.project_id).update({"is_baseline": False})
    f.is_baseline = True
    db.commit()
    return {"ok": True}


@router.get("/projects/{pid}/cost/s-curve")
def s_curve(pid: str, baseline_id: str | None = Query(default=None, alias="baselineId"),
            forecast_id: str | None = Query(default=None, alias="forecastId"),
            user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    br = sorted(db.query(CostBreakdown).filter(CostBreakdown.project_id == pid).all(), key=lambda x: x.period or "")
    periods = sorted({b.period for b in br if b.period}) or ["2026-06", "2026-07", "2026-08", "2026-09"]
    planned, actual, forecast = [], [], []
    cum_p = cum_a = cum_f = 0.0
    for per in periods:
        rows = [b for b in br if b.period == per]
        cum_p += sum(b.budgeted for b in rows)
        cum_a += sum(b.actual for b in rows)
        cum_f += sum(b.forecast for b in rows)
        planned.append({"period": per, "value": round(cum_p)})
        actual.append({"period": per, "value": round(cum_a)})
        forecast.append({"period": per, "value": round(cum_f)})
    return {"planned": planned, "actual": actual, "forecast": forecast}


@router.get("/projects/{pid}/cost/cash-flow")
def cash_flow(pid: str, period: str | None = None, user: User = Depends(deps.get_current_user),
              db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    br = db.query(CostBreakdown).filter(CostBreakdown.project_id == pid).all()
    if period:
        br = [b for b in br if b.period == period]
    by_per: dict[str, dict] = {}
    for b in br:
        row = by_per.setdefault(b.period or "2026-10", {"period": b.period or "2026-10", "inflow": 0.0, "outflow": 0.0, "net": 0.0})
        row["outflow"] += b.actual
        row["net"] -= b.actual
    return sorted(by_per.values(), key=lambda r: r["period"])


@router.get("/projects/{pid}/cost/export")
def export_cost(pid: str, format: str = "csv", category: str | None = None, period: str | None = None,
                user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    br = db.query(CostBreakdown).filter(CostBreakdown.project_id == pid).all()
    if category:
        br = [b for b in br if b.category == category]
    if period:
        br = [b for b in br if b.period == period]
    rows = [[b.category, b.sub_category, b.budgeted, b.actual, b.variance, b.period] for b in br]
    data, ctype = build_export(format, f"cost-{pid}", ["category", "sub", "budgeted", "actual", "variance", "period"], rows)
    return Response(content=data, media_type=ctype,
                    headers={"Content-Disposition": f'attachment; filename="{filename("cost", format)}"'})


@router.get("/cost/categories")
def categories(user: User = Depends(deps.get_current_user)):
    return CATEGORIES
