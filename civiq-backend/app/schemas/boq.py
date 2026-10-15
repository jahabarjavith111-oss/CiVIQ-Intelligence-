from datetime import datetime

from app.schemas.common import CamelModel


class WorkPackageOut(CamelModel):
    id: str
    project_id: str
    parent_id: str | None = None
    code: str
    name: str
    description: str | None = None
    level: int
    order: int
    children: list = []
    items: list = []
    total_amount: float
    currency: str
    created_at: datetime
    updated_at: datetime


class WorkPackageCreate(CamelModel):
    project_id: str | None = None
    parent_id: str | None = None
    code: str
    name: str
    description: str | None = None


class WorkPackageUpdate(CamelModel):
    code: str | None = None
    name: str | None = None
    description: str | None = None
    parent_id: str | None = None
    level: int | None = None
    order: int | None = None


class ReorderIn(CamelModel):
    package_ids: list


class BoqItemOut(CamelModel):
    id: str
    work_package_id: str
    code: str
    description: str
    unit: str
    quantity: float
    rate: float
    amount: float
    rate_analysis: dict | None = None
    takeoff_references: list = []
    model_references: list = []
    status: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


class BoqItemCreate(CamelModel):
    work_package_id: str | None = None
    code: str
    description: str
    unit: str
    quantity: float = 0.0
    rate: float = 0.0


class BoqItemUpdate(CamelModel):
    code: str | None = None
    description: str | None = None
    unit: str | None = None
    quantity: float | None = None
    rate: float | None = None
    status: str | None = None
    notes: str | None = None


class RateAnalysisOut(CamelModel):
    id: str
    boq_item_id: str
    materials: list = []
    labour: list = []
    equipment: list = []
    overhead_percent: float = 0.0
    profit_percent: float = 0.0
    total_rate: float = 0.0
    currency: str = "INR"
    version: int = 1
    approved_by: str | None = None
    approved_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class RateAnalysisCreate(CamelModel):
    materials: list = []
    labour: list = []
    equipment: list = []
    overhead_percent: float = 0.0
    profit_percent: float = 0.0
    total_rate: float = 0.0
    currency: str = "INR"


class RateComponentIn(CamelModel):
    description: str
    unit: str
    quantity: float = 0.0
    unit_rate: float = 0.0
    amount: float = 0.0
    source: str = "manual"
    reference: str | None = None


class VersionCreate(CamelModel):
    name: str


class LinkIn(CamelModel):
    takeoff_item_id: str | None = None
    model_element_id: str | None = None
