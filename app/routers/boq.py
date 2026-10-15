from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

from app import deps, serializers as S
from app.db import get_db
from app.models.boq import BoqItem, BoqLink, BoqVersion, RateAnalysis, RateComponent, WorkPackage
from app.models.user import User
from app.schemas import boq as sch
from app.services import analytics
from app.services.activity import log
from app.services.exports import build as build_export, filename
from app.services.imports import boq_items as _parse_boq, tabular

router = APIRouter(tags=["boq"])


def _wp_total(db: Session, wp_id: str) -> float:
    return round(sum(i.amount for i in db.query(BoqItem).filter(BoqItem.work_package_id == wp_id).all()), 2)


def _item_full(db: Session, i: BoqItem) -> dict:
    takeoffs = [l.ref_id for l in db.query(BoqLink).filter(BoqLink.boq_item_id == i.id, BoqLink.kind == "takeoff").all()]
    models = [l.ref_id for l in db.query(BoqLink).filter(BoqLink.boq_item_id == i.id, BoqLink.kind == "model").all()]
    ra = db.query(RateAnalysis).filter(RateAnalysis.boq_item_id == i.id).order_by(RateAnalysis.version.desc()).first()
    ra_out = None
    if ra:
        comps = db.query(RateComponent).filter(RateComponent.rate_analysis_id == ra.id).all()
        ra_out = S.rate_analysis_out(ra, comps)
    return S.boq_item_out(i, takeoffs, models, ra_out)


def _wp_out(db: Session, w: WorkPackage) -> dict:
    items = db.query(BoqItem).filter(BoqItem.work_package_id == w.id).all()
    return S.workpackage_out(w, [_item_full(db, i) for i in items], _wp_total(db, w.id))


