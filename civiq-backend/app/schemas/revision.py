from datetime import datetime

from app.schemas.common import CamelModel


class RevisionOut(CamelModel):
    id: str
    project_id: str
    from_version: int
    to_version: int
    title: str
    description: str | None = None
    type: str
    status: str
    changes: list = []
    impacts: dict = {}
    submitted_by: str
    submitted_at: datetime
    reviewed_by: str | None = None
    reviewed_at: datetime | None = None
    approved_by: str | None = None
    approved_at: datetime | None = None
    implemented_at: datetime | None = None


class RevisionCreate(CamelModel):
    from_version: int
    to_version: int
    title: str
    description: str | None = None
    type: str
    status: str = "draft"
    changes: list = []


class ReviewIn(CamelModel):
    status: str
    comments: str | None = None


class ChangeIn(CamelModel):
    entity_type: str
    entity_id: str
    action: str
    field: str | None = None
    old_value: dict | str | None = None
    new_value: dict | str | None = None
    description: str = ""


class EvidenceIn(CamelModel):
    type: str
    before_url: str | None = None
    after_url: str | None = None
    overlay_url: str | None = None
    annotations: list = []


class AnnotationIn(CamelModel):
    type: str
    coordinates: list = []
    label: str = ""
    color: str = "#dc2626"
