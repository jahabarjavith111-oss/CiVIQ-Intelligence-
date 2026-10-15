from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

from app import deps, serializers as S
from app.db import get_db
from app.models.takeoff import Formula, TakeoffItem, TakeoffLink, TakeoffTemplate
from app.models.user import User
from app.schemas import takeoff as sch
from app.services import analytics
from app.services.activity import log
from app.services.exports import build as build_export, filename
from app.services.imports import boq_items as _parse_boq, tabular, takeoff_items as _parse_takeoff

router = APIRouter(tags=["takeoff"])


def _full(db: Session, t: TakeoffItem) -> dict:
    return S.takeoff_out(t)


@router.get("/projects/{pid}/takeoff")
def list_items(pid: str, pp: dict = Depends(deps.page_params), trade: str | None = None,
               status: str | None = None, user: User = Depends(deps.get_current_user),
               db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    q = db.query(TakeoffItem).filter(TakeoffItem.project_id == pid)
    if trade:
        q = q.filter(TakeoffItem.trade == trade)
    if status:
        q = q.filter(TakeoffItem.status == status)
    total = q.count()
    rows = q.order_by(TakeoffItem.created_at.desc()).offset(pp["offset"]).limit(pp["limit"]).all()
    return deps.envelope([_full(db, t) for t in rows], total, pp["page"], pp["limit"])


@router.post("/projects/{pid}/takeoff", status_code=201)
def create_item(pid: str, body: sch.TakeoffCreate, user: User = Depends(deps.get_current_user),
                db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    t = TakeoffItem(id=deps.uid(), project_id=pid, trade=body.trade, category=body.category, code=body.code,
                    description=body.description, unit=body.unit, quantity=body.quantity, formula=None,
                    drawing_refs=list(body.drawing_references), model_refs=list(body.model_references),
                    status=body.status, created_by=user.id)
    db.add(t)
    db.commit()
    log(db, pid, user, "added takeoff item", "takeoff", t.id, t.code)
    return _full(db, t)


@router.get("/takeoff/templates")
def list_templates(user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    return [{"id": t.id, "name": t.name, "trade": t.trade, "items": t.items or []}
            for t in db.query(TakeoffTemplate).all()]


@router.post("/takeoff/templates", status_code=201)
def create_template(body: sch.TemplateCreate, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    t = TakeoffTemplate(id=deps.uid(), name=body.name, trade=body.trade, items=list(body.items))
    db.add(t)
    db.commit()
    return {"id": t.id, "name": t.name, "trade": t.trade, "items": t.items or []}


@router.get("/takeoff/formulas/{trade}")
def get_formulas(trade: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    rows = db.query(Formula).filter(Formula.trade == trade).all()
    return {r.item_code: r.formula for r in rows}


@router.post("/takeoff/formulas/{trade}/{code}")
def save_formula(trade: str, code: str, body: sch.FormulaIn, user: User = Depends(deps.get_current_user),
                 db: Session = Depends(get_db)):
    rec = db.query(Formula).filter(Formula.trade == trade, Formula.item_code == code).first()
    if not rec:
        rec = Formula(id=deps.uid(), trade=trade, item_code=code, formula=body.formula)
        db.add(rec)
    else:
        rec.formula = body.formula
    db.commit()
    return {"ok": True}


@router.get("/takeoff/{tid}")
def get_item(tid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    t = deps.get_or_404(db, TakeoffItem, tid, "Takeoff item")
    deps.require_project_member(db, t.project_id, user)
    return _full(db, t)


@router.patch("/takeoff/{tid}")
def update_item(tid: str, body: sch.TakeoffUpdate, user: User = Depends(deps.get_current_user),
                db: Session = Depends(get_db)):
    t = deps.get_or_404(db, TakeoffItem, tid, "Takeoff item")
    deps.require_project_member(db, t.project_id, user)
    for f in ("trade", "category", "code", "description", "unit", "quantity", "formula", "notes", "status"):
        v = getattr(body, f)
        if v is not None:
            setattr(t, f, v)
    db.commit()
    return _full(db, t)


@router.delete("/takeoff/{tid}")
def delete_item(tid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    t = deps.get_or_404(db, TakeoffItem, tid, "Takeoff item")
    deps.require_project_member(db, t.project_id, user)
    db.delete(t)
    db.commit()
    return {"ok": True}


@router.post("/projects/{pid}/takeoff/bulk", status_code=201)
def bulk_create(pid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    out = []
    for raw in body.get("items", []) or []:
        t = TakeoffItem(id=deps.uid(), project_id=pid, trade=raw.get("trade", "concrete"),
                        category=raw.get("category", "General"), code=raw.get("code", ""),
                        description=raw.get("description", ""), unit=raw.get("unit", "m3"),
                        quantity=float(raw.get("quantity", 0) or 0), status=raw.get("status", "draft"),
                        created_by=user.id)
        db.add(t)
        out.append(t)
    db.commit()
    return [_full(db, t) for t in out]


@router.patch("/projects/{pid}/takeoff/bulk")
def bulk_update(pid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    out = []
    for raw in body.get("updates", []) or []:
        t = db.get(TakeoffItem, raw.get("id"))
        if not t or t.project_id != pid:
            continue
        for k, v in (raw.get("data") or {}).items():
            if hasattr(t, k) and k not in ("id", "project_id"):
                setattr(t, k, v)
        out.append(t)
    db.commit()
    return [_full(db, t) for t in out]


@router.get("/projects/{pid}/takeoff/summary")
def summary(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    items = db.query(TakeoffItem).filter(TakeoffItem.project_id == pid).all()
    return analytics.takeoff_summary([{"trade": i.trade, "quantity": i.quantity, "unit": i.unit} for i in items])


@router.get("/projects/{pid}/takeoff/trade/{trade}")
def by_trade(pid: str, trade: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    return [_full(db, t) for t in db.query(TakeoffItem).filter(TakeoffItem.project_id == pid, TakeoffItem.trade == trade).all()]


@router.post("/projects/{pid}/takeoff/apply-template", status_code=201)
def apply_template(pid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    tpl = deps.get_or_404(db, TakeoffTemplate, body.get("templateId"), "Template")
    out = []
    for raw in tpl.items or []:
        t = TakeoffItem(id=deps.uid(), project_id=pid, trade=raw.get("trade", tpl.trade),
                        category=raw.get("category", "General"), code=raw.get("code", ""),
                        description=raw.get("description", ""), unit=raw.get("unit", "m3"),
                        quantity=float(raw.get("quantity", 0) or 0), status="draft", created_by=user.id)
        db.add(t)
        out.append(t)
    db.commit()
    return [_full(db, t) for t in out]


@router.post("/takeoff/{tid}/drawing-links")
def link_drawing(tid: str, body: sch.DrawingLinkIn, user: User = Depends(deps.get_current_user),
                 db: Session = Depends(get_db)):
    t = deps.get_or_404(db, TakeoffItem, tid, "Takeoff item")
    deps.require_project_member(db, t.project_id, user)
    refs = list(t.drawing_refs or [])
    if body.drawing_id not in refs:
        refs.append(body.drawing_id)
    t.drawing_refs = refs
    db.add(TakeoffLink(id=deps.uid(), takeoff_id=tid, kind="drawing", ref_id=body.drawing_id,
                       extra=body.bbox or {}))
    db.commit()
    return {"ok": True}


@router.delete("/takeoff/{tid}/drawing-links/{did}")
def unlink_drawing(tid: str, did: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    t = deps.get_or_404(db, TakeoffItem, tid, "Takeoff item")
    deps.require_project_member(db, t.project_id, user)
    t.drawing_refs = [x for x in (t.drawing_refs or []) if x != did]
    db.query(TakeoffLink).filter(TakeoffLink.takeoff_id == tid, TakeoffLink.kind == "drawing", TakeoffLink.ref_id == did).delete()
    db.commit()
    return {"ok": True}


@router.post("/takeoff/{tid}/model-links")
def link_model(tid: str, body: sch.ModelLinkIn, user: User = Depends(deps.get_current_user),
               db: Session = Depends(get_db)):
    t = deps.get_or_404(db, TakeoffItem, tid, "Takeoff item")
    deps.require_project_member(db, t.project_id, user)
    refs = list(t.model_refs or [])
    if body.model_element_id not in refs:
        refs.append(body.model_element_id)
    t.model_refs = refs
    db.add(TakeoffLink(id=deps.uid(), takeoff_id=tid, kind="model", ref_id=body.model_element_id))
    db.commit()
    return {"ok": True}


@router.delete("/takeoff/{tid}/model-links/{mid}")
def unlink_model(tid: str, mid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    t = deps.get_or_404(db, TakeoffItem, tid, "Takeoff item")
    deps.require_project_member(db, t.project_id, user)
    t.model_refs = [x for x in (t.model_refs or []) if x != mid]
    db.query(TakeoffLink).filter(TakeoffLink.takeoff_id == tid, TakeoffLink.kind == "model", TakeoffLink.ref_id == mid).delete()
    db.commit()
    return {"ok": True}


@router.get("/projects/{pid}/takeoff/export")
def export_takeoff(pid: str, format: str = "csv", include_formulas: bool = True, include_references: bool = True,
                   group_by_trade: bool = True, user: User = Depends(deps.get_current_user),
                   db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    items = db.query(TakeoffItem).filter(TakeoffItem.project_id == pid).all()
    headers = ["code", "description", "trade", "unit", "quantity", "status"]
    rows = [[i.code, i.description, i.trade, i.unit, i.quantity, i.status] for i in items]
    data, ctype = build_export(format, f"takeoff-{pid}", headers, rows)
    return Response(content=data, media_type=ctype,
                    headers={"Content-Disposition": f'attachment; filename="{filename("takeoff", format)}"'})


@router.post("/projects/{pid}/takeoff/import", status_code=201)
async def import_takeoff(pid: str, file: UploadFile = File(...), format: str = Form("csv"),
                         user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    headers, rows = tabular(await file.read(), file.filename or f"import.{format}")
    parsed = _parse_takeoff(headers, rows)
    out = []
    for raw in parsed:
        t = TakeoffItem(id=deps.uid(), project_id=pid, trade=raw["trade"], category=raw["category"],
                        code=raw["code"], description=raw["description"], unit=raw["unit"],
                        quantity=raw["quantity"], status="draft", created_by=user.id)
        db.add(t)
        out.append(t)
    db.commit()
    return [_full(db, t) for t in out]
