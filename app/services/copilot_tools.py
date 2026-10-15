"""Copilot's 12 tools — each queries live project data and returns evidence-ready results."""
from sqlalchemy.orm import Session

from app.models import boq as m_boq
from app.models import coordination as m_coord
from app.models import cost as m_cost
from app.models import drawing as m_draw
from app.models import model3d as m_m3
from app.models import project as m_proj
from app.models import revision as m_rev
from app.models import risk as m_risk
from app.models import schedule as m_sched
from app.models import takeoff as m_take
from app.services import analytics, engines

TOOL_DEFS = [
    {"name": "drawing_analysis", "description": "Analyze drawings: elements, OCR, confidence", "parameters": {"drawingIds": "string[]", "options": "object"}},
    {"name": "quantity_calculation", "description": "Quantities by trade with filters", "parameters": {"trade": "string", "projectId": "string", "filters": "object"}},
    {"name": "boq_analysis", "description": "BOQ summary, items and variances", "parameters": {"projectId": "string", "workPackageIds": "string[]"}},
    {"name": "cost_analysis", "description": "Budget breakdown, variances and forecast", "parameters": {"projectId": "string", "category": "string", "period": "string"}},
    {"name": "schedule_analysis", "description": "Critical path, progress and delays", "parameters": {"projectId": "string", "baselineId": "string"}},
    {"name": "risk_analysis", "description": "Risks, summary and Monte Carlo", "parameters": {"projectId": "string", "category": "string"}},
    {"name": "conflict_analysis", "description": "Clashes, summary and trends", "parameters": {"projectId": "string", "modelId": "string", "severity": "string"}},
    {"name": "revision_analysis", "description": "Revision changes and impacts", "parameters": {"projectId": "string", "fromVersion": "number", "toVersion": "number"}},
    {"name": "model_query", "description": "Query 3D model elements and quantities", "parameters": {"modelId": "string", "filters": "object"}},
    {"name": "project_question", "description": "Answer general project questions", "parameters": {"projectId": "string", "question": "string"}},
    {"name": "what_if", "description": "Run a what-if cost/schedule scenario", "parameters": {"projectId": "string", "scenario": "object"}},
    {"name": "report_question", "description": "Answer questions about reports", "parameters": {"projectId": "string", "reportType": "string", "question": "string"}},
]


def _ev(source_id: str, source_name: str, excerpt: str, type: str = "document", relevance: float = 0.9) -> dict:
    return {"id": f"e-{source_id}", "type": type, "sourceId": source_id, "sourceName": source_name,
            "excerpt": excerpt[:160], "relevance": relevance}


def drawing_analysis(db: Session, args: dict, ctx: dict) -> dict:
    ids = args.get("drawingIds") or []
    q = db.query(m_draw.Drawing)
    if ids:
        q = q.filter(m_draw.Drawing.id.in_(ids))
    elif ctx.get("projectId"):
        q = q.filter(m_draw.Drawing.project_id == ctx["projectId"])
    ds = q.limit(20).all()
    data = [{"id": d.id, "name": d.name, "type": d.type, "status": d.status} for d in ds]
    return {"result": {"drawings": data, "count": len(data)},
            "evidence": [_ev(d.id, d.name, f"{d.type} v{d.version} {d.status}", "drawing") for d in ds[:5]]}


def quantity_calculation(db: Session, args: dict, ctx: dict) -> dict:
    pid = args.get("projectId") or ctx.get("projectId")
    trade = args.get("trade")
    q = db.query(m_take.TakeoffItem).filter(m_take.TakeoffItem.project_id == pid)
    if trade:
        q = q.filter(m_take.TakeoffItem.trade == trade)
    items = q.limit(200).all()
    total = round(sum(i.quantity for i in items), 2)
    return {"result": {"trade": trade or "all", "itemCount": len(items), "totalQuantity": total,
                       "items": [{"code": i.code, "description": i.description, "quantity": i.quantity, "unit": i.unit} for i in items[:20]]},
            "evidence": [_ev(i.id, i.code, f"{i.description} {i.quantity}{i.unit}", "document") for i in items[:5]]}


