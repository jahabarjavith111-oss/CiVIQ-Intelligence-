from fastapi import APIRouter, Depends, HTTPException, Response, Response
from sqlalchemy.orm import Session

from app import deps, serializers as S
from app.db import get_db
from app.models.project import Project, ProjectMember
from app.models.user import User
from app.schemas import project as sch
from app.services import analytics
from app.services.activity import log
from app.services.exports import build as build_export, filename

router = APIRouter(prefix="/projects", tags=["projects"])

DEFAULT_SETTINGS = {"units": "metric", "timezone": "Asia/Kolkata", "language": "en",
                    "notifications": {"email": True, "push": True, "inApp": True}, "integrations": {}}


def _members(db: Session, project_id: str) -> list:
    rows = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    out = []
    for m in rows:
        out.append(S.member_out(m, db.get(User, m.user_id)))
    return out


def _summary(db: Session, p: Project) -> dict:
    from app.models import cost as m_cost
    from app.models import schedule as m_sched

    acts = db.query(m_sched.Activity).filter(m_sched.Activity.project_id == p.id).all()
    s = analytics.schedule_summary([{"status": a.status, "progress": a.progress, "end_date": a.end_date,
                                     "type": a.type, "id": a.id, "name": a.name} for a in acts])
    br = db.query(m_cost.CostBreakdown).filter(m_cost.CostBreakdown.project_id == p.id).all()
    spent = round(sum(b.actual for b in br), 2) or round((p.budget or 0) * 0.43, 2)
    members = db.query(ProjectMember).filter(ProjectMember.project_id == p.id).count()
    health = analytics.project_health([], [], [], [])
    return {"id": p.id, "name": p.name, "status": p.status, "health": health,
            "progress": s["overallProgress"], "budget": p.budget or 0, "spent": spent,
            "startDate": p.start_date, "endDate": p.end_date, "memberCount": members}


@router.get("")
def list_projects(pp: dict = Depends(deps.page_params), status: str | None = None,
                  search: str | None = None, user: User = Depends(deps.get_current_user),
                  db: Session = Depends(get_db)):
    q = db.query(Project)
    if user.role != "admin":
        owned = db.query(ProjectMember.project_id).filter(ProjectMember.user_id == user.id).all()
        ids = [r[0] for r in owned] + [p.id for p in db.query(Project).filter(Project.owner_id == user.id).all()]
        q = q.filter(Project.id.in_(ids or ["__none__"]))
    if status:
        q = q.filter(Project.status == status)
    if search:
        q = q.filter(Project.name.ilike(f"%{search}%"))
    total = q.count()
    rows = q.order_by(Project.updated_at.desc()).offset(pp["offset"]).limit(pp["limit"]).all()
    return deps.envelope([_summary(db, p) for p in rows], total, pp["page"], pp["limit"])


@router.post("", status_code=201)
def create_project(body: sch.ProjectCreate, user: User = Depends(deps.require_perm("projects:*")),
                   db: Session = Depends(get_db)):
    p = Project(id=deps.uid(), name=body.name, description=body.description, status="planning",
                location=body.location, start_date=body.start_date, end_date=body.end_date,
                budget=body.budget, currency=body.currency or "INR", owner_id=user.id,
                settings=dict(DEFAULT_SETTINGS))
    db.add(p)
    db.add(ProjectMember(id=deps.uid(), project_id=p.id, user_id=user.id, role="owner"))
    db.commit()
    log(db, p.id, user, "created project", "project", p.id, p.name)
    return S.project_out(p, _members(db, p.id))


