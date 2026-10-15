from datetime import datetime

from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

from app import deps, serializers as S
from app.db import get_db
from app.models.coordination import ClashRun, Conflict, ConflictAttachment, ConflictComment, ConflictElement
from app.models.model3d import Model, ModelElement
from app.models.user import User
from app.schemas import conflict as sch
from app.services import analytics, clash
from app.services.activity import log, notify_project
from app.services.exports import build as build_export, filename, to_bcf
from app.services.imports import bcf_conflicts
from app.storage.store import get_store, new_key

router = APIRouter(tags=["coordination"])


def _full(db: Session, c: Conflict) -> dict:
    els = [{"id": e.id, "conflictId": e.conflict_id, "elementId": e.element_id, "elementType": e.element_type,
            "description": e.description, "bbox": e.bbox, "modelCoordinates": e.model_coordinates}
           for e in db.query(ConflictElement).filter(ConflictElement.conflict_id == c.id).all()]
    comments = [S.comment_out(x) for x in db.query(ConflictComment).filter(ConflictComment.conflict_id == c.id).order_by(ConflictComment.created_at).all()]
    atts = [S.attachment_out(x) for x in db.query(ConflictAttachment).filter(ConflictAttachment.conflict_id == c.id).all()]
    return S.conflict_out(c, els, comments, atts)


