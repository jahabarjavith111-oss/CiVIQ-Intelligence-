from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _now():
    return datetime.utcnow()


class Model(Base):
    __tablename__ = "models"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(255))
    version: Mapped[int] = mapped_column(Integer, default=1)
    file_key: Mapped[str] = mapped_column(String(1024), default="")
    file_url: Mapped[str] = mapped_column(String(1024), default="")
    format: Mapped[str] = mapped_column(String(16), default="glb")
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    meta: Mapped[dict] = mapped_column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)


class Floor(Base):
    __tablename__ = "floors"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    model_id: Mapped[str] = mapped_column(String(36), index=True)
    name: Mapped[str] = mapped_column(String(128))
    level: Mapped[int] = mapped_column(Integer, default=0)
    elevation: Mapped[float] = mapped_column(Float, default=0.0)
    height: Mapped[float] = mapped_column(Float, default=3.0)
    visible: Mapped[bool] = mapped_column(Boolean, default=True)
    elements: Mapped[list] = mapped_column(JSON, default=list)


class ModelElement(Base):
    __tablename__ = "model_elements"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    model_id: Mapped[str] = mapped_column(String(36), index=True)
    floor_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    name: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(32), default="structure")
    type: Mapped[str] = mapped_column(String(128), default="")
    guid: Mapped[str] = mapped_column(String(64), default="")
    geometry: Mapped[dict] = mapped_column(JSON, default=dict)
    properties: Mapped[dict] = mapped_column(JSON, default=dict)
    quantity: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    cost: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    schedule: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    boq_items: Mapped[list] = mapped_column(JSON, default=list)
    visible: Mapped[bool] = mapped_column(Boolean, default=True)
    color: Mapped[str | None] = mapped_column(String(32), nullable=True)


class ModelConflict(Base):
    __tablename__ = "model_conflicts"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    model_id: Mapped[str] = mapped_column(String(36), index=True)
    type: Mapped[str] = mapped_column(String(32), default="clash")
    severity: Mapped[str] = mapped_column(String(16), default="medium")
    status: Mapped[str] = mapped_column(String(32), default="new")
    elements: Mapped[list] = mapped_column(JSON, default=list)
    description: Mapped[str] = mapped_column(String(1024), default="")
    location: Mapped[dict] = mapped_column(JSON, default=dict)
    assigned_to: Mapped[str | None] = mapped_column(String(36), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)


class ViewState(Base):
    __tablename__ = "view_states"
    model_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    state: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)


class Measurement(Base):
    __tablename__ = "measurements"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    model_id: Mapped[str] = mapped_column(String(36), index=True)
    type: Mapped[str] = mapped_column(String(32), default="distance")
    points: Mapped[list] = mapped_column(JSON, default=list)
    value: Mapped[float] = mapped_column(Float, default=0.0)
    unit: Mapped[str] = mapped_column(String(16), default="m")
    label: Mapped[str | None] = mapped_column(String(255), nullable=True)


class SectionPlane(Base):
    __tablename__ = "section_planes"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    model_id: Mapped[str] = mapped_column(String(36), index=True)
    normal: Mapped[dict] = mapped_column(JSON, default=dict)
    constant: Mapped[float] = mapped_column(Float, default=0.0)
    visible: Mapped[bool] = mapped_column(Boolean, default=True)