@router.get("/projects/{pid}/boq/work-packages")
def list_wp(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    rows = db.query(WorkPackage).filter(WorkPackage.project_id == pid).order_by(WorkPackage.order).all()
    return [_wp_out(db, w) for w in rows]


@router.post("/projects/{pid}/boq/work-packages", status_code=201)
def create_wp(pid: str, body: sch.WorkPackageCreate, user: User = Depends(deps.get_current_user),
              db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    count = db.query(WorkPackage).filter(WorkPackage.project_id == pid).count()
    w = WorkPackage(id=deps.uid(), project_id=pid, parent_id=body.parent_id, code=body.code, name=body.name,
                    description=body.description, level=0, order=count + 1)
    db.add(w)
    db.commit()
    return _wp_out(db, w)


@router.get("/boq/work-packages/{wid}")
def get_wp(wid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    w = deps.get_or_404(db, WorkPackage, wid, "Work package")
    deps.require_project_member(db, w.project_id, user)
    return _wp_out(db, w)


@router.patch("/boq/work-packages/{wid}")
def update_wp(wid: str, body: sch.WorkPackageUpdate, user: User = Depends(deps.get_current_user),
              db: Session = Depends(get_db)):
    w = deps.get_or_404(db, WorkPackage, wid, "Work package")
    deps.require_project_member(db, w.project_id, user)
    for f in ("code", "name", "description", "parent_id", "level", "order"):
        v = getattr(body, f)
        if v is not None:
            setattr(w, f, v)
    db.commit()
    return _wp_out(db, w)


@router.delete("/boq/work-packages/{wid}")
def delete_wp(wid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    w = deps.get_or_404(db, WorkPackage, wid, "Work package")
    deps.require_project_member(db, w.project_id, user)
    db.delete(w)
    db.commit()
    return {"ok": True}


@router.post("/projects/{pid}/boq/work-packages/reorder")
def reorder(pid: str, body: sch.ReorderIn, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    for idx, wid in enumerate(body.package_ids or []):
        w = db.get(WorkPackage, wid)
        if w and w.project_id == pid:
            w.order = idx + 1
    db.commit()
    return {"ok": True}


@router.get("/boq/work-packages/{wid}/items")
def list_items(wid: str, pp: dict = Depends(deps.page_params), status: str | None = None,
               user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    w = deps.get_or_404(db, WorkPackage, wid, "Work package")
    deps.require_project_member(db, w.project_id, user)
    q = db.query(BoqItem).filter(BoqItem.work_package_id == wid)
    if status:
        q = q.filter(BoqItem.status == status)
    total = q.count()
    rows = q.offset(pp["offset"]).limit(pp["limit"]).all()
    return deps.envelope([_item_full(db, i) for i in rows], total, pp["page"], pp["limit"])


@router.post("/boq/work-packages/{wid}/items", status_code=201)
def create_item(wid: str, body: sch.BoqItemCreate, user: User = Depends(deps.get_current_user),
                db: Session = Depends(get_db)):
    w = deps.get_or_404(db, WorkPackage, wid, "Work package")
    deps.require_project_member(db, w.project_id, user)
    qty = body.quantity or 0.0
    rate = body.rate or 0.0
    i = BoqItem(id=deps.uid(), work_package_id=wid, code=body.code, description=body.description,
                unit=body.unit, quantity=qty, rate=rate, amount=round(qty * rate, 2))
    db.add(i)
    db.commit()
    log(db, w.project_id, user, "added BOQ item", "boq", i.id, i.code)
    return _item_full(db, i)


@router.get("/boq/items/{iid}")
def get_item(iid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    i = deps.get_or_404(db, BoqItem, iid, "BOQ item")
    w = db.get(WorkPackage, i.work_package_id)
    deps.require_project_member(db, w.project_id if w else "", user)
    return _item_full(db, i)


@router.patch("/boq/items/{iid}")
def update_item(iid: str, body: sch.BoqItemUpdate, user: User = Depends(deps.get_current_user),
                db: Session = Depends(get_db)):
    i = deps.get_or_404(db, BoqItem, iid, "BOQ item")
    w = db.get(WorkPackage, i.work_package_id)
    deps.require_project_member(db, w.project_id if w else "", user)
    for f in ("code", "description", "unit", "quantity", "rate", "status", "notes"):
        v = getattr(body, f)
        if v is not None:
            setattr(i, f, v)
    i.amount = round((i.quantity or 0) * (i.rate or 0), 2)
    db.commit()
    return _item_full(db, i)


@router.delete("/boq/items/{iid}")
def delete_item(iid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    i = deps.get_or_404(db, BoqItem, iid, "BOQ item")
    w = db.get(WorkPackage, i.work_package_id)
    deps.require_project_member(db, w.project_id if w else "", user)
    db.delete(i)
    db.commit()
    return {"ok": True}


@router.patch("/boq/work-packages/{wid}/items/bulk")
def bulk_update(wid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    w = deps.get_or_404(db, WorkPackage, wid, "Work package")
    deps.require_project_member(db, w.project_id, user)
    out = []
    for raw in body.get("updates", []) or []:
        i = db.get(BoqItem, raw.get("id"))
        if not i or i.work_package_id != wid:
            continue
        for k, v in (raw.get("data") or {}).items():
            if hasattr(i, k) and k not in ("id", "work_package_id"):
                setattr(i, k, v)
        i.amount = round((i.quantity or 0) * (i.rate or 0), 2)
        out.append(i)
    db.commit()
    return [_item_full(db, i) for i in out]


def _rate_full(db: Session, ra: RateAnalysis) -> dict:
    comps = db.query(RateComponent).filter(RateComponent.rate_analysis_id == ra.id).all()
    return S.rate_analysis_out(ra, comps)


@router.get("/boq/items/{iid}/rate-analysis")
def get_rate(iid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    i = deps.get_or_404(db, BoqItem, iid, "BOQ item")
    w = db.get(WorkPackage, i.work_package_id)
    deps.require_project_member(db, w.project_id if w else "", user)
    ra = db.query(RateAnalysis).filter(RateAnalysis.boq_item_id == iid).order_by(RateAnalysis.version.desc()).first()
    if not ra:
        raise HTTPException(status_code=404, detail="No rate analysis")
    return _rate_full(db, ra)


@router.post("/boq/items/{iid}/rate-analysis", status_code=201)
def create_rate(iid: str, body: sch.RateAnalysisCreate, user: User = Depends(deps.get_current_user),
                db: Session = Depends(get_db)):
    i = deps.get_or_404(db, BoqItem, iid, "BOQ item")
    w = db.get(WorkPackage, i.work_package_id)
    deps.require_project_member(db, w.project_id if w else "", user)
    top = db.query(RateAnalysis).filter(RateAnalysis.boq_item_id == iid).order_by(RateAnalysis.version.desc()).first()
    ra = RateAnalysis(id=deps.uid(), boq_item_id=iid, overhead_percent=body.overhead_percent,
                      profit_percent=body.profit_percent, total_rate=body.total_rate, currency=body.currency,
                      version=(top.version + 1) if top else 1)
    db.add(ra)
    db.flush()
    for bucket in ("materials", "labour", "equipment"):
        for c in getattr(body, bucket) or []:
            db.add(RateComponent(id=deps.uid(), rate_analysis_id=ra.id, bucket=bucket,
                                 description=c.get("description", ""), unit=c.get("unit", ""),
                                 quantity=float(c.get("quantity", 0) or 0), unit_rate=float(c.get("unitRate", c.get("unit_rate", 0)) or 0),
                                 amount=float(c.get("amount", 0) or 0), source=c.get("source", "manual"),
                                 reference=c.get("reference")))
    db.commit()
    return _rate_full(db, ra)


@router.patch("/boq/rate-analysis/{rid}")
def update_rate(rid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    ra = deps.get_or_404(db, RateAnalysis, rid, "Rate analysis")
    for k in ("overhead_percent", "overheadPercent", "profit_percent", "profitPercent", "total_rate", "totalRate", "currency"):
        if k in body:
            setattr(ra, k.replace("Percent", "_percent").replace("totalRate", "total_rate") if k in ("overheadPercent", "profitPercent", "totalRate") else k, body[k])
    db.commit()
    return _rate_full(db, ra)


@router.post("/boq/rate-analysis/{rid}/components", status_code=201)
def add_component(rid: str, body: sch.RateComponentIn, bucket: str = "materials",
                  user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.get_or_404(db, RateAnalysis, rid, "Rate analysis")
    c = RateComponent(id=deps.uid(), rate_analysis_id=rid, bucket=bucket, description=body.description,
                      unit=body.unit, quantity=body.quantity, unit_rate=body.unit_rate, amount=body.amount,
                      source=body.source, reference=body.reference)
    db.add(c)
    db.commit()
    return {"id": c.id, "description": c.description, "unit": c.unit, "quantity": c.quantity,
            "unitRate": c.unit_rate, "amount": c.amount, "source": c.source, "reference": c.reference}


@router.patch("/boq/rate-analysis/{rid}/components/{cid}")
def update_component(rid: str, cid: str, body: dict, user: User = Depends(deps.get_current_user),
                     db: Session = Depends(get_db)):
    c = db.query(RateComponent).filter(RateComponent.id == cid, RateComponent.rate_analysis_id == rid).first()
    if not c:
        raise HTTPException(status_code=404, detail="Component not found")
    mapping = {"unitRate": "unit_rate", "unit_rate": "unit_rate"}
    for k, v in body.items():
        key = mapping.get(k, k)
        if hasattr(c, key):
            setattr(c, key, v)
    db.commit()
    return {"id": c.id, "description": c.description, "unit": c.unit, "quantity": c.quantity,
            "unitRate": c.unit_rate, "amount": c.amount, "source": c.source, "reference": c.reference}


@router.delete("/boq/rate-analysis/{rid}/components/{cid}")
def delete_component(rid: str, cid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    c = db.query(RateComponent).filter(RateComponent.id == cid, RateComponent.rate_analysis_id == rid).first()
    if not c:
        raise HTTPException(status_code=404, detail="Component not found")
    db.delete(c)
    db.commit()
    return {"ok": True}


@router.post("/boq/rate-analysis/{rid}/approve")
def approve_rate(rid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    from datetime import datetime

    ra = deps.get_or_404(db, RateAnalysis, rid, "Rate analysis")
    ra.approved_by = user.id
    ra.approved_at = datetime.utcnow()
    db.commit()
    return {"ok": True}


@router.get("/projects/{pid}/boq/summary")
def summary(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    pkgs = db.query(WorkPackage).filter(WorkPackage.project_id == pid).all()
    ids = [p.id for p in pkgs]
    items = db.query(BoqItem).filter(BoqItem.work_package_id.in_(ids)).all() if ids else []
    return analytics.boq_summary(
        [{"work_package_id": i.work_package_id, "amount": i.amount} for i in items],
        [{"id": p.id, "name": p.name} for p in pkgs])


@router.get("/projects/{pid}/boq/export")
def export_boq(pid: str, format: str = "csv", user: User = Depends(deps.get_current_user),
               db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    pkgs = db.query(WorkPackage).filter(WorkPackage.project_id == pid).all()
    ids = [p.id for p in pkgs]
    items = db.query(BoqItem).filter(BoqItem.work_package_id.in_(ids)).all() if ids else []
    rows = [[i.code, i.description, i.unit, i.quantity, i.rate, i.amount] for i in items]
    data, ctype = build_export(format, f"boq-{pid}", ["code", "description", "unit", "qty", "rate", "amount"], rows)
    return Response(content=data, media_type=ctype,
                    headers={"Content-Disposition": f'attachment; filename="{filename("boq", format)}"'})


@router.post("/projects/{pid}/boq/import")
async def import_boq(pid: str, file: UploadFile = File(...), format: str = Form("csv"),
                     user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    from app.services.imports import tabular

    headers, rows = tabular(await file.read(), file.filename or f"import.{format}")
    pkgs = db.query(WorkPackage).filter(WorkPackage.project_id == pid).order_by(WorkPackage.order).all()
    if not pkgs:
        pkgs = [WorkPackage(id=deps.uid(), project_id=pid, code="WP-01", name="General", level=0, order=1)]
        db.add(pkgs[0])
        db.flush()
    parsed = _parse_boq(headers, rows)
    for raw in parsed:
        qty, rate = raw["quantity"], raw["rate"]
        db.add(BoqItem(id=deps.uid(), work_package_id=pkgs[0].id, code=raw["code"], description=raw["description"],
                       unit=raw["unit"], quantity=qty, rate=rate, amount=round(qty * rate, 2)))
    db.commit()
    return {"imported": len(parsed)}


@router.post("/projects/{pid}/boq/versions", status_code=201)
def create_version(pid: str, body: sch.VersionCreate, user: User = Depends(deps.get_current_user),
                   db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    pkgs = db.query(WorkPackage).filter(WorkPackage.project_id == pid).all()
    snap = {"workPackages": [_wp_out(db, w) for w in pkgs]}
    v = BoqVersion(id=deps.uid(), project_id=pid, name=body.name, snapshot=snap, created_by=user.id)
    db.add(v)
    db.commit()
    return {"id": v.id, "name": v.name, "createdAt": v.created_at.isoformat(), "createdBy": v.created_by}


@router.get("/projects/{pid}/boq/versions")
def list_versions(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    rows = db.query(BoqVersion).filter(BoqVersion.project_id == pid).order_by(BoqVersion.created_at.desc()).all()
    return [{"id": v.id, "name": v.name, "createdAt": v.created_at.isoformat(), "createdBy": v.created_by} for v in rows]


@router.post("/projects/{pid}/boq/versions/{vid}/restore")
def restore_version(pid: str, vid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    v = db.query(BoqVersion).filter(BoqVersion.id == vid, BoqVersion.project_id == pid).first()
    if not v:
        raise HTTPException(status_code=404, detail="Version not found")
    # MVP restore: snapshot recorded; item-level restore applied on demand later.
    log(db, pid, user, f"restored BOQ version {v.name}", "boq", v.id, v.name)
    return {"ok": True, "restored": v.id}


def _link(db: Session, iid: str, kind: str, ref: str, user: User):
    i = deps.get_or_404(db, BoqItem, iid, "BOQ item")
    w = db.get(WorkPackage, i.work_package_id)
    deps.require_project_member(db, w.project_id if w else "", user)
    if not db.query(BoqLink).filter(BoqLink.boq_item_id == iid, BoqLink.kind == kind, BoqLink.ref_id == ref).first():
        db.add(BoqLink(id=deps.uid(), boq_item_id=iid, kind=kind, ref_id=ref))
        db.commit()
    return {"ok": True}


def _unlink(db: Session, iid: str, kind: str, ref: str, user: User):
    i = deps.get_or_404(db, BoqItem, iid, "BOQ item")
    w = db.get(WorkPackage, i.work_package_id)
    deps.require_project_member(db, w.project_id if w else "", user)
    db.query(BoqLink).filter(BoqLink.boq_item_id == iid, BoqLink.kind == kind, BoqLink.ref_id == ref).delete()
    db.commit()
    return {"ok": True}


@router.post("/boq/items/{iid}/takeoff-links")
def link_takeoff(iid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    return _link(db, iid, "takeoff", body.get("takeoffItemId"), user)


@router.delete("/boq/items/{iid}/takeoff-links/{ref}")
def unlink_takeoff(iid: str, ref: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    return _unlink(db, iid, "takeoff", ref, user)


@router.post("/boq/items/{iid}/model-links")
def link_model(iid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    return _link(db, iid, "model", body.get("modelElementId"), user)


@router.delete("/boq/items/{iid}/model-links/{ref}")
def unlink_model(iid: str, ref: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    return _unlink(db, iid, "model", ref, user)
