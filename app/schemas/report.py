from datetime import datetime

from app.schemas.common import CamelModel


class ReportOut(CamelModel):
    id: str
    project_id: str
    name: str
    type: str
    status: str
    file_url: str | None = None
    config: dict = {}
    created_by: str
    created_at: datetime


class ReportCreate(CamelModel):
    name: str
    type: str
    config: dict | None = None


class DocumentOut(CamelModel):
    id: str
    project_id: str
    name: str
    type: str
    file_url: str
    file_size: int
    version: int
    folder: str | None = None
    uploaded_by: str
    created_at: datetime