def boq_analysis(db: Session, args: dict, ctx: dict) -> dict:
    pid = args.get("projectId") or ctx.get("projectId")
    pkgs = db.query(m_boq.WorkPackage).filter(m_boq.WorkPackage.project_id == pid).all()
    ids = [p.id for p in pkgs]
    items = db.query(m_boq.BoqItem).filter(m_boq.BoqItem.work_package_id.in_(ids)).all() if ids else []
    summ = analytics.boq_summary(
        [{"work_package_id": i.work_package_id, "amount": i.amount} for i in items],
        [{"id": p.id, "name": p.name} for p in pkgs])
    return {"result": summ, "evidence": [_ev("boq", "BOQ summary", f"Total {summ['totalAmount']} across {summ['totalItems']} items")]}


def cost_analysis(db: Session, args: dict, ctx: dict) -> dict:
    pid = args.get("projectId") or ctx.get("projectId")
    br = db.query(m_cost.CostBreakdown).filter(m_cost.CostBreakdown.project_id == pid).all()
    proj = db.get(m_proj.Project, pid)
    b = analytics.budget_summary(
        {"budget": proj.budget if proj and proj.budget else 0, "currency": proj.currency if proj else "INR"},
        [{"category": x.category, "budgeted": x.budgeted, "actual": x.actual, "committed": x.committed,
          "forecast": x.forecast, "variance": x.variance} for x in br])
    return {"result": b, "evidence": [_ev("cost", "Budget", f"Forecast {b['totalForecast']} vs budget {b['totalBudget']}")]}


def schedule_analysis(db: Session, args: dict, ctx: dict) -> dict:
    pid = args.get("projectId") or ctx.get("projectId")
    acts = db.query(m_sched.Activity).filter(m_sched.Activity.project_id == pid).all()
    s = analytics.schedule_summary([{"status": a.status, "progress": a.progress, "end_date": a.end_date,
                                     "type": a.type, "id": a.id, "name": a.name} for a in acts])
    crit = [a.name for a in acts if a.is_critical][:8]
    return {"result": {**s, "criticalPath": crit}, "evidence": [_ev("sched", "Schedule", f"SPI {s['SPI']}, {s['varianceDays']} days variance")]}


def risk_analysis(db: Session, args: dict, ctx: dict) -> dict:
    pid = args.get("projectId") or ctx.get("projectId")
    cat = args.get("category")
    q = db.query(m_risk.Risk).filter(m_risk.Risk.project_id == pid)
    if cat:
        q = q.filter(m_risk.Risk.category == cat)
    risks = q.order_by(m_risk.Risk.score.desc()).limit(20).all()
    s = analytics.risk_summary([{"category": r.category, "score": r.score, "rating": r.rating,
                                 "status": r.status, "mitigations": []} for r in risks])
    top = [{"code": r.code, "title": r.title, "score": r.score} for r in risks[:5]]
    return {"result": {**s, "top": top},
            "evidence": [_ev(r.id, r.code, f"{r.title} score {r.score}", "risk") for r in risks[:5]]}


def conflict_analysis(db: Session, args: dict, ctx: dict) -> dict:
    pid = args.get("projectId") or ctx.get("projectId")
    sev = args.get("severity")
    q = db.query(m_coord.Conflict).filter(m_coord.Conflict.project_id == pid)
    if sev:
        q = q.filter(m_coord.Conflict.severity == sev)
    confs = q.limit(50).all()
    s = analytics.conflict_summary([{"severity": c.severity, "type": c.type, "status": c.status} for c in confs])
    return {"result": {**s, "sample": [{"title": c.title, "severity": c.severity} for c in confs[:5]]},
            "evidence": [_ev(c.id, c.title, c.description[:160], "conflict") for c in confs[:5]]}


