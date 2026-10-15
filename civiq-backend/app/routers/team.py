from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import deps, serializers as S
from app.db import get_db
from app.models.project import ProjectMember
from app.models.user import User
from app.schemas import collab as sch
from app.services import mail
from app.services.activity import log

router = APIRouter(tags=["team"])


@router.get("/projects/{pid}/team")
def list_team(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    rows = db.query(ProjectMember).filter(ProjectMember.project_id == pid).all()
    return [S.team_member_out(db.get(User, m.user_id) or User(id=m.user_id, email="", name="Unknown", password_hash="", role="viewer"), m) for m in rows]


@router.post("/projects/{pid}/team/invite", status_code=201)
def invite(pid: str, body: sch.InviteIn, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user, roles=["owner", "manager"])
    existing = db.query(User).filter(User.email == body.email.lower().strip()).first()
    if existing:
        m = db.query(ProjectMember).filter(ProjectMember.project_id == pid, ProjectMember.user_id == existing.id).first()
        if not m:
            m = ProjectMember(id=deps.uid(), project_id=pid, user_id=existing.id, role=body.role)
            db.add(m)
            db.commit()
        return {"invited": True, "email": existing.email}
    mail.send_email(body.email, f"You're invited to a CivIQ project",
                    f"{user.name} invited you. Create an account with this email to join.\n{body.message or ''}")
    log(db, pid, user, f"invited {body.email}", "team", None, body.email)
    return {"invited": True, "email": body.email}


@router.patch("/projects/{pid}/team/{uid}")
def update_role(pid: str, uid: str, body: sch.ProjectRoleUpdate, user: User = Depends(deps.get_current_user),
                db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user, roles=["owner", "manager"])
    m = db.query(ProjectMember).filter(ProjectMember.project_id == pid, ProjectMember.user_id == uid).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    m.role = body.role
    db.commit()
    return S.team_member_out(db.get(User, uid), m)


@router.delete("/projects/{pid}/team/{uid}")
def remove(pid: str, uid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user, roles=["owner", "manager"])
    m = db.query(ProjectMember).filter(ProjectMember.project_id == pid, ProjectMember.user_id == uid).first()
    if not m:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(m)
    db.commit()
    return {"ok": True}


@router.get("/team/members")
def org_members(user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    if user.role == "admin":
        users = db.query(User).limit(200).all()
    else:
        pids = [r[0] for r in db.query(ProjectMember.project_id).filter(ProjectMember.user_id == user.id).all()]
        uids = {r[0] for r in db.query(ProjectMember.user_id).filter(ProjectMember.project_id.in_(pids or ["__none__"])).all()}
        users = db.query(User).filter(User.id.in_(list(uids) or ["__none__"])).all()
    return [S.team_member_out(u) for u in users]
