from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app import deps, serializers as S
from app.db import get_db
from app.models.revision import EvidenceAnnotation, Revision, RevisionChange, VisualEvidence
from app.models.user import User
from app.schemas import revision as sch
from app.services.activity import log
from app.services.exports import build as build_export, filename

router = APIRouter(tags=["revisions"])

EMPTY = {"magnitude": "none", "value": 0, "percent": 0, "description": "", "details": []}


def _full(db: Session, r: Revision) -> dict:
    changes = []
    for ch in db.query(RevisionChange).filter(RevisionChange.revision_id == r.id).all():
        ev = db.query(VisualEvidence).filter(VisualEvidence.change_id == ch.id).first()
        ev_out = None
        if ev:
            anns = db.query(EvidenceAnnotation).filter(EvidenceAnnotation.evidence_id == ev.id).all()
            ev_out = {"id": ev.id, "type": ev.type, "beforeUrl": ev.before_url, "afterUrl": ev.after_url,
                      "overlayUrl": ev.overlay_url,
                      "annotations": [{"id": a.id, "type": a.type, "coordinates": a.coordinates,
                                       "label": a.label, "color": a.color} for a in anns]}
        changes.append({"id": ch.id, "revisionId": ch.revision_id, "entityType": ch.entity_type,
                        "entityId": ch.entity_id, "action": ch.action, "field": ch.field,
                        "oldValue": ch.old_value, "newValue": ch.new_value,
                        "description": ch.description, "visualEvidence": ev_out})
    return S.revision_out(r, changes)


