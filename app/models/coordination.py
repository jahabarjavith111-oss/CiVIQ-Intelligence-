from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _now():
    return datetime.utcnow()


class Conflict(Base):
    __tablename__ = "conflicts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(36), index=True)
    drawing_ids: Mapped[list] = mapped_column(JSON, default=list)
    model_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    type: Mapped[str] = mapped_column(String(64))
    severity: Mapped[str] = mapped_column(String(16), index=True)
    status: Mapped[str] = mapped_column(String(32), default="new", index=True)
    title: Mapped[str] = mapped_column(String(512))
    description: Mapped[str] = mapped_column(String(2048), default="")
    location: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    assigned_to: Mapped[str | None] = mapped_column(String(36), nullable=True)
    reported_by: Mapped[str] = mapped_column(String(36))
    reported_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    resolution: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)


class ConflictElement(Base):
    __tablename__ = "conflict_elements"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    conflict_id: Mapped[str] = mapped_column(String(36), index=True)
    element_id: Mapped[str] = mapped_column(String(64))
    element_type: Mapped[str] = mapped_column(String(16))
    description: Mapped[str] = mapped_column(String(1024), default="")
    bbox: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    model_coordinates: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class ConflictComment(Base):
    __tablename__ = "conflict_comments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    conflict_id: Mapped[str] = mapped_column(String(36), index=True)
    author_id: Mapped[str] = mapped_column(String(36))
    author_name: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(String(4096))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class ConflictAttachment(Base):
    __tablename__ = "conflict_attachments"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    conflict_id: Mapped[str] = mapped_column(String(36), index=True)
    file_name: Mapped[str] = mapped_column(String(255))
    file_key: Mapped[str] = mapped_column(String(1024))
    file_url: Mapped[str] = mapped_column(String(1024), default="")
    type: Mapped[str] = mapped_column(String(16))
    uploaded_by: Mapped[str] = mapped_column(String(36))
    uploaded_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class ClashRun(Base):
    __tablename__ = "clash_runs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(36), index=True)
    model_id: Mapped[str] = mapped_column(String(36))
    run_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    conflicts: Mapped[list] = mapped_column(JSON, default=list)
    statistics: Mapped[dict] = mapped_column(JSON, default=dict)
