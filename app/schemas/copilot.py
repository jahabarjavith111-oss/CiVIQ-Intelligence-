from datetime import datetime

from app.schemas.common import CamelModel


class ConversationOut(CamelModel):
    id: str
    project_id: str | None = None
    title: str
    messages: list = []
    context: dict = {}
    created_at: datetime
    updated_at: datetime


class ConversationCreate(CamelModel):
    project_id: str | None = None
    title: str | None = None


class MessageIn(CamelModel):
    content: str
    context: dict | None = None


class MessageOut(CamelModel):
    id: str
    conversation_id: str
    role: str
    content: str
    intent: str | None = None
    tool_calls: list = []
    evidence: list = []
    verification: str = "verified"
    created_at: datetime


class IntentIn(CamelModel):
    message: str
    context: dict | None = None


class ContextUpdate(CamelModel):
    context: dict


class RatingIn(CamelModel):
    rating: str
    feedback: str | None = None


class ToolDefOut(CamelModel):
    name: str
    description: str
    parameters: dict = {}
