from datetime import datetime

from app.schemas.common import CamelModel


class BreakdownOut(CamelModel):
    id: str
    project_id: str
    category: str
    sub_category: str
    budgeted: float
    actual: float
    committed: float
    forecast: float
    variance: float
    variance_percent: float
    currency: str
    period: str
    details: list = []
    updated_at: datetime


class VarianceOut(CamelModel):
    id: str
    project_id: str
    category: str
    period: str
    budgeted: float
    actual: float
    variance: float
    variance_percent: float
    explanation: str | None = None
    impact: str
    status: str
    created_at: datetime
    resolved_at: datetime | None = None


class VarianceCreate(CamelModel):
    category: str
    period: str
    budgeted: float = 0.0
    actual: float = 0.0
    variance: float = 0.0
    variance_percent: float = 0.0
    explanation: str | None = None
    impact: str = "medium"
    status: str = "open"


class ResolveIn(CamelModel):
    explanation: str


class ForecastOut(CamelModel):
    id: str
    project_id: str
    name: str
    description: str | None = None
    assumptions: list = []
    results: dict | None = None
    is_baseline: bool = False
    created_by: str
    created_at: datetime


class ForecastCreate(CamelModel):
    name: str
    description: str | None = None
    assumptions: list = []
    is_baseline: bool = False


class AssumptionsIn(CamelModel):
    assumptions: list


class CategoryOut(CamelModel):
    category: str
    label: str
    color: str
