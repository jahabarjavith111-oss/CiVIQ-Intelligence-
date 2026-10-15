from datetime import datetime

from app.schemas.common import CamelModel


class ProjectMemberOut(CamelModel):
    user_id: str
    user: dict | None = None
    role: str
    joined_at: datetime


class ProjectSettings(CamelModel):
    units: str = "metric"
    timezone: str = "Asia/Kolkata"
    language: str = "en"
    notifications: dict = {"email": True, "push": True, "inApp": True}
    integrations: dict = {}


class ProjectOut(CamelModel):
    id: str
    name: str
    description: str | None = None
    status: str
    location: dict | None = None
    start_date: str
    end_date: str | None = None
    budget: float | None = None
    currency: str
    owner_id: str
    members: list = []
    settings: dict
    created_at: datetime
    updated_at: datetime


class ProjectSummary(CamelModel):
    id: str
    name: str
    status: str
    health: dict
    progress: float
    budget: float
    spent: float
    start_date: str
    end_date: str | None = None
    member_count: int


class ProjectCreate(CamelModel):
    name: str
    description: str | None = None
    location: dict | None = None
    start_date: str
    end_date: str | None = None
    budget: float | None = None
    currency: str | None = None


class ProjectUpdate(CamelModel):
    name: str | None = None
    description: str | None = None
    location: dict | None = None
    start_date: str | None = None
    end_date: str | None = None
    budget: float | None = None
    currency: str | None = None
    status: str | None = None


class MemberAdd(CamelModel):
    user_id: str
    role: str


class MemberRoleUpdate(CamelModel):
    role: str


class DuplicateIn(CamelModel):
    name: str
