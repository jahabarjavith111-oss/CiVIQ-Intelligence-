from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _now():
    return datetime.utcnow()


class Revision(Base):
    __tablename__ = "revisions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(36), index=True)
    from_version: Mapped[int] = mapped_column(Integer)
    to_version: Mapped[int] = mapped_column(Integer)
    title: Mapped[str] = mapped_column(String(512))
    description: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    type: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), default="draft", index=True)
    impacts: Mapped[dict] = mapped_column(JSON, default=dict)
    submitted_by: Mapped[str] = mapped_column(String(36))
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    reviewed_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    approved_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    implemented_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class RevisionChange(Base):
    __tablename__ = "revision_changes"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    revision_id: Mapped[str] = mapped_column(String(36), index=True)
    entity_type: Mapped[str] = mapped_column(String(32))
    entity_id: Mapped[str] = mapped_column(String(64))
    action: Mapped[str] = mapped_column(String(16))
    field: Mapped[str | None] = mapped_column(String(128), nullable=True)
    old_value: Mapped[dict | str | None] = mapped_column(JSON, nullable=True)
    new_value: Mapped[dict | str | None] = mapped_column(JSON, nullable=True)
    description: Mapped[str] = mapped_column(String(1024), default="")


class VisualEvidence(Base):
    __tablename__ = "visual_evidence"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    change_id: Mapped[str] = mapped_column(String(36), index=True)
    type: Mapped[str] = mapped_column(String(32))
    before_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    after_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    overlay_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)


class EvidenceAnnotation(Base):
    __tablename__ = "evidence_annotations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    evidence_id: Mapped[str] = mapped_column(String(36), index=True)
    type: Mapped[str] = mapped_column(String(32))
    coordinates: Mapped[list] = mapped_column(JSON, default=list)
    label: Mapped[str] = mapped_column(String(255), default="")
    color: Mapped[str] = mapped_column(String(32), default="#dc2626")
