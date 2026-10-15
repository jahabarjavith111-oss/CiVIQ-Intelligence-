from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from sqlalchemy.orm import Session

from app import deps, serializers as S
from app.db import get_db
from app.models.model3d import Floor, Measurement, Model, ModelConflict, ModelElement, SectionPlane, ViewState
from app.models.user import User
from app.schemas import model3d as sch
from app.services import clash
from app.services.platform import upload_max_mb
from app.storage.store import get_store, new_key

router = APIRouter(tags=["models"])


def _full(db: Session, m: Model) -> dict:
    floors = [S.floor_out(f) for f in db.query(Floor).filter(Floor.model_id == m.id).all()]
    elements = [S.element_out(e) for e in db.query(ModelElement).filter(ModelElement.model_id == m.id).limit(500).all()]
    conflicts = [S.mconflict_out(c) for c in db.query(ModelConflict).filter(ModelConflict.model_id == m.id).all()]
    return S.model_out(m, floors, elements, conflicts)


def _project_of_model(db: Session, model_id: str, user: User) -> Model:
    m = deps.get_or_404(db, Model, model_id, "Model")
    deps.require_project_member(db, m.project_id, user)
    return m


@router.get("/projects/{pid}/models")
def list_models(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    return [_full(db, m) for m in db.query(Model).filter(Model.project_id == pid).all()]


@router.post("/projects/{pid}/models", status_code=201)
async def upload_model(pid: str, file: UploadFile = File(...), name: str = Form("Model"),
                       user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    data = await file.read()
    max_mb = upload_max_mb(db)
    if len(data) > max_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File too large (max {max_mb}MB)")
    ext = (file.filename or "").lower().rsplit(".", 1)[-1] if "." in (file.filename or "") else "glb"
    fmt = ext if ext in ("gltf", "glb", "ifc") else "glb"
    key = new_key(f"models/{pid}", file.filename or "model.glb")
    url = get_store().save(data, key, file.content_type or "model/gltf-binary")
    existing = db.query(Model).filter(Model.project_id == pid, Model.name == name).first()
    version = (existing.version + 1) if existing else 1
    m = Model(id=deps.uid(), project_id=pid, name=name, version=version, file_key=key, file_url=url,
              format=fmt, file_size=len(data),
              meta={"units": "metric", "boundingBox": {"min": {"x": 0, "y": 0, "z": 0}, "max": {"x": 30, "y": 36, "z": 20}}})
    db.add(m)
    db.commit()
    return S.model_out(m)


@router.get("/models/{mid}")
def get_model(mid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    return _full(db, _project_of_model(db, mid, user))


@router.patch("/models/{mid}")
def update_model(mid: str, body: sch.ModelUpdate, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    m = _project_of_model(db, mid, user)
    if body.name is not None:
        m.name = body.name
    if body.version is not None:
        m.version = body.version
    db.commit()
    return S.model_out(m)


@router.delete("/models/{mid}")
def delete_model(mid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    m = _project_of_model(db, mid, user)
    get_store().delete(m.file_key)
    db.delete(m)
    db.commit()
    return {"ok": True}


@router.get("/models/{mid}/floors")
def list_floors(mid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    m = _project_of_model(db, mid, user)
    return [S.floor_out(f) for f in db.query(Floor).filter(Floor.model_id == m.id).all()]


@router.get("/models/{mid}/floors/{fid}")
def get_floor(mid: str, fid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    _project_of_model(db, mid, user)
    f = db.query(Floor).filter(Floor.id == fid, Floor.model_id == mid).first()
    if not f:
        raise HTTPException(status_code=404, detail="Floor not found")
    return S.floor_out(f)


@router.get("/models/{mid}/elements")
def list_elements(mid: str, floor_id: str | None = Query(default=None, alias="floorId"), category: str | None = None,
                  visible: bool | None = None, user: User = Depends(deps.get_current_user),
                  db: Session = Depends(get_db)):
    m = _project_of_model(db, mid, user)
    q = db.query(ModelElement).filter(ModelElement.model_id == m.id)
    if floor_id:
        q = q.filter(ModelElement.floor_id == floor_id)
    if category:
        q = q.filter(ModelElement.category == category)
    if visible is not None:
        q = q.filter(ModelElement.visible.is_(visible))
    return [S.element_out(e) for e in q.limit(1000).all()]


@router.get("/models/{mid}/elements/{eid}")
def get_element(mid: str, eid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    _project_of_model(db, mid, user)
    e = db.query(ModelElement).filter(ModelElement.id == eid, ModelElement.model_id == mid).first()
    if not e:
        raise HTTPException(status_code=404, detail="Element not found")
    return S.element_out(e)


@router.get("/models/{mid}/conflicts")
def list_conflicts(mid: str, severity: str | None = None, status: str | None = None,
                   user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    m = _project_of_model(db, mid, user)
    q = db.query(ModelConflict).filter(ModelConflict.model_id == m.id)
    if severity:
        q = q.filter(ModelConflict.severity == severity)
    if status:
        q = q.filter(ModelConflict.status == status)
    return [S.mconflict_out(c) for c in q.all()]


@router.post("/models/{mid}/clash-detection")
def run_clash(mid: str, body: sch.ClashRunIn, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    m = _project_of_model(db, mid, user)
    elements = [{"id": e.id, "name": e.name, "category": e.category, "geometry": e.geometry or {}}
                for e in db.query(ModelElement).filter(ModelElement.model_id == m.id).all()]
    hits = clash.detect(elements, body.tolerance or 0.05)
    conflicts = []
    for h in hits:
        c = ModelConflict(id=deps.uid(), model_id=m.id, type="clash", severity="high", status="new",
                          elements=[h["a"], h["b"]],
                          description=f"{h['aName']} clashes with {h['bName']}", location=h["location"])
        db.add(c)
        conflicts.append(S.mconflict_out(c))
    db.commit()
    return {"runId": deps.uid(), "conflicts": [c["id"] for c in conflicts]}


@router.get("/models/{mid}/view-state")
def get_view_state(mid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    m = _project_of_model(db, mid, user)
    vs = db.get(ViewState, m.id)
    return (vs.state if vs else {}) or {}


@router.put("/models/{mid}/view-state")
def save_view_state(mid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    m = _project_of_model(db, mid, user)
    vs = db.get(ViewState, m.id)
    if not vs:
        vs = ViewState(model_id=m.id, state=body)
        db.add(vs)
    else:
        vs.state = body
    db.commit()
    return vs.state


@router.get("/models/{mid}/compare")
def compare(mid: str, from_version: int = Query(alias="fromVersion"),
            to_version: int = Query(alias="toVersion"),
            user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    _project_of_model(db, mid, user)
    return {"fromVersion": from_version, "toVersion": to_version, "added": [], "removed": [], "modified": []}


@router.get("/models/{mid}/measurements")
def list_measurements(mid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    _project_of_model(db, mid, user)
    return [{"id": m.id, "type": m.type, "points": m.points, "value": m.value, "unit": m.unit, "label": m.label}
            for m in db.query(Measurement).filter(Measurement.model_id == mid).all()]


@router.post("/models/{mid}/measurements", status_code=201)
def save_measurement(mid: str, body: sch.MeasurementIn, user: User = Depends(deps.get_current_user),
                     db: Session = Depends(get_db)):
    _project_of_model(db, mid, user)
    m = Measurement(id=body.id or deps.uid(), model_id=mid, type=body.type, points=body.points,
                    value=body.value, unit=body.unit, label=body.label)
    db.add(m)
    db.commit()
    return {"id": m.id, "type": m.type, "points": m.points, "value": m.value, "unit": m.unit, "label": m.label}


@router.delete("/models/{mid}/measurements/{msid}")
def delete_measurement(mid: str, msid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    _project_of_model(db, mid, user)
    m = db.query(Measurement).filter(Measurement.id == msid, Measurement.model_id == mid).first()
    if not m:
        raise HTTPException(status_code=404, detail="Measurement not found")
    db.delete(m)
    db.commit()
    return {"ok": True}


@router.get("/models/{mid}/section-planes")
def list_sections(mid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    _project_of_model(db, mid, user)
    return [{"id": s.id, "normal": s.normal, "constant": s.constant, "visible": s.visible}
            for s in db.query(SectionPlane).filter(SectionPlane.model_id == mid).all()]


@router.post("/models/{mid}/section-planes", status_code=201)
def save_section(mid: str, body: sch.SectionPlaneIn, user: User = Depends(deps.get_current_user),
                 db: Session = Depends(get_db)):
    _project_of_model(db, mid, user)
    s = SectionPlane(id=body.id or deps.uid(), model_id=mid, normal=body.normal, constant=body.constant, visible=body.visible)
    db.add(s)
    db.commit()
    return {"id": s.id, "normal": s.normal, "constant": s.constant, "visible": s.visible}


@router.patch("/models/{mid}/section-planes/{spid}")
def update_section(mid: str, spid: str, body: dict, user: User = Depends(deps.get_current_user),
                   db: Session = Depends(get_db)):
    _project_of_model(db, mid, user)
    s = db.query(SectionPlane).filter(SectionPlane.id == spid, SectionPlane.model_id == mid).first()
    if not s:
        raise HTTPException(status_code=404, detail="Section plane not found")
    for k in ("normal", "constant", "visible"):
        if k in body:
            setattr(s, k, body[k])
    db.commit()
    return {"id": s.id, "normal": s.normal, "constant": s.constant, "visible": s.visible}


@router.delete("/models/{mid}/section-planes/{spid}")
def delete_section(mid: str, spid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    _project_of_model(db, mid, user)
    s = db.query(SectionPlane).filter(SectionPlane.id == spid, SectionPlane.model_id == mid).first()
    if not s:
        raise HTTPException(status_code=404, detail="Section plane not found")
    db.delete(s)
    db.commit()
    return {"ok": True}


@router.get("/models/{mid}/export")
def export_model(mid: str, format: str = "glb", user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    m = _project_of_model(db, mid, user)
    data = get_store().get(m.file_key)
    if data is None:
        raise HTTPException(status_code=404, detail="Model file not found")
    ctype = {"glb": "model/gltf-binary", "gltf": "model/gltf+json"}.get(format, "application/octet-stream")
    return Response(content=data, media_type=ctype,
                    headers={"Content-Disposition": f'attachment; filename="{m.name}.{format}"'})


@router.get("/models/{mid}/elements/{eid}/quantity")
def element_quantity(mid: str, eid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    e = _element(db, mid, eid, user)
    return e.quantity or {"unit": "m3", "volume": 0}


@router.get("/models/{mid}/elements/{eid}/cost")
def element_cost(mid: str, eid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    e = _element(db, mid, eid, user)
    return e.cost or {"material": 0, "labour": 0, "equipment": 0, "total": 0, "currency": "INR"}


@router.get("/models/{mid}/elements/{eid}/schedule")
def element_schedule(mid: str, eid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    e = _element(db, mid, eid, user)
    return e.schedule or {}


def _element(db: Session, mid: str, eid: str, user: User):
    _project_of_model(db, mid, user)
    e = db.query(ModelElement).filter(ModelElement.id == eid, ModelElement.model_id == mid).first()
    if not e:
        raise HTTPException(status_code=404, detail="Element not found")
    return e


@router.post("/models/{mid}/elements/{eid}/boq-links")
def link_boq(mid: str, eid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    e = _element(db, mid, eid, user)
    bid = body.get("boqItemId")
    items = list(e.boq_items or [])
    if bid and bid not in items:
        items.append(bid)
    e.boq_items = items
    db.commit()
    return {"ok": True}


@router.delete("/models/{mid}/elements/{eid}/boq-links/{bid}")
def unlink_boq(mid: str, eid: str, bid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    e = _element(db, mid, eid, user)
    e.boq_items = [x for x in (e.boq_items or []) if x != bid]
    db.commit()
    return {"ok": True}