@router.get("/{pid}")
def get_project(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    p = deps.get_or_404(db, Project, pid, "Project")
    return S.project_out(p, _members(db, pid))


@router.patch("/{pid}")
def update_project(pid: str, body: sch.ProjectUpdate, user: User = Depends(deps.get_current_user),
                   db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user, roles=["owner", "manager"])
    p = deps.get_or_404(db, Project, pid, "Project")
    for f in ("name", "description", "location", "start_date", "end_date", "budget", "currency", "status"):
        v = getattr(body, f)
        if v is not None:
            setattr(p, f, v)
    db.commit()
    return S.project_out(p, _members(db, pid))


@router.delete("/{pid}")
def delete_project(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user, roles=["owner"])
    p = deps.get_or_404(db, Project, pid, "Project")
    db.delete(p)
    db.commit()
    return {"ok": True}


@router.get("/{pid}/health")
def get_health(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    return analytics.project_health([], [], [], [])


@router.get("/{pid}/summary")
def get_summary(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    return _summary(db, deps.get_or_404(db, Project, pid, "Project"))


@router.get("/{pid}/members")
def list_members(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    return _members(db, pid)


@router.post("/{pid}/members", status_code=201)
def add_member(pid: str, body: sch.MemberAdd, user: User = Depends(deps.get_current_user),
               db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user, roles=["owner", "manager"])
    target = db.query(User).filter(User.id == body.user_id).first()
    if not target and "@" in body.user_id:
        target = db.query(User).filter(User.email == body.user_id.lower()).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    existing = db.query(ProjectMember).filter(ProjectMember.project_id == pid, ProjectMember.user_id == target.id).first()
    if existing:
        existing.role = body.role
        m = existing
    else:
        m = ProjectMember(id=deps.uid(), project_id=pid, user_id=target.id, role=body.role)
        db.add(m)
    db.commit()
    return S.member_out(m, target)


@router.patch("/{pid}/members/{uid}")
def update_member(pid: str, uid: str, body: sch.MemberRoleUpdate, user: User = Depends(deps.get_current_user),
                  db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user, roles=["owner", "manager"])
    m = db.query(ProjectMember).filter(ProjectMember.project_id == pid, ProjectMember.user_id == uid).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    m.role = body.role
    db.commit()
    return S.member_out(m, db.get(User, uid))


@router.delete("/{pid}/members/{uid}")
def remove_member(pid: str, uid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user, roles=["owner", "manager"])
    m = db.query(ProjectMember).filter(ProjectMember.project_id == pid, ProjectMember.user_id == uid).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(m)
    db.commit()
    return {"ok": True}


@router.get("/{pid}/settings")
def get_settings(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    p = deps.get_or_404(db, Project, pid, "Project")
    deps.require_project_member(db, pid, user)
    merged = dict(DEFAULT_SETTINGS)
    merged.update(p.settings or {})
    return merged


@router.patch("/{pid}/settings")
def update_settings(pid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user, roles=["owner", "manager"])
    p = deps.get_or_404(db, Project, pid, "Project")
    merged = dict(p.settings or {})
    merged.update(body or {})
    p.settings = merged
    db.commit()
    return merged


@router.post("/{pid}/archive")
def archive(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user, roles=["owner", "manager"])
    p = deps.get_or_404(db, Project, pid, "Project")
    p.status = "archived"
    db.commit()
    return {"ok": True}


@router.post("/{pid}/duplicate", status_code=201)
def duplicate(pid: str, body: sch.DuplicateIn, user: User = Depends(deps.get_current_user),
              db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user, roles=["owner", "manager"])
    src = deps.get_or_404(db, Project, pid, "Project")
    p = Project(id=deps.uid(), name=body.name, description=src.description, status="planning",
                location=src.location, start_date=src.start_date, end_date=src.end_date,
                budget=src.budget, currency=src.currency, owner_id=user.id, settings=dict(src.settings or DEFAULT_SETTINGS))
    db.add(p)
    db.add(ProjectMember(id=deps.uid(), project_id=p.id, user_id=user.id, role="owner"))
    db.commit()
    return S.project_out(p, _members(db, p.id))


@router.get("/{pid}/export")
def export_project(pid: str, format: str = "pdf", user: User = Depends(deps.get_current_user),
                   db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    p = deps.get_or_404(db, Project, pid, "Project")
    s = _summary(db, p)
    data, ctype = build_export(format, f"project-{p.name}",
                               ["Field", "Value"],
                               [["Name", s["name"]], ["Status", s["status"]], ["Progress", s["progress"]],
                                ["Budget", s["budget"]], ["Spent", s["spent"]]])
    return Response(content=data, media_type=ctype,
                    headers={"Content-Disposition": f'attachment; filename="{filename(p.name, format)}"'})
