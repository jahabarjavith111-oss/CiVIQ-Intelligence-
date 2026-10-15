from datetime import datetime

from app.schemas.common import CamelModel


class SimulationOut(CamelModel):
    id: str
    project_id: str
    name: str
    description: str | None = None
    inputs: dict = {}
    results: dict | None = None
    status: str
    created_by: str
    created_at: datetime


class SimulationCreate(CamelModel):
    name: str
    description: str | None = None
    inputs: dict = {}


class CompareIn(CamelModel):
    ids: list
