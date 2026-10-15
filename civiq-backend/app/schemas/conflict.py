from datetime import datetime

from app.schemas.common import CamelModel


class ConflictOut(CamelModel):
    id: str
    project_id: str
    drawing_ids: list = []
    model_id: str | None = None
    type: str
    severity: str
    status: str
    title: str
    description: str = ""
    location: dict | None = None
    elements: list = []
    assigned_to: str | None = None
    reported_by: str
    reported_at: datetime
    reviewed_at: datetime | None = None
    resolved_at: datetime | None = None
    resolution: str | None = None
    attachments: list = []
    comments: list = []


class ConflictCreate(CamelModel):
    drawing_ids: list = []
    model_id: str | None = None
    type: str
    severity: str = "medium"
    status: str = "new"
    title: str
    description: str = ""
    location: dict | None = None
    elements: list = []
    assigned_to: str | None = None


class AssignIn(CamelModel):
    user_id: str


class StatusIn(CamelModel):
    status: str
    resolution: str | None = None


class CommentIn(CamelModel):
    content: str


class CommentOut(CamelModel):
    id: str
    conflict_id: str
    author_id: str
    author_name: str
    content: str
    created_at: datetime


class AttachmentOut(CamelModel):
    id: str
    conflict_id: str
    file_name: str
    file_url: str
    type: str
    uploaded_by: str
    uploaded_at: datetime


class ClashRunIn(CamelModel):
    model_id: str
    tolerance: float | None = None
    categories: list | None = None
