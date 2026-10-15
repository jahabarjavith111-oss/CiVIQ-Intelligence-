from datetime import datetime

from app.schemas.common import CamelModel


class ActivityOut(CamelModel):
    id: str
    project_id: str
    actor_id: str
    actor_name: str
    action: str
    entity_type: str
    entity_id: str | None = None
    entity_name: str | None = None
    details: str | None = None
    created_at: datetime


class NotificationOut(CamelModel):
    id: str
    user_id: str
    project_id: str | None = None
    type: str
    title: str
    body: str
    link: str | None = None
    read: bool
    created_at: datetime


class PrefsOut(CamelModel):
    email: bool = True
    push: bool = True
    in_app: bool = True


class PrefsUpdate(CamelModel):
    email: bool | None = None
    push: bool | None = None
    in_app: bool | None = None


class TeamMemberOut(CamelModel):
    id: str
    email: str
    name: str
    role: str
    project_role: str | None = None
    joined_at: str | None = None
    last_active: str | None = None
    created_at: datetime
    updated_at: datetime


class InviteIn(CamelModel):
    email: str
    role: str
    message: str | None = None


class ProjectRoleUpdate(CamelModel):
    role: str
