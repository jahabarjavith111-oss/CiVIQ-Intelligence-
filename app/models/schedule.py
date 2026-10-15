from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _now():
    return datetime.utcnow()


class Activity(Base):
    __tablename__ = "schedule_activities"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(36), index=True)
    wbs_code: Mapped[str] = mapped_column(String(64), default="")
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    type: Mapped[str] = mapped_column(String(32), default="task")
    status: Mapped[str] = mapped_column(String(32), default="not-started", index=True)
    progress: Mapped[float] = mapped_column(Float, default=0.0)
    start_date: Mapped[str] = mapped_column(String(32))
    end_date: Mapped[str] = mapped_column(String(32))
    early_start: Mapped[str] = mapped_column(String(32), default="")
    early_finish: Mapped[str] = mapped_column(String(32), default="")
    late_start: Mapped[str] = mapped_column(String(32), default="")
    late_finish: Mapped[str] = mapped_column(String(32), default="")
    duration: Mapped[int] = mapped_column(Integer, default=0)
    actual_start: Mapped[str | None] = mapped_column(String(32), nullable=True)
    actual_finish: Mapped[str | None] = mapped_column(String(32), nullable=True)
    remaining_duration: Mapped[int] = mapped_column(Integer, default=0)
    total_float: Mapped[float] = mapped_column(Float, default=0.0)
    free_float: Mapped[float] = mapped_column(Float, default=0.0)
    is_critical: Mapped[bool] = mapped_column(Boolean, default=False)
    calendar_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    notes: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)


class Dependency(Base):
    __tablename__ = "schedule_dependencies"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(36), index=True)
    from_activity_id: Mapped[str] = mapped_column(String(36))
    to_activity_id: Mapped[str] = mapped_column(String(36))
    type: Mapped[str] = mapped_column(String(8), default="FS")
    lag: Mapped[int] = mapped_column(Integer, default=0)


class Constraint(Base):
    __tablename__ = "schedule_constraints"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(36), index=True)
    activity_id: Mapped[str] = mapped_column(String(36), index=True)
    type: Mapped[str] = mapped_column(String(16))
    date: Mapped[str] = mapped_column(String(32))


class Resource(Base):
    __tablename__ = "schedule_resources"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    activity_id: Mapped[str] = mapped_column(String(36), index=True)
    type: Mapped[str] = mapped_column(String(32))
    name: Mapped[str] = mapped_column(String(255))
    quantity: Mapped[float] = mapped_column(Float, default=0.0)
    unit: Mapped[str] = mapped_column(String(32))
    cost_per_unit: Mapped[float] = mapped_column(Float, default=0.0)
    total_cost: Mapped[float] = mapped_column(Float, default=0.0)


class Calendar(Base):
    __tablename__ = "schedule_calendars"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    working_days: Mapped[list] = mapped_column(JSON, default=list)
    working_hours: Mapped[list] = mapped_column(JSON, default=list)
    exceptions: Mapped[list] = mapped_column(JSON, default=list)


class Baseline(Base):
    __tablename__ = "schedule_baselines"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    activities: Mapped[list] = mapped_column(JSON, default=list)
    project_start: Mapped[str] = mapped_column(String(32))
    project_finish: Mapped[str] = mapped_column(String(32))
    total_duration: Mapped[int] = mapped_column(Integer, default=0)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False)
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
