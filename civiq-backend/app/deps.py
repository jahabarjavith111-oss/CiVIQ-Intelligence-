"""Shared FastAPI dependencies: auth guard, RBAC, pagination, CRUD helpers."""
import uuid
from typing import Optional

import jwt
from fastapi import Depends, HTTPException, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app import security
from app.db import get_db
from app.models.user import User

bearer = HTTPBearer(auto_error=False)

# Mirrors frontend ROLE_PERMISSIONS (src/types/auth.ts)
ROLE_PERMISSIONS: dict[str, list[str]] = {
    "admin": ["*"],
    "project-manager": ["projects:*", "drawings:*", "model-3d:*", "copilot:*", "takeoff:*", "boq:*", "cost:*", "schedule:*", "coordination:*", "revisions:*", "risks:*", "simulation:*", "analytics:*", "documents:*", "reports:*", "team:*"],
    "engineer": ["projects:read", "drawings:*", "model-3d:*", "copilot:*", "takeoff:*", "boq:read", "cost:read", "schedule:read", "coordination:*", "revisions:read", "risks:read", "simulation:read", "analytics:read", "documents:*", "reports:read"],
    "viewer": ["projects:read", "drawings:read", "model-3d:read", "copilot:read", "takeoff:read", "boq:read", "cost:read", "schedule:read", "coordination:read", "revisions:read", "risks:read", "simulation:read", "analytics:read", "documents:read", "reports:read"],
}


def uid() -> str:
    return str(uuid.uuid4())


def utcnow_iso() -> str:
    from datetime import datetime, timezone
    return datetime.now(timezone.utc).isoformat()


def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if not creds or not creds.credentials:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    try:
        payload = security.decode_access_token(creds.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.get(User, payload.get("sub"))
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_perm(perm: str):
    """Dependency factory: 403 unless the user's role grants `resource:action`."""
    resource, _, action = perm.partition(":")

    def check(user: User = Depends(get_current_user)) -> User:
        granted = ROLE_PERMISSIONS.get(user.role, [])
        if "*" in granted or perm in granted or f"{resource}:*" in granted:
            return user
        raise HTTPException(status_code=403, detail="Forbidden")

    return check


def page_params(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
) -> dict:
    return {"page": page, "limit": limit, "offset": (page - 1) * limit}


def envelope(items: list, total: int, page: int, limit: int) -> dict:
    return {"data": items, "total": total, "page": page, "limit": limit}


def get_or_404(db: Session, model, obj_id: str, name: str = "Object"):
    obj = db.get(model, obj_id)
    if not obj:
        raise HTTPException(status_code=404, detail=f"{name} not found")
    return obj


def require_project_member(db: Session, project_id: str, user: User, roles: Optional[list[str]] = None):
    """Ensure the user belongs to the project (optionally with a project role)."""
    from app.models.project import Project, ProjectMember

    project = db.get(Project, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role == "admin":
        return project
    membership = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project_id, ProjectMember.user_id == user.id)
        .first()
    )
    if not membership and project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Not a project member")
    if roles and membership and membership.role not in roles and project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Insufficient project role")
    return project
