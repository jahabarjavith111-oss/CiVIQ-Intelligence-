"""Platform audit trail helpers (admin actions + auth events)."""
from sqlalchemy.orm import Session

from app import deps
from app.models.admin import AuditLog
from app.models.user import User


def audit(db: Session, actor: User, action: str, entity_type: str = "",
          entity_id: str | None = None, meta: dict | None = None) -> None:
    db.add(AuditLog(id=deps.uid(), actor_id=actor.id, actor_name=actor.name,
                    actor_role=actor.role, action=action, entity_type=entity_type,
                    entity_id=entity_id, meta=meta or {}))
    db.commit()