def revision_analysis(db: Session, args: dict, ctx: dict) -> dict:
    pid = args.get("projectId") or ctx.get("projectId")
    revs = db.query(m_rev.Revision).filter(m_rev.Revision.project_id == pid).order_by(m_rev.Revision.to_version.desc()).limit(10).all()
    data = [{"title": r.title, "status": r.status, "from": r.from_version, "to": r.to_version} for r in revs]
    return {"result": {"revisions": data}, "evidence": [_ev(r.id, r.title, r.description or "", "revision") for r in revs[:3]]}


def model_query(db: Session, args: dict, ctx: dict) -> dict:
    mid = args.get("modelId")
    if not mid:
        m = db.query(m_m3.Model).filter(m_m3.Model.project_id == (ctx.get("projectId") or "")).first()
        mid = m.id if m else None
    els = db.query(m_m3.ModelElement).filter(m_m3.ModelElement.model_id == mid).limit(100).all() if mid else []
    cats: dict[str, int] = {}
    for e in els:
        cats[e.category] = cats.get(e.category, 0) + 1
    return {"result": {"count": len(els), "byCategory": cats,
                       "sample": [{"name": e.name, "category": e.category} for e in els[:10]]},
            "evidence": [_ev(e.id, e.name, f"{e.category} {e.type}", "model") for e in els[:5]]}


def project_question(db: Session, args: dict, ctx: dict) -> dict:
    pid = args.get("projectId") or ctx.get("projectId")
    p = db.get(m_proj.Project, pid)
    if not p:
        return {"result": {"answer": "No active project found."}, "evidence": []}
    acts = db.query(m_sched.Activity).filter(m_sched.Activity.project_id == pid).all()
    s = analytics.schedule_summary([{"status": a.status, "progress": a.progress, "end_date": a.end_date,
                                     "type": a.type, "id": a.id, "name": a.name} for a in acts])
    answer = (f'Project "{p.name}" is {s["overallProgress"]}% complete, status {p.status}. '
              f'Budget {p.budget or 0} {p.currency}, finish {s["projectFinish"]}.')
    return {"result": {"answer": answer, "sources": ["project", "schedule"]},
            "evidence": [_ev(p.id, p.name, answer)]}


def what_if(db: Session, args: dict, ctx: dict) -> dict:
    pid = args.get("projectId") or ctx.get("projectId")
    scen = args.get("scenario", {}) or {}
    proj = db.get(m_proj.Project, pid)
    total = float(proj.budget) if proj and proj.budget else 45000000
    res = engines.run_what_if(total, "", scen)
    return {"result": res, "evidence": [_ev("sim", "What-if", f"Cost {res['costImpact']['value']} ({res['costImpact']['percent']}%)")]}


def report_question(db: Session, args: dict, ctx: dict) -> dict:
    from app.models import report as m_rep

    pid = args.get("projectId") or ctx.get("projectId")
    reps = db.query(m_rep.Report).filter(m_rep.Report.project_id == pid).order_by(m_rep.Report.created_at.desc()).limit(10).all()
    data = [{"name": r.name, "type": r.type, "status": r.status} for r in reps]
    return {"result": {"answer": f"{len(data)} reports generated.", "data": data},
            "evidence": [_ev(r.id, r.name, r.type, "document") for r in reps[:3]]}


TOOLS = {
    "drawing_analysis": drawing_analysis,
    "quantity_calculation": quantity_calculation,
    "boq_analysis": boq_analysis,
    "cost_analysis": cost_analysis,
    "schedule_analysis": schedule_analysis,
    "risk_analysis": risk_analysis,
    "conflict_analysis": conflict_analysis,
    "revision_analysis": revision_analysis,
    "model_query": model_query,
    "project_question": project_question,
    "what_if": what_if,
    "report_question": report_question,
}