@router.get("/projects/{pid}/revisions")
def list_revisions(pid: str, pp: dict = Depends(deps.page_params), type: str | None = None,
                   status: str | None = None, user: User = Depends(deps.get_current_user),
                   db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    q = db.query(Revision).filter(Revision.project_id == pid)
    if type:
        q = q.filter(Revision.type == type)
    if status:
        q = q.filter(Revision.status == status)
    total = q.count()
    rows = q.order_by(Revision.submitted_at.desc()).offset(pp["offset"]).limit(pp["limit"]).all()
    return deps.envelope([_full(db, r) for r in rows], total, pp["page"], pp["limit"])


@router.post("/projects/{pid}/revisions", status_code=201)
def create_revision(pid: str, body: sch.RevisionCreate, user: User = Depends(deps.get_current_user),
                    db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    r = Revision(id=deps.uid(), project_id=pid, from_version=body.from_version, to_version=body.to_version,
                 title=body.title, description=body.description, type=body.type, status=body.status,
                 impacts={"cost": dict(EMPTY), "schedule": dict(EMPTY), "material": dict(EMPTY), "risk": dict(EMPTY)},
                 submitted_by=user.id)
    db.add(r)
    db.commit()
    log(db, pid, user, "created revision", "revision", r.id, r.title)
    return _full(db, r)


@router.get("/revisions/{rid}")
def get_revision(rid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Revision, rid, "Revision")
    deps.require_project_member(db, r.project_id, user)
    return _full(db, r)


@router.patch("/revisions/{rid}")
def update_revision(rid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Revision, rid, "Revision")
    deps.require_project_member(db, r.project_id, user)
    mapping = {"fromVersion": "from_version", "toVersion": "to_version", "submittedBy": "submitted_by",
               "submittedAt": "submitted_at", "reviewedBy": "reviewed_by", "reviewedAt": "reviewed_at",
               "approvedBy": "approved_by", "approvedAt": "approved_at", "implementedAt": "implemented_at"}
    for k, v in body.items():
        key = mapping.get(k, k)
        if hasattr(r, key) and key not in ("id", "project_id"):
            setattr(r, key, v)
    db.commit()
    return _full(db, r)


@router.delete("/revisions/{rid}")
def delete_revision(rid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Revision, rid, "Revision")
    deps.require_project_member(db, r.project_id, user)
    db.delete(r)
    db.commit()
    return {"ok": True}


@router.post("/revisions/{rid}/submit")
def submit(rid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Revision, rid, "Revision")
    deps.require_project_member(db, r.project_id, user)
    r.status = "submitted"
    db.commit()
    return _full(db, r)


@router.post("/revisions/{rid}/review")
def review(rid: str, body: sch.ReviewIn, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Revision, rid, "Revision")
    deps.require_project_member(db, r.project_id, user)
    r.status = "approved" if body.status == "approved" else "rejected"
    r.reviewed_by = user.id
    r.reviewed_at = datetime.utcnow()
    if body.status == "approved":
        r.approved_by = user.id
        r.approved_at = datetime.utcnow()
    db.commit()
    return _full(db, r)


@router.post("/revisions/{rid}/implement")
def implement(rid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Revision, rid, "Revision")
    deps.require_project_member(db, r.project_id, user)
    r.status = "implemented"
    r.implemented_at = datetime.utcnow()
    db.commit()
    return _full(db, r)


@router.get("/projects/{pid}/revisions/compare")
def compare(pid: str, from_version: int = Query(alias="fromVersion"),
            to_version: int = Query(alias="toVersion"),
            user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    revs = db.query(Revision).filter(Revision.project_id == pid, Revision.from_version >= from_version,
                                     Revision.to_version <= to_version).all()
    return {"revisionId": revs[0].id if revs else None, "drawingComparisons": [], "modelComparisons": [],
            "scheduleComparisons": [], "boqComparisons": [], "costComparisons": []}


@router.get("/revisions/{rid}/changes")
def list_changes(rid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Revision, rid, "Revision")
    deps.require_project_member(db, r.project_id, user)
    out = []
    for ch in db.query(RevisionChange).filter(RevisionChange.revision_id == rid).all():
        out.append({"id": ch.id, "revisionId": ch.revision_id, "entityType": ch.entity_type,
                    "entityId": ch.entity_id, "action": ch.action, "field": ch.field,
                    "oldValue": ch.old_value, "newValue": ch.new_value, "description": ch.description})
    return out


@router.post("/revisions/{rid}/changes", status_code=201)
def add_change(rid: str, body: sch.ChangeIn, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Revision, rid, "Revision")
    deps.require_project_member(db, r.project_id, user)
    ch = RevisionChange(id=deps.uid(), revision_id=rid, entity_type=body.entity_type, entity_id=body.entity_id,
                        action=body.action, field=body.field, old_value=body.old_value, new_value=body.new_value,
                        description=body.description)
    db.add(ch)
    db.commit()
    return {"id": ch.id, "revisionId": rid, "entityType": ch.entity_type, "entityId": ch.entity_id,
            "action": ch.action, "description": ch.description}


@router.patch("/revisions/changes/{cid}")
def update_change(cid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    ch = deps.get_or_404(db, RevisionChange, cid, "Change")
    proj = (db.get(Revision, ch.revision_id) or None)
    deps.require_project_member(db, proj.project_id if proj else "", user)
    mapping = {"revisionId": "revision_id", "entityType": "entity_type", "entityId": "entity_id",
               "oldValue": "old_value", "newValue": "new_value"}
    for k, v in body.items():
        key = mapping.get(k, k)
        if hasattr(ch, key):
            setattr(ch, key, v)
    db.commit()
    return {"ok": True}


@router.delete("/revisions/changes/{cid}")
def delete_change(cid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    ch = deps.get_or_404(db, RevisionChange, cid, "Change")
    proj = db.get(Revision, ch.revision_id)
    deps.require_project_member(db, proj.project_id if proj else "", user)
    db.delete(ch)
    db.commit()
    return {"ok": True}


@router.post("/revisions/changes/{cid}/evidence", status_code=201)
def add_evidence(cid: str, body: sch.EvidenceIn, user: User = Depends(deps.get_current_user),
                 db: Session = Depends(get_db)):
    ch = deps.get_or_404(db, RevisionChange, cid, "Change")
    proj = db.get(Revision, ch.revision_id)
    deps.require_project_member(db, proj.project_id if proj else "", user)
    ev = VisualEvidence(id=deps.uid(), change_id=cid, type=body.type, before_url=body.before_url,
                        after_url=body.after_url, overlay_url=body.overlay_url)
    db.add(ev)
    db.flush()
    for a in body.annotations or []:
        db.add(EvidenceAnnotation(id=deps.uid(), evidence_id=ev.id, type=a.get("type", "point"),
                                  coordinates=a.get("coordinates", []), label=a.get("label", ""),
                                  color=a.get("color", "#dc2626")))
    db.commit()
    return {"id": ev.id, "type": ev.type}


@router.patch("/revisions/evidence/{eid}")
def update_evidence(eid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    ev = deps.get_or_404(db, VisualEvidence, eid, "Evidence")
    mapping = {"beforeUrl": "before_url", "afterUrl": "after_url", "overlayUrl": "overlay_url"}
    for k, v in body.items():
        key = mapping.get(k, k)
        if hasattr(ev, key):
            setattr(ev, key, v)
    db.commit()
    return {"ok": True}


@router.post("/revisions/evidence/{eid}/annotations", status_code=201)
def add_annotation(eid: str, body: sch.AnnotationIn, user: User = Depends(deps.get_current_user),
                   db: Session = Depends(get_db)):
    deps.get_or_404(db, VisualEvidence, eid, "Evidence")
    a = EvidenceAnnotation(id=deps.uid(), evidence_id=eid, type=body.type, coordinates=list(body.coordinates),
                           label=body.label, color=body.color)
    db.add(a)
    db.commit()
    return {"id": a.id, "type": a.type, "coordinates": a.coordinates, "label": a.label, "color": a.color}


@router.patch("/revisions/annotations/{aid}")
def update_annotation(aid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    a = deps.get_or_404(db, EvidenceAnnotation, aid, "Annotation")
    for k in ("type", "coordinates", "label", "color"):
        if k in body:
            setattr(a, k, body[k])
    db.commit()
    return {"ok": True}


@router.delete("/revisions/annotations/{aid}")
def delete_annotation(aid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    a = deps.get_or_404(db, EvidenceAnnotation, aid, "Annotation")
    db.delete(a)
    db.commit()
    return {"ok": True}


@router.get("/revisions/{rid}/impacts")
def impacts(rid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Revision, rid, "Revision")
    deps.require_project_member(db, r.project_id, user)
    return r.impacts or {}


@router.get("/projects/{pid}/revisions/export")
def export_revisions(pid: str, format: str = "csv", user: User = Depends(deps.get_current_user),
                     db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    revs = db.query(Revision).filter(Revision.project_id == pid).all()
    rows = [[r.title, r.type, r.status, r.from_version, r.to_version] for r in revs]
    data, ctype = build_export(format, f"revisions-{pid}", ["title", "type", "status", "from", "to"], rows)
    return Response(content=data, media_type=ctype,
                    headers={"Content-Disposition": f'attachment; filename="{filename("revisions", format)}"'})


@router.get("/projects/{pid}/revisions/versions")
def versions(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    revs = db.query(Revision).filter(Revision.project_id == pid).all()
    seen: dict[int, dict] = {}
    for r in revs:
        for v in (r.from_version, r.to_version):
            slot = seen.setdefault(v, {"version": v, "name": f"V{v}", "date": "", "revisionCount": 0})
            slot["revisionCount"] += 1
    return sorted(seen.values(), key=lambda x: x["version"])