@router.get("/projects/{pid}/coordination/conflicts")
def list_conflicts(pid: str, pp: dict = Depends(deps.page_params), type: str | None = None,
                   severity: str | None = None, status: str | None = None,
                   user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    q = db.query(Conflict).filter(Conflict.project_id == pid)
    if type:
        q = q.filter(Conflict.type == type)
    if severity:
        q = q.filter(Conflict.severity == severity)
    if status:
        q = q.filter(Conflict.status == status)
    total = q.count()
    rows = q.order_by(Conflict.reported_at.desc()).offset(pp["offset"]).limit(pp["limit"]).all()
    return deps.envelope([_full(db, c) for c in rows], total, pp["page"], pp["limit"])


@router.post("/projects/{pid}/coordination/conflicts", status_code=201)
def create_conflict(pid: str, body: sch.ConflictCreate, user: User = Depends(deps.get_current_user),
                    db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    c = Conflict(id=deps.uid(), project_id=pid, drawing_ids=list(body.drawing_ids or []), model_id=body.model_id,
                 type=body.type, severity=body.severity, status=body.status, title=body.title,
                 description=body.description, location=body.location, assigned_to=body.assigned_to,
                 reported_by=user.id)
    db.add(c)
    db.flush()
    for el in body.elements or []:
        db.add(ConflictElement(id=deps.uid(), conflict_id=c.id, element_id=el.get("elementId", ""),
                               element_type=el.get("elementType", "model"),
                               description=el.get("description", ""), bbox=el.get("bbox"),
                               model_coordinates=el.get("modelCoordinates")))
    db.commit()
    notify_project(db, pid, "conflict", f"New {c.severity} clash: {c.title}", c.description, "/coordination", exclude=user.id)
    return _full(db, c)


@router.get("/coordination/conflicts/{cid}")
def get_conflict(cid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    c = deps.get_or_404(db, Conflict, cid, "Conflict")
    deps.require_project_member(db, c.project_id, user)
    return _full(db, c)


@router.patch("/coordination/conflicts/{cid}")
def update_conflict(cid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    c = deps.get_or_404(db, Conflict, cid, "Conflict")
    deps.require_project_member(db, c.project_id, user)
    mapping = {"drawingIds": "drawing_ids", "modelId": "model_id", "assignedTo": "assigned_to",
               "reportedBy": "reported_by", "reportedAt": "reported_at", "reviewedAt": "reviewed_at",
               "resolvedAt": "resolved_at"}
    for k, v in body.items():
        key = mapping.get(k, k)
        if hasattr(c, key) and key not in ("id", "project_id"):
            setattr(c, key, v)
    db.commit()
    return _full(db, c)


@router.delete("/coordination/conflicts/{cid}")
def delete_conflict(cid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    c = deps.get_or_404(db, Conflict, cid, "Conflict")
    deps.require_project_member(db, c.project_id, user)
    db.delete(c)
    db.commit()
    return {"ok": True}


@router.post("/coordination/conflicts/{cid}/assign")
def assign(cid: str, body: sch.AssignIn, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    c = deps.get_or_404(db, Conflict, cid, "Conflict")
    deps.require_project_member(db, c.project_id, user)
    c.assigned_to = body.user_id
    if c.status == "new":
        c.status = "in-review"
    db.commit()
    notify_project(db, c.project_id, "assignment", f"Clash assigned: {c.title}", c.description, "/coordination")
    return _full(db, c)


@router.patch("/coordination/conflicts/{cid}/status")
def set_status(cid: str, body: sch.StatusIn, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    c = deps.get_or_404(db, Conflict, cid, "Conflict")
    deps.require_project_member(db, c.project_id, user)
    c.status = body.status
    if body.resolution is not None:
        c.resolution = body.resolution
    if body.status in ("resolved", "approved"):
        c.resolved_at = datetime.utcnow()
    if body.status == "in-review" and not c.reviewed_at:
        c.reviewed_at = datetime.utcnow()
    db.commit()
    return _full(db, c)


@router.post("/coordination/conflicts/{cid}/comments", status_code=201)
def add_comment(cid: str, body: sch.CommentIn, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    c = deps.get_or_404(db, Conflict, cid, "Conflict")
    deps.require_project_member(db, c.project_id, user)
    cm = ConflictComment(id=deps.uid(), conflict_id=cid, author_id=user.id, author_name=user.name, content=body.content)
    db.add(cm)
    db.commit()
    return S.comment_out(cm)


@router.patch("/coordination/comments/{cmid}")
def update_comment(cmid: str, body: sch.CommentIn, user: User = Depends(deps.get_current_user),
                   db: Session = Depends(get_db)):
    cm = deps.get_or_404(db, ConflictComment, cmid, "Comment")
    c = db.get(Conflict, cm.conflict_id)
    deps.require_project_member(db, c.project_id if c else "", user)
    cm.content = body.content
    db.commit()
    return S.comment_out(cm)


@router.delete("/coordination/comments/{cmid}")
def delete_comment(cmid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    cm = deps.get_or_404(db, ConflictComment, cmid, "Comment")
    c = db.get(Conflict, cm.conflict_id)
    deps.require_project_member(db, c.project_id if c else "", user)
    db.delete(cm)
    db.commit()
    return {"ok": True}


@router.post("/coordination/conflicts/{cid}/attachments", status_code=201)
async def add_attachment(cid: str, file: UploadFile = File(...), type: str = Form("image"),
                         user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    c = deps.get_or_404(db, Conflict, cid, "Conflict")
    deps.require_project_member(db, c.project_id, user)
    data = await file.read()
    key = new_key(f"conflicts/{cid}", file.filename or "attachment")
    url = get_store().save(data, key, file.content_type or "application/octet-stream")
    a = ConflictAttachment(id=deps.uid(), conflict_id=cid, file_name=file.filename or "attachment",
                           file_key=key, file_url=url, type=type, uploaded_by=user.id)
    db.add(a)
    db.commit()
    return S.attachment_out(a)


@router.delete("/coordination/attachments/{aid}")
def delete_attachment(aid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    a = deps.get_or_404(db, ConflictAttachment, aid, "Attachment")
    c = db.get(Conflict, a.conflict_id)
    deps.require_project_member(db, c.project_id if c else "", user)
    get_store().delete(a.file_key)
    db.delete(a)
    db.commit()
    return {"ok": True}


@router.get("/projects/{pid}/coordination/summary")
def summary(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    confs = db.query(Conflict).filter(Conflict.project_id == pid).all()
    s = analytics.conflict_summary([{"severity": c.severity, "type": c.type, "status": c.status} for c in confs])
    return {"projectId": pid, **s}


@router.post("/projects/{pid}/coordination/clash-detection")
def run_detection(pid: str, body: sch.ClashRunIn, user: User = Depends(deps.get_current_user),
                  db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    m = db.get(Model, body.model_id)
    if not m or m.project_id != pid:
        raise HTTPException(status_code=404, detail="Model not found in project")
    elements = [{"id": e.id, "name": e.name, "category": e.category, "geometry": e.geometry or {}}
                for e in db.query(ModelElement).filter(ModelElement.model_id == m.id).all()]
    hits = clash.detect(elements, body.tolerance or 0.05)
    conflicts = []
    for h in hits:
        c = Conflict(id=deps.uid(), project_id=pid, model_id=m.id, type="structural-vs-mep",
                     severity="high", status="new",
                     title=f"{h['aName']} vs {h['bName']}", description="Detected by clash detection",
                     location={"modelCoordinates": h["location"]}, reported_by=user.id)
        db.add(c)
        conflicts.append({"id": c.id, "title": c.title})
    run = ClashRun(id=deps.uid(), project_id=pid, model_id=m.id, conflicts=conflicts,
                   statistics={"totalClashes": len(conflicts), "newClashes": len(conflicts),
                               "resolvedClashes": 0, "byType": {"structural-vs-mep": len(conflicts)},
                               "bySeverity": {"high": len(conflicts)}})
    db.add(run)
    db.commit()
    log(db, pid, user, "ran clash detection", "conflict", run.id, f"{len(conflicts)} clashes")
    return {"modelId": m.id, "runId": run.id, "runAt": run.run_at.isoformat(), "conflicts": conflicts,
            "statistics": run.statistics}


@router.get("/projects/{pid}/coordination/clash-runs")
def list_runs(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    rows = db.query(ClashRun).filter(ClashRun.project_id == pid).order_by(ClashRun.run_at.desc()).all()
    return [{"id": r.id, "modelId": r.model_id, "runAt": r.run_at.isoformat(), "statistics": r.statistics} for r in rows]


@router.get("/coordination/clash-runs/{rid}")
def get_run(rid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    r = deps.get_or_404(db, ClashRun, rid, "Clash run")
    deps.require_project_member(db, r.project_id, user)
    return {"modelId": r.model_id, "runId": r.id, "runAt": r.run_at.isoformat(),
            "conflicts": r.conflicts or [], "statistics": r.statistics or {}}


@router.get("/projects/{pid}/coordination/export")
def export_conflicts(pid: str, format: str = "csv", user: User = Depends(deps.get_current_user),
                      db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    confs = db.query(Conflict).filter(Conflict.project_id == pid).all()
    if format == "bcf":
        data = to_bcf([{"id": c.id, "title": c.title, "description": c.description, "type": c.type, "status": c.status} for c in confs])
        return Response(content=data, media_type="application/zip",
                        headers={"Content-Disposition": 'attachment; filename="conflicts.bcfzip"'})
    rows = [[c.title, c.type, c.severity, c.status] for c in confs]
    data, ctype = build_export(format, f"conflicts-{pid}", ["title", "type", "severity", "status"], rows)
    return Response(content=data, media_type=ctype,
                    headers={"Content-Disposition": f'attachment; filename="{filename("conflicts", format)}"'})


@router.post("/projects/{pid}/coordination/import-bcf")
async def import_bcf(pid: str, file: UploadFile = File(...), user: User = Depends(deps.get_current_user),
                     db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    parsed = bcf_conflicts(await file.read())
    for raw in parsed:
        db.add(Conflict(id=deps.uid(), project_id=pid, type="coordination", severity=raw["severity"],
                        status="new", title=raw["title"][:512], description=raw["description"], reported_by=user.id))
    db.commit()
    return {"imported": len(parsed)}


@router.get("/projects/{pid}/coordination/matrix")
def matrix(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    cats = ["architecture", "structure", "mep", "electrical", "plumbing"]
    confs = db.query(Conflict).filter(Conflict.project_id == pid).all()
    grid = [[0] * len(cats) for _ in cats]

    def bucket(t: str) -> int:
        t = (t or "").lower()
        for i, c in enumerate(cats):
            if c in t or (c == "structure" and "structural" in t):
                return i
        return -1

    for c in confs:
        parts = (c.type or "").split("-vs-")
        if len(parts) == 2:
            a, b = bucket(parts[0]), bucket(parts[1])
            if a >= 0 and b >= 0:
                grid[a][b] += 1
                grid[b][a] += 1
    return {"categories": cats, "matrix": grid}


@router.get("/projects/{pid}/coordination/trends")
def trends(pid: str, period: str | None = None, interval: str | None = None,
           user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    confs = db.query(Conflict).filter(Conflict.project_id == pid).all()
    by_sev: dict[str, int] = {}
    by_status: dict[str, int] = {}
    for c in confs:
        by_sev[c.severity] = by_sev.get(c.severity, 0) + 1
        by_status[c.status] = by_status.get(c.status, 0) + 1
    return [{"date": "current", "total": len(confs), "bySeverity": by_sev, "byStatus": by_status}]
