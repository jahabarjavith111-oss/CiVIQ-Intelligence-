from datetime import datetime

from app.schemas.common import CamelModel


class TakeoffOut(CamelModel):
    id: str
    project_id: str
    trade: str
    category: str
    code: str
    description: str
    unit: str
    quantity: float
    formula: str | None = None
    drawing_references: list = []
    model_references: list = []
    notes: str | None = None
    status: str
    created_by: str
    created_at: datetime
    updated_at: datetime


class TakeoffCreate(CamelModel):
    trade: str
    category: str = "General"
    code: str
    description: str
    unit: str
    quantity: float = 0.0
    formula: str | None = None
    drawing_references: list = []
    model_references: list = []
    notes: str | None = None
    status: str = "draft"


class TakeoffUpdate(CamelModel):
    trade: str | None = None
    category: str | None = None
    code: str | None = None
    description: str | None = None
    unit: str | None = None
    quantity: float | None = None
    formula: str | None = None
    notes: str | None = None
    status: str | None = None


class BulkItem(CamelModel):
    id: str
    data: dict


class TemplateCreate(CamelModel):
    name: str
    trade: str
    items: list = []


class TemplateOut(CamelModel):
    id: str
    name: str
    trade: str
    items: list = []


class DrawingLinkIn(CamelModel):
    drawing_id: str
    bbox: dict | None = None


class ModelLinkIn(CamelModel):
    model_element_id: str


class FormulaIn(CamelModel):
    formula: str


class ExportOptions(CamelModel):
    format: str
    include_formulas: bool = True
    include_references: bool = True
    group_by_trade: bool = True
