"""Super-admin platform endpoints. Every route requires the single admin account."""
import time
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app import deps, serializers as S
from app.config import settings
from app.db import get_db
from app.models.admin import AuditLog, PlatformSetting, DEFAULT_SETTINGS
from app.models.copilot import Conversation, Message
from app.models.coordination import Conflict
from app.models.cost import CostBreakdown
from app.models.drawing import Drawing, DrawingAnalysis
from app.models.project import Project, ProjectMember
from app.models.risk import Risk
from app.models.user import User
from app.services.audit import audit

router = APIRouter(tags=["admin"])

Admin = Depends(deps.require_admin)


def _other_admin_exists(db: Session, exclude_id: str) -> bool:
    return db.query(User).filter(User.role == "admin", User.id != exclude_id).first() is not None


# ---------- Platform overview ----------

@router.get("/admin/overview")
def overview(user: User = Admin, db: Session = Depends(get_db)):
    users = db.query(User).all()
    projects = db.query(Project).all()
    return {
        "users": {
            "total": len(users),
            "byRole": _counts([u.role for u in users]),
            "suspended": sum(1 for u in users if not u.is_active),
        },
        "projects": {
            "total": len(projects),
            "byStatus": _counts([p.status for p in projects]),
        },
        "drawings": {
            "total": db.query(func.count(Drawing.id)).scalar() or 0,
            "analysesByStatus": _counts([r[0] for r in db.query(DrawingAnalysis.status).all()]),
        },
        "copilot": {
            "conversations": db.query(func.count(Conversation.id)).scalar() or 0,
            "messages24h": db.query(func.count(Message.id)).filter(
                Message.created_at >= datetime.utcnow() - timedelta(hours=24)).scalar() or 0,
        },
        "activity24h": db.query(func.count(AuditLog.id)).filter(
            AuditLog.created_at >= datetime.utcnow() - timedelta(hours=24)).scalar() or 0,
    }


def _counts(values: list) -> list[dict]:
    out: dict[str, int] = {}
    for v in values:
        out[str(v)] = out.get(str(v), 0) + 1
    return [{"key": k, "count": v} for k, v in sorted(out.items())]


# ---------- User management ----------

@router.get("/admin/users")
def list_users(search: str | None = None, role: str | None = None,
               status: str | None = None, pp: dict = Depends(deps.page_params),
               user: User = Admin, db: Session = Depends(get_db)):
    q = db.query(User)
    if search:
        like = f"%{search.strip().lower()}%"
        q = q.filter(func.lower(User.email).like(like) | func.lower(User.name).like(like))
    if role:
        q = q.filter(User.role == role)
    if status == "suspended":
        q = q.filter(User.is_active.is_(False))
    elif status == "active":
        q = q.filter(User.is_active.is_(True))
    total = q.count()
    rows = q.order_by(User.created_at.desc()).offset(pp["offset"]).limit(pp["limit"]).all()
    counts = {u.id: 0 for u in rows}
    if rows:
        for uid, n in db.query(ProjectMember.user_id, func.count(ProjectMember.id)).filter(
                ProjectMember.user_id.in_(list(counts))).group_by(ProjectMember.user_id).all():
            counts[uid] = n
    return {**deps.envelope([S.admin_user_out(u, counts[u.id]) for u in rows], total, pp["page"], pp["limit"])}


@router.patch("/admin/users/{uid}")
def update_user(uid: str, body: dict, user: User = Depends(deps.require_admin),
                db: Session = Depends(get_db)):
    target = db.get(User, uid)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if "name" in body and body["name"]:
        target.name = str(body["name"])[:255]
    if "role" in body and body["role"] != target.role:
        new_role = str(body["role"])
        if new_role not in ("admin", "project-manager", "engineer", "viewer"):
            raise HTTPException(status_code=400, detail="Invalid role")
        if new_role == "admin" and _other_admin_exists(db, target.id):
            raise HTTPException(status_code=400, detail="Only one super admin is allowed")
        if target.role == "admin" and new_role != "admin" and not _other_admin_exists(db, target.id):
            raise HTTPException(status_code=400, detail="Cannot demote the only super admin")
        audit(db, user, "user.role-changed", "user", target.id,
              {"from": target.role, "to": new_role})
        target.role = new_role
    if "isActive" in body:
        _set_active(db, user, target, bool(body["isActive"]))
    db.commit()
    return S.admin_user_out(target)


