"""Activity feed + notification helpers called from mutation paths."""
from sqlalchemy.orm import Session

from app import deps
from app.models.collab import ActivityItem, Notification
from app.models.project import ProjectMember
from app.models.user import User


def log(db: Session, project_id: str, actor: User, action: str, entity_type: str,
        entity_id: str | None = None, entity_name: str | None = None) -> None:
    db.add(ActivityItem(id=deps.uid(), project_id=project_id, actor_id=actor.id,
                        actor_name=actor.name, action=action, entity_type=entity_type,
                        entity_id=entity_id, entity_name=entity_name))
    db.commit()


def notify_project(db: Session, project_id: str, type: str, title: str, body: str,
                   link: str | None = None, exclude: str | None = None) -> None:
    members = db.query(ProjectMember).filter(ProjectMember.project_id == project_id).all()
    seen = set()
    for m in members:
        if m.user_id == exclude or m.user_id in seen:
            continue
        seen.add(m.user_id)
        db.add(Notification(id=deps.uid(), user_id=m.user_id, project_id=project_id,
                            type=type, title=title, body=body, link=link))
    db.commit()
