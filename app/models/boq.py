from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _now():
    return datetime.utcnow()


class WorkPackage(Base):
    __tablename__ = "work_packages"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(36), index=True)
    parent_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    code: Mapped[str] = mapped_column(String(64))
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    level: Mapped[int] = mapped_column(Integer, default=0)
    order: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(8), default="INR")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)


class BoqItem(Base):
    __tablename__ = "boq_items"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    work_package_id: Mapped[str] = mapped_column(String(36), index=True)
    code: Mapped[str] = mapped_column(String(64))
    description: Mapped[str] = mapped_column(String(1024))
    unit: Mapped[str] = mapped_column(String(32))
    quantity: Mapped[float] = mapped_column(Float, default=0.0)
    rate: Mapped[float] = mapped_column(Float, default=0.0)
    amount: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[str] = mapped_column(String(32), default="draft")
    notes: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)


class BoqLink(Base):
    """Takeoff/model links for BOQ items (kind='takeoff'|'model')."""
    __tablename__ = "boq_links"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    boq_item_id: Mapped[str] = mapped_column(String(36), index=True)
    kind: Mapped[str] = mapped_column(String(16))
    ref_id: Mapped[str] = mapped_column(String(36))


class RateAnalysis(Base):
    __tablename__ = "rate_analyses"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    boq_item_id: Mapped[str] = mapped_column(String(36), index=True)
    overhead_percent: Mapped[float] = mapped_column(Float, default=0.0)
    profit_percent: Mapped[float] = mapped_column(Float, default=0.0)
    total_rate: Mapped[float] = mapped_column(Float, default=0.0)
    currency: Mapped[str] = mapped_column(String(8), default="INR")
    version: Mapped[int] = mapped_column(Integer, default=1)
    approved_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)


class RateComponent(Base):
    __tablename__ = "rate_components"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    rate_analysis_id: Mapped[str] = mapped_column(String(36), index=True)
    bucket: Mapped[str] = mapped_column(String(32))  # materials|labour|equipment
    description: Mapped[str] = mapped_column(String(512))
    unit: Mapped[str] = mapped_column(String(32))
    quantity: Mapped[float] = mapped_column(Float, default=0.0)
    unit_rate: Mapped[float] = mapped_column(Float, default=0.0)
    amount: Mapped[float] = mapped_column(Float, default=0.0)
    source: Mapped[str] = mapped_column(String(32), default="manual")
    reference: Mapped[str | None] = mapped_column(String(255), nullable=True)


class BoqVersion(Base):
    __tablename__ = "boq_versions"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    snapshot: Mapped[dict] = mapped_column(JSON, default=dict)
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
