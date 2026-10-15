from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _now():
    return datetime.utcnow()


class AuditLog(Base):
    """Platform-wide security/audit trail (admin actions + auth events)."""
    __tablename__ = "audit_logs"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    actor_id: Mapped[str] = mapped_column(String(36), index=True)
    actor_name: Mapped[str] = mapped_column(String(255))
    actor_role: Mapped[str] = mapped_column(String(32), default="")
    action: Mapped[str] = mapped_column(String(128), index=True)
    entity_type: Mapped[str] = mapped_column(String(64), default="")
    entity_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now, index=True)


class PlatformSetting(Base):
    """DB-backed platform settings (override env defaults at runtime)."""
    __tablename__ = "platform_settings"
    key: Mapped[str] = mapped_column(String(128), primary_key=True)
    value: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    updated_by: Mapped[str | None] = mapped_column(String(36), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)


DEFAULT_SETTINGS: dict[str, dict] = {
    "upload.max_mb": {"value": 100},
    "ai.provider": {"value": "local"},
    "ai.model": {"value": "keyword-responder"},
    "ai.base_url": {"value": ""},
    "ai.api_key": {"value": ""},
    "announcement": {"value": ""},
}