def _set_active(db: Session, actor: User, target: User, active: bool) -> None:
    if target.id == actor.id:
        raise HTTPException(status_code=400, detail="You cannot suspend your own admin account")
    if not active and target.role == "admin" and not _other_admin_exists(db, target.id):
        raise HTTPException(status_code=400, detail="Cannot suspend the only super admin")
    if target.is_active != active:
        audit(db, actor, "user.suspended" if not active else "user.activated", "user", target.id, {})
    target.is_active = active


@router.post("/admin/users/{uid}/suspend")
def suspend_user(uid: str, user: User = Depends(deps.require_admin), db: Session = Depends(get_db)):
    target = db.get(User, uid)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    _set_active(db, user, target, False)
    db.commit()
    return S.admin_user_out(target)


@router.post("/admin/users/{uid}/activate")
def activate_user(uid: str, user: User = Depends(deps.require_admin), db: Session = Depends(get_db)):
    target = db.get(User, uid)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    _set_active(db, user, target, True)
    db.commit()
    return S.admin_user_out(target)


# ---------- Project monitoring ----------

@router.get("/admin/projects")
def list_all_projects(status: str | None = None, pp: dict = Depends(deps.page_params),
                      user: User = Admin, db: Session = Depends(get_db)):
    q = db.query(Project)
    if status:
        q = q.filter(Project.status == status)
    total = q.count()
    rows = q.order_by(Project.created_at.desc()).offset(pp["offset"]).limit(pp["limit"]).all()
    out = []
    for p in rows:
        members = db.query(func.count(ProjectMember.id)).filter(ProjectMember.project_id == p.id).scalar() or 0
        drawings = db.query(func.count(Drawing.id)).filter(Drawing.project_id == p.id).scalar() or 0
        open_conf = db.query(func.count(Conflict.id)).filter(
            Conflict.project_id == p.id, Conflict.status.in_(["new", "in-review"])).scalar() or 0
        open_risks = db.query(func.count(Risk.id)).filter(
            Risk.project_id == p.id, Risk.status.in_(["identified", "assessed", "mitigating", "monitoring"])).scalar() or 0
        spent = db.query(func.coalesce(func.sum(CostBreakdown.actual), 0)).filter(
            CostBreakdown.project_id == p.id).scalar() or 0
        out.append({"id": p.id, "name": p.name, "status": p.status, "budget": p.budget,
                    "currency": p.currency, "spent": spent, "members": members, "drawings": drawings,
                    "openConflicts": open_conf, "openRisks": open_risks,
                    "ownerId": p.owner_id, "startDate": S.iso(p.start_date), "endDate": S.iso(p.end_date)})
    return {**deps.envelope(out, total, pp["page"], pp["limit"])}


@router.post("/admin/projects/{pid}/archive")
def archive_project(pid: str, user: User = Depends(deps.require_admin), db: Session = Depends(get_db)):
    p = db.get(Project, pid)
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    p.status = "archived"
    audit(db, user, "project.archived", "project", pid, {"name": p.name})
    db.commit()
    return {"id": p.id, "status": p.status}


# ---------- AI monitoring ----------

@router.get("/admin/ai/analyses")
def ai_analyses(status: str | None = None, pp: dict = Depends(deps.page_params),
                user: User = Admin, db: Session = Depends(get_db)):
    q = db.query(DrawingAnalysis)
    if status:
        q = q.filter(DrawingAnalysis.status == status)
    total = q.count()
    rows = q.order_by(DrawingAnalysis.created_at.desc()).offset(pp["offset"]).limit(pp["limit"]).all()
    drawings = {d.id: d for d in db.query(Drawing).filter(
        Drawing.id.in_([a.drawing_id for a in rows] or ["__none__"])).all()}
    out = []
    for a in rows:
        d = drawings.get(a.drawing_id)
        out.append({**S.analysis_out(a), "drawingName": d.name if d else "?",
                    "projectId": d.project_id if d else None})
    return {**deps.envelope(out, total, pp["page"], pp["limit"])}


@router.get("/admin/ai/usage")
def ai_usage(days: int = Query(default=14, ge=1, le=90),
             user: User = Admin, db: Session = Depends(get_db)):
    cutoff = datetime.utcnow() - timedelta(days=days)
    msgs = db.query(Message).filter(Message.created_at >= cutoff).all()
    by_day: dict[str, int] = {}
    by_intent: dict[str, int] = {}
    failed = neg = assistants = 0
    for m in msgs:
        day = m.created_at.date().isoformat() if m.created_at else "?"
        by_day[day] = by_day.get(day, 0) + 1
        if m.role == "assistant":
            assistants += 1
            if m.intent:
                by_intent[m.intent] = by_intent.get(m.intent, 0) + 1
            if m.verification == "failed":
                failed += 1
            if (m.rating or "") in ("bad", "not-helpful", "down"):
                neg += 1
    return {
        "conversations": db.query(func.count(Conversation.id)).scalar() or 0,
        "assistantMessages": assistants,
        "failedVerifications": failed,
        "negativeRatings": neg,
        "byDay": [{"date": k, "count": v} for k, v in sorted(by_day.items())],
        "byIntent": [{"intent": k, "count": v} for k, v in sorted(by_intent.items(), key=lambda x: -x[1])],
    }


