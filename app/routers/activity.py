from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app import deps, serializers as S
from app.db import get_db
from app.models.collab import ActivityItem
from app.models.user import User

router = APIRouter(tags=["activity"])


@router.get("/projects/{pid}/activity")
def project_activity(pid: str, pp: dict = Depends(deps.page_params),
                     entity_type: str | None = Query(default=None, alias="entityType"),
                     user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    q = db.query(ActivityItem).filter(ActivityItem.project_id == pid)
    if entity_type:
        q = q.filter(ActivityItem.entity_type == entity_type)
    total = q.count()
    rows = q.order_by(ActivityItem.created_at.desc()).offset(pp["offset"]).limit(pp["limit"]).all()
    return deps.envelope([S.activity_item_out(a) for a in rows], total, pp["page"], pp["limit"])


@router.get("/activity/feed")
def global_feed(pp: dict = Depends(deps.page_params), user: User = Depends(deps.get_current_user),
                db: Session = Depends(get_db)):
    from app.models.project import ProjectMember

    if user.role == "admin":
        q = db.query(ActivityItem)
    else:
        pids = [r[0] for r in db.query(ProjectMember.project_id).filter(ProjectMember.user_id == user.id).all()]
        q = db.query(ActivityItem).filter(ActivityItem.project_id.in_(pids or ["__none__"]))
    total = q.count()
    rows = q.order_by(ActivityItem.created_at.desc()).offset(pp["offset"]).limit(pp["limit"]).all()
    return deps.envelope([S.activity_item_out(a) for a in rows], total, pp["page"], pp["limit"])
