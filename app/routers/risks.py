from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

from app import deps, serializers as S
from app.db import get_db
from app.models.project import Project
from app.models.risk import Mitigation, RelatedEntity, Risk, RiskTrigger
from app.models.user import User
from app.schemas import risk as sch
from app.services import analytics, montecarlo
from app.services.activity import log, notify_project
from app.services.exports import build as build_export, filename

router = APIRouter(tags=["risks"])

RATING_BANDS = [(20, "extreme"), (16, "very-high"), (12, "high"), (6, "medium"), (3, "low"), (0, "very-low")]


def rating_for(score: int) -> str:
    for bound, name in RATING_BANDS:
        if score >= bound:
            return name
    return "very-low"


def _full(db: Session, r: Risk) -> dict:
    mits = [S.mitigation_out(m) for m in db.query(Mitigation).filter(Mitigation.risk_id == r.id).all()]
    trigs = [S.trigger_out(t) for t in db.query(RiskTrigger).filter(RiskTrigger.risk_id == r.id).all()]
    rels = [S.related_out(e) for e in db.query(RelatedEntity).filter(RelatedEntity.risk_id == r.id).all()]
    return S.risk_out(r, mits, trigs, rels)


@router.get("/projects/{pid}/risks")
def list_risks(pid: str, pp: dict = Depends(deps.page_params), category: str | None = None,
               status: str | None = None, rating: str | None = None,
               user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    q = db.query(Risk).filter(Risk.project_id == pid)
    if category:
        q = q.filter(Risk.category == category)
    if status:
        q = q.filter(Risk.status == status)
    if rating:
        q = q.filter(Risk.rating == rating)
    total = q.count()
    rows = q.order_by(Risk.score.desc()).offset(pp["offset"]).limit(pp["limit"]).all()
    return deps.envelope([_full(db, r) for r in rows], total, pp["page"], pp["limit"])


@router.post("/projects/{pid}/risks", status_code=201)
def create_risk(pid: str, body: sch.RiskCreate, user: User = Depends(deps.get_current_user),
                db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    count = db.query(Risk).filter(Risk.project_id == pid).count() + 1
    score = int(body.probability) * int(body.impact)
    owner = db.get(User, body.owner_id) if body.owner_id else None
    r = Risk(id=deps.uid(), project_id=pid, code=body.code or f"R-{count:02d}", title=body.title,
             description=body.description, category=body.category, probability=body.probability,
             impact=body.impact, score=score, rating=rating_for(score), status=body.status,
             owner_id=body.owner_id or user.id, owner_name=owner.name if owner else user.name,
             identified_by=user.id)
    db.add(r)
    db.commit()
    log(db, pid, user, "identified risk", "risk", r.id, r.code)
    return _full(db, r)


@router.get("/projects/{pid}/risks/categories")
def categories_scoped(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    return _categories()


def _categories() -> list:
    colors = {"cost": "#dc2626", "schedule": "#d97706", "design": "#0284c7", "procurement": "#7c3aed",
              "material": "#0d9488", "resource": "#65a30d", "quality": "#0891b2", "coordination": "#ea580c", "safety": "#e11d48"}
    return [{"category": c, "label": c.title(), "color": colors.get(c, "#64748b")} for c in colors]


@router.get("/risks/categories")
def categories(user: User = Depends(deps.get_current_user)):
    return _categories()


@router.get("/risks/{rid}")
def get_risk(rid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Risk, rid, "Risk")
    deps.require_project_member(db, r.project_id, user)
    return _full(db, r)


@router.patch("/risks/{rid}")
def update_risk(rid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Risk, rid, "Risk")
    deps.require_project_member(db, r.project_id, user)
    for k in ("code", "title", "description", "category", "probability", "impact", "status", "owner_id", "owner_name"):
        if k in body:
            setattr(r, k, body[k])
    if "probability" in body or "impact" in body:
        r.score = int(r.probability) * int(r.impact)
        r.rating = rating_for(r.score)
    db.commit()
    return _full(db, r)


@router.delete("/risks/{rid}")
def delete_risk(rid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Risk, rid, "Risk")
    deps.require_project_member(db, r.project_id, user)
    db.delete(r)
    db.commit()
    return {"ok": True}


@router.post("/risks/{rid}/assess")
def assess(rid: str, body: sch.AssessIn, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Risk, rid, "Risk")
    deps.require_project_member(db, r.project_id, user)
    r.probability = body.probability
    r.impact = body.impact
    r.score = body.probability * body.impact
    r.rating = rating_for(r.score)
    r.assessed_at = datetime.utcnow()
    if r.status == "identified":
        r.status = "assessed"
    db.commit()
    return _full(db, r)


@router.get("/projects/{pid}/risks/summary")
def summary(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    risks = db.query(Risk).filter(Risk.project_id == pid).all()
    s = analytics.risk_summary([{"category": r.category, "score": r.score, "rating": r.rating,
                                 "status": r.status,
                                 "mitigations": db.query(Mitigation).filter(Mitigation.risk_id == r.id).all()} for r in risks])
    top = sorted(risks, key=lambda r: r.score, reverse=True)[:10]
    s["topRisks"] = [_full(db, r) for r in top]
    trend = db.query(Risk).filter(Risk.project_id == pid).all()
    s["riskTrend"] = [{"date": (r.created_at.date().isoformat() if r.created_at else ""), "totalScore": r.score, "count": 1} for r in trend[:12]]
    return s


@router.get("/projects/{pid}/risks/heatmap")
def heatmap(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    risks = db.query(Risk).filter(Risk.project_id == pid).all()
    grid = [[{"probability": p, "impact": i, "count": 0, "risks": []} for i in range(1, 6)] for p in range(1, 6)]
    for r in risks:
        p = min(max(int(r.probability), 1), 5) - 1
        i = min(max(int(r.impact), 1), 5) - 1
        cell = grid[p][i]
        cell["count"] += 1
        cell["risks"].append({"id": r.id, "code": r.code, "title": r.title})
    return grid


@router.get("/projects/{pid}/risks/trends")
def trends(pid: str, period: str | None = None, interval: str | None = None,
           user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    risks = db.query(Risk).filter(Risk.project_id == pid).all()
    by_cat: dict[str, int] = {}
    for r in risks:
        by_cat[r.category] = by_cat.get(r.category, 0) + r.score
    return [{"date": "current", "totalScore": sum(r.score for r in risks), "count": len(risks), "byCategory": by_cat}]


@router.get("/risks/{rid}/mitigations")
def list_mitigations(rid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Risk, rid, "Risk")
    deps.require_project_member(db, r.project_id, user)
    return [S.mitigation_out(m) for m in db.query(Mitigation).filter(Mitigation.risk_id == rid).all()]


@router.post("/risks/{rid}/mitigations", status_code=201)
def add_mitigation(rid: str, body: sch.MitigationIn, user: User = Depends(deps.get_current_user),
                   db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Risk, rid, "Risk")
    deps.require_project_member(db, r.project_id, user)
    m = Mitigation(id=deps.uid(), risk_id=rid, title=body.title, description=body.description, type=body.type,
                   status=body.status, effectiveness=body.effectiveness, cost=body.cost,
                   cost_currency=body.cost_currency, responsible_id=body.responsible_id,
                   responsible_name=body.responsible_name, due_date=body.due_date)
    db.add(m)
    if r.status in ("identified", "assessed"):
        r.status = "mitigating"
    db.commit()
    return S.mitigation_out(m)


@router.patch("/risks/mitigations/{mid}")
def update_mitigation(mid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    m = deps.get_or_404(db, Mitigation, mid, "Mitigation")
    r = db.get(Risk, m.risk_id)
    deps.require_project_member(db, r.project_id if r else "", user)
    mapping = {"costCurrency": "cost_currency", "responsibleId": "responsible_id",
               "responsibleName": "responsible_name", "dueDate": "due_date",
               "completedAt": "completed_at", "residualScore": "residual_score"}
    for k, v in body.items():
        key = mapping.get(k, k)
        if hasattr(m, key):
            setattr(m, key, v)
    db.commit()
    return S.mitigation_out(m)


@router.post("/risks/mitigations/{mid}/complete")
def complete_mitigation(mid: str, body: sch.CompleteMitigationIn, user: User = Depends(deps.get_current_user),
                        db: Session = Depends(get_db)):
    m = deps.get_or_404(db, Mitigation, mid, "Mitigation")
    r = db.get(Risk, m.risk_id)
    deps.require_project_member(db, r.project_id if r else "", user)
    m.status = "completed"
    m.completed_at = datetime.utcnow()
    if body.residual_score is not None:
        m.residual_score = body.residual_score
    db.commit()
    return {"ok": True}


@router.get("/risks/{rid}/triggers")
def list_triggers(rid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Risk, rid, "Risk")
    deps.require_project_member(db, r.project_id, user)
    return [S.trigger_out(t) for t in db.query(RiskTrigger).filter(RiskTrigger.risk_id == rid).all()]


@router.post("/risks/{rid}/triggers", status_code=201)
def add_trigger(rid: str, body: sch.TriggerIn, user: User = Depends(deps.get_current_user),
                db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Risk, rid, "Risk")
    deps.require_project_member(db, r.project_id, user)
    t = RiskTrigger(id=deps.uid(), risk_id=rid, description=body.description, indicator=body.indicator, threshold=body.threshold)
    db.add(t)
    db.commit()
    return S.trigger_out(t)


@router.patch("/risks/triggers/{tid}")
def update_trigger(tid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    t = deps.get_or_404(db, RiskTrigger, tid, "Trigger")
    r = db.get(Risk, t.risk_id)
    deps.require_project_member(db, r.project_id if r else "", user)
    for k in ("description", "indicator", "threshold", "isActive", "is_active"):
        if k in body:
            setattr(t, "is_active" if k == "isActive" else k, body[k])
    db.commit()
    return S.trigger_out(t)


@router.post("/risks/triggers/{tid}/activate")
def activate_trigger(tid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    t = deps.get_or_404(db, RiskTrigger, tid, "Trigger")
    r = db.get(Risk, t.risk_id)
    deps.require_project_member(db, r.project_id if r else "", user)
    t.is_active = True
    t.detected_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


@router.get("/risks/{rid}/related-entities")
def list_related(rid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Risk, rid, "Risk")
    deps.require_project_member(db, r.project_id, user)
    return [S.related_out(e) for e in db.query(RelatedEntity).filter(RelatedEntity.risk_id == rid).all()]


@router.post("/risks/{rid}/related-entities", status_code=201)
def add_related(rid: str, body: sch.RelatedEntityIn, user: User = Depends(deps.get_current_user),
                db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Risk, rid, "Risk")
    deps.require_project_member(db, r.project_id, user)
    e = RelatedEntity(id=deps.uid(), risk_id=rid, type=body.type, entity_id=body.entity_id,
                      entity_name=body.entity_name, relationship=body.relationship)
    db.add(e)
    db.commit()
    return S.related_out(e)


@router.delete("/risks/{rid}/related-entities/{eid}")
def remove_related(rid: str, eid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Risk, rid, "Risk")
    deps.require_project_member(db, r.project_id, user)
    e = db.query(RelatedEntity).filter(RelatedEntity.risk_id == rid, RelatedEntity.entity_id == eid).first()
    if e:
        db.delete(e)
        db.commit()
    return {"ok": True}


@router.post("/projects/{pid}/risks/monte-carlo")
def run_mc(pid: str, body: sch.MonteCarloIn, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    from datetime import datetime

    deps.require_project_member(db, pid, user)
    risks = db.query(Risk).filter(Risk.project_id == pid, Risk.status != "closed").all()
    p = db.get(Project, pid)
    base_cost = float(p.budget) if p and p.budget else 45000000
    res = montecarlo.run(
        [{"probability": r.probability, "impact": r.impact} for r in risks],
        base_cost, 424, runs=body.runs or 10000, seed=body.seed)
    res["simulationId"] = f"mc-{deps.uid()[:8]}"
    for r in risks:
        r.monte_carlo = res
    db.commit()
    notify_project(db, pid, "risk", "Monte Carlo complete", f"{res['runs']} runs, P50 {res['p50Cost']}", "/risks", exclude=user.id)
    return res


@router.get("/projects/{pid}/risks/monte-carlo/results")
def mc_results(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    risks = db.query(Risk).filter(Risk.project_id == pid).all()
    return [r.monte_carlo for r in risks if r.monte_carlo]


@router.get("/projects/{pid}/risks/export")
def export_risks(pid: str, format: str = "csv", user: User = Depends(deps.get_current_user),
                 db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    risks = db.query(Risk).filter(Risk.project_id == pid).all()
    rows = [[r.code, r.title, r.category, r.score, r.rating, r.status] for r in risks]
    data, ctype = build_export(format, f"risks-{pid}", ["code", "title", "category", "score", "rating", "status"], rows)
    return Response(content=data, media_type=ctype,
                    headers={"Content-Disposition": f'attachment; filename="{filename("risks", format)}"'})


@router.post("/projects/{pid}/risks/import")
async def import_risks(pid: str, file: UploadFile = File(...), format: str = Form("csv"),
                       user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    from app.services.imports import risk_items as _parse, tabular

    headers, rows = tabular(await file.read(), file.filename or f"import.{format}")
    parsed = _parse(headers, rows)
    count = 0
    for raw in parsed:
        score = raw["probability"] * raw["impact"]
        db.add(Risk(id=deps.uid(), project_id=pid, code=f"R-{db.query(Risk).filter(Risk.project_id == pid).count() + count + 1:02d}",
                    title=raw["title"], description=raw["description"], category=raw["category"],
                    probability=raw["probability"], impact=raw["impact"], score=score, rating=rating_for(score),
                    status="identified", owner_id=user.id, owner_name=user.name, identified_by=user.id))
        count += 1
    db.commit()
    return {"imported": count}
