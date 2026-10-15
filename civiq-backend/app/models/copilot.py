from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


def _now():
    return datetime.utcnow()


class Conversation(Base):
    __tablename__ = "copilot_conversations"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    project_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    title: Mapped[str] = mapped_column(String(255), default="New conversation")
    context: Mapped[dict] = mapped_column(JSON, default=dict)
    created_by: Mapped[str] = mapped_column(String(36))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=_now, onupdate=_now)


class Message(Base):
    __tablename__ = "copilot_messages"
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    conversation_id: Mapped[str] = mapped_column(String(36), index=True)
    role: Mapped[str] = mapped_column(String(16))
    content: Mapped[str] = mapped_column(String(16384))
    intent: Mapped[str | None] = mapped_column(String(64), nullable=True)
    tool_calls: Mapped[list] = mapped_column(JSON, default=list)
    evidence: Mapped[list] = mapped_column(JSON, default=list)
    verification: Mapped[str] = mapped_column(String(32), default="verified")
    rating: Mapped[str | None] = mapped_column(String(16), nullable=True)
    feedback: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


class CopilotToolRating(Base):
    __tablename__ = "copilot_tool_defs"
    name: Mapped[str] = mapped_column(String(128), primary_key=True)
    description: Mapped[str] = mapped_column(String(1024))
    parameters: Mapped[dict] = mapped_column(JSON, default=dict)