# ---------- System health ----------

@router.get("/admin/health")
def system_health(user: User = Admin, db: Session = Depends(get_db)):
    from sqlalchemy import text
    t0 = time.perf_counter()
    try:
        db.execute(text("SELECT 1"))
        db_ms = round((time.perf_counter() - t0) * 1000, 1)
        db_ok = True
    except Exception as exc:
        db_ms, db_ok, db_err = None, False, str(exc)
    else:
        db_err = None
    storage_bytes = 0
    try:
        import os
        root = settings.local_files_dir
        for dp, _, fns in os.walk(root):
            for f in fns:
                try:
                    storage_bytes += os.path.getsize(os.path.join(dp, f))
                except OSError:
                    pass
    except Exception:
        pass
    redis_ok: bool | None = None
    queue_depth: int | None = None
    try:
        import redis
        r = redis.Redis.from_url(settings.redis_url, socket_timeout=2)
        r.ping()
        redis_ok = True
        try:
            from rq import Queue
            queue_depth = len(Queue("civiq", connection=r))
        except Exception:
            pass
    except Exception:
        redis_ok = False
    return {"app": settings.app_name, "env": settings.env, "version": "0.1.0",
            "database": {"ok": db_ok, "latencyMs": db_ms, "error": db_err},
            "storage": {"bytes": storage_bytes, "dir": settings.local_files_dir},
            "redis": {"ok": redis_ok, "queueDepth": queue_depth},
            "ai": {"provider": settings.llm_base_url and "custom" or "local", "model": settings.llm_model}}


# ---------- Platform settings ----------

@router.get("/admin/settings")
def get_settings(user: User = Admin, db: Session = Depends(get_db)):
    from app.models.admin import DEFAULT_SETTINGS
    rows = {s.key: s for s in db.query(PlatformSetting).all()}
    return [S.setting_out(k, rows[k].value["value"] if k in rows else d["value"],
                          rows[k].updated_by if k in rows else None,
                          rows[k].updated_at if k in rows else None)
            for k, d in DEFAULT_SETTINGS.items()]


@router.put("/admin/settings")
def put_settings(body: dict, user: User = Depends(deps.require_admin), db: Session = Depends(get_db)):
    from app.models.admin import DEFAULT_SETTINGS
    key, value = body.get("key"), (body.get("value") or {})
    if key not in DEFAULT_SETTINGS:
        raise HTTPException(status_code=400, detail="Unknown setting key")
    if key == "upload.max_mb":
        try:
            iv = int(value.get("value", 0))
        except Exception:
            raise HTTPException(status_code=400, detail="upload.max_mb must be a number")
        if not 1 <= iv <= 1024:
            raise HTTPException(status_code=400, detail="upload.max_mb must be 1..1024")
    row = db.get(PlatformSetting, key)
    if not row:
        row = PlatformSetting(key=key)
        db.add(row)
    old = row.value
    row.value = {"value": value.get("value")}
    row.updated_by = user.id
    audit(db, user, "settings.updated", "setting", key, {"from": old, "to": row.value})
    db.commit()
    return S.setting_out(key, row.value["value"], row.updated_by, row.updated_at)


# ---------- Audit logs ----------

@router.get("/admin/audit")
def list_audit(actor: str | None = None, action: str | None = None,
               pp: dict = Depends(deps.page_params),
               user: User = Admin, db: Session = Depends(get_db)):
    q = db.query(AuditLog)
    if actor:
        like = f"%{actor.strip().lower()}%"
        q = q.filter(func.lower(AuditLog.actor_name).like(like) | func.lower(AuditLog.actor_id).like(like))
    if action:
        q = q.filter(AuditLog.action == action)
    total = q.count()
    rows = q.order_by(AuditLog.created_at.desc()).offset(pp["offset"]).limit(pp["limit"]).all()
    return {**deps.envelope([S.audit_out(a) for a in rows], total, pp["page"], pp["limit"])}


# ---------- Subscriptions (disabled stub) ----------

@router.get("/admin/billing")
def billing(user: User = Admin):
    return {"enabled": False, "message": "Subscription management is not enabled on this platform."}
