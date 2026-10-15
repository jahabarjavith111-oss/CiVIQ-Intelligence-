from datetime import datetime

from app.schemas.common import CamelModel


class DrawingOut(CamelModel):
    id: str
    project_id: str
    name: str
    original_name: str
    type: str
    discipline: str
    version: int
    status: str
    file_url: str
    thumbnail_url: str | None = None
    file_size: int
    pages: int
    metadata: dict | None = None
    analysis: dict | None = None
    uploaded_by: str
    created_at: datetime
    updated_at: datetime


class DrawingUpdate(CamelModel):
    name: str | None = None
    type: str | None = None
    discipline: str | None = None
    status: str | None = None


class AnalyzeOptions(CamelModel):
    detect_elements: bool = True
    run_ocr: bool = True
    classify_drawing: bool = True


class AnalyzeIn(CamelModel):
    options: AnalyzeOptions | None = None


class AnalysisOut(CamelModel):
    id: str
    drawing_id: str
    status: str
    elements: list = []
    ocr_text: list = []
    confidence: float = 0.0
    processed_at: datetime | None = None
    error: str | None = None
