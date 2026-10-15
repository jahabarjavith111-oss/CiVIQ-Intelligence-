from datetime import datetime

from app.schemas.common import CamelModel


class ModelOut(CamelModel):
    id: str
    project_id: str
    name: str
    version: int
    file_url: str
    format: str
    file_size: int
    metadata: dict = {}
    floors: list = []
    elements: list = []
    conflicts: list = []
    created_at: datetime
    updated_at: datetime


class ModelUpdate(CamelModel):
    name: str | None = None
    version: int | None = None


class FloorOut(CamelModel):
    id: str
    name: str
    level: int
    elevation: float
    height: float
    model_id: str
    visible: bool
    elements: list = []


class ElementOut(CamelModel):
    id: str
    model_id: str
    floor_id: str | None = None
    name: str
    category: str
    type: str
    guid: str
    geometry: dict = {}
    properties: dict = {}
    quantity: dict | None = None
    cost: dict | None = None
    schedule: dict | None = None
    boq_items: list = []
    visible: bool = True
    color: str | None = None


class ModelConflictOut(CamelModel):
    id: str
    model_id: str
    type: str
    severity: str
    status: str
    elements: list = []
    description: str
    location: dict = {}
    assigned_to: str | None = None
    created_at: datetime
    resolved_at: datetime | None = None


class MeasurementIn(CamelModel):
    id: str | None = None
    type: str = "distance"
    points: list = []
    value: float = 0.0
    unit: str = "m"
    label: str | None = None


class MeasurementOut(MeasurementIn):
    id: str


class SectionPlaneIn(CamelModel):
    id: str | None = None
    normal: dict = {}
    constant: float = 0.0
    visible: bool = True


class SectionPlaneOut(SectionPlaneIn):
    id: str


class ClashRunIn(CamelModel):
    tolerance: float | None = None
    categories: list | None = None
