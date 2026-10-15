from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _now():
    return datetime.utcnow()


class CostBreakdown(Base):
    __tablename__ = "cost_breakdowns"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(36), index=True)
    category: Mapped[str] = mapped_column(String(32), index=True)
    sub_category: Mapped[str] = mapped_column(String(255), default="")
    budgeted: Mapped[float] = mapped_column(Float, default=0.0)
    actual: Mapped[float] = mapped_column(Float, default=0.0)
    committed: Mapped[float] = mapped_column(Float, default=0.0)
    forecast: Mapped[float] = mapped_column(Float, default=0.0)
    variance: Mapped[float] = mapped_column(Float, default=0.0)
    variance_percent: Mapped[float] = mapped_column(Float, default=0.0)
    currency: Mapped[str] = mapped_column(String(8), default="INR")
    period: Mapped[str] = mapped_column(String(16), default="")
    details: Mapped[list] = mapped_column(JSON, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)


class CostVariance(Base):
    __tablename__ = "cost_variances"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(36), index=True)
    category: Mapped[str] = mapped_column(String(32))
    period: Mapped[str] = mapped_column(String(16))
    budgeted: Mapped[float] = mapped_column(Float, default=0.0)
    actual: Mapped[float] = mapped_column(Float, default=0.0)
    variance: Mapped[float] = mapped_column(Float, default=0.0)
    variance_percent: Mapped[float] = mapped_column(Float, default=0.0)
    explanation: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    impact: Mapped[str] = mapped_column(String(16), default="medium")
    status: Mapped[str] = mapped_column(String(32), default="open")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class Forecast(Base):
    __tablename__ = "forecasts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    assumptions: Mapped[list] = mapped_column(JSON, default=list)
    results: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    is_baseline: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
