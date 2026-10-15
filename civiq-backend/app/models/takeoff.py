from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _now():
    return datetime.utcnow()


class TakeoffItem(Base):
    __tablename__ = "takeoff_items"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(36), index=True)
    trade: Mapped[str] = mapped_column(String(32), index=True)
    category: Mapped[str] = mapped_column(String(128), default="")
    code: Mapped[str] = mapped_column(String(64))
    description: Mapped[str] = mapped_column(String(1024))
    unit: Mapped[str] = mapped_column(String(32))
    quantity: Mapped[float] = mapped_column(Float, default=0.0)
    formula: Mapped[str | None] = mapped_column(String(512), nullable=True)
    drawing_refs: Mapped[list] = mapped_column(JSON, default=list)
    model_refs: Mapped[list] = mapped_column(JSON, default=list)
    notes: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="draft")
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)


class TakeoffLink(Base):
    """Drawing/model links for takeoff items (kind='drawing'|'model')."""
    __tablename__ = "takeoff_links"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    takeoff_id: Mapped[str] = mapped_column(String(36), index=True)
    kind: Mapped[str] = mapped_column(String(16))
    ref_id: Mapped[str] = mapped_column(String(36))
    extra: Mapped[dict] = mapped_column(JSON, default=dict)


class TakeoffTemplate(Base):
    __tablename__ = "takeoff_templates"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))
    trade: Mapped[str] = mapped_column(String(32))
    items: Mapped[list] = mapped_column(JSON, default=list)


class Formula(Base):
    __tablename__ = "formulas"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    trade: Mapped[str] = mapped_column(String(32), index=True)
    item_code: Mapped[str] = mapped_column(String(64))
    formula: Mapped[str] = mapped_column(String(512))
