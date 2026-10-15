from datetime import datetime

from app.schemas.common import CamelModel


class ActivityOut(CamelModel):
    id: str
    project_id: str
    wbs_code: str
    name: str
    description: str | None = None
    type: str
    status: str
    progress: float
    start_date: str
    end_date: str
    early_start: str
    early_finish: str
    late_start: str
    late_finish: str
    duration: int
    actual_start: str | None = None
    actual_finish: str | None = None
    remaining_duration: int
    total_float: float
    free_float: float
    is_critical: bool
    calendar_id: str | None = None
    resources: list = []
    predecessors: list = []
    successors: list = []
    constraints: list = []
    notes: str | None = None
    created_at: datetime
    updated_at: datetime


class ActivityCreate(CamelModel):
    wbs_code: str = ""
    name: str
    description: str | None = None
    type: str = "task"
    status: str = "not-started"
    progress: float = 0.0
    start_date: str
    end_date: str
    duration: int = 0
    calendar_id: str | None = None
    notes: str | None = None


class DependencyIn(CamelModel):
    from_activity_id: str
    to_activity_id: str
    type: str = "FS"
    lag: int = 0


class ConstraintIn(CamelModel):
    activity_id: str | None = None
    type: str
    date: str


class ResourceIn(CamelModel):
    type: str
    name: str
    quantity: float = 0.0
    unit: str = ""
    cost_per_unit: float = 0.0
    total_cost: float = 0.0


class CalendarIn(CamelModel):
    name: str
    is_default: bool = False
    working_days: list = [1, 2, 3, 4, 5]
    working_hours: list = []


class ExceptionIn(CamelModel):
    date: str
    type: str
    name: str
    working_hours: list | None = None


class BaselineIn(CamelModel):
    name: str
    description: str | None = None
