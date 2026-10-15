from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _now():
    return datetime.utcnow()


class Risk(Base):
    __tablename__ = "risks"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(36), index=True)
    code: Mapped[str] = mapped_column(String(32))
    title: Mapped[str] = mapped_column(String(512))
    description: Mapped[str] = mapped_column(String(2048), default="")
    category: Mapped[str] = mapped_column(String(32), index=True)
    probability: Mapped[int] = mapped_column(Integer)
    impact: Mapped[int] = mapped_column(Integer)
    score: Mapped[int] = mapped_column(Integer)
    rating: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32), default="identified", index=True)
    owner_id: Mapped[str] = mapped_column(String(36))
    owner_name: Mapped[str] = mapped_column(String(255))
    identified_by: Mapped[str] = mapped_column(String(36))
    identified_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    assessed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    monte_carlo: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)


class Mitigation(Base):
    __tablename__ = "mitigations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    risk_id: Mapped[str] = mapped_column(String(36), index=True)
    title: Mapped[str] = mapped_column(String(512))
    description: Mapped[str] = mapped_column(String(2048), default="")
    type: Mapped[str] = mapped_column(String(32), default="mitigate")
    status: Mapped[str] = mapped_column(String(32), default="planned")
    effectiveness: Mapped[int] = mapped_column(Integer, default=3)
    cost: Mapped[float] = mapped_column(Float, default=0.0)
    cost_currency: Mapped[str] = mapped_column(String(8), default="INR")
    responsible_id: Mapped[str] = mapped_column(String(36))
    responsible_name: Mapped[str] = mapped_column(String(255))
    due_date: Mapped[str] = mapped_column(String(32))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    residual_score: Mapped[int | None] = mapped_column(Integer, nullable=True)


class RiskTrigger(Base):
    __tablename__ = "risk_triggers"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    risk_id: Mapped[str] = mapped_column(String(36), index=True)
    description: Mapped[str] = mapped_column(String(1024))
    indicator: Mapped[str] = mapped_column(String(512))
    threshold: Mapped[str] = mapped_column(String(512))
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    detected_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class RelatedEntity(Base):
    __tablename__ = "risk_related_entities"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    risk_id: Mapped[str] = mapped_column(String(36), index=True)
    type: Mapped[str] = mapped_column(String(32))
    entity_id: Mapped[str] = mapped_column(String(64))
    entity_name: Mapped[str] = mapped_column(String(512), default="")
    relationship: Mapped[str] = mapped_column(String(32))
