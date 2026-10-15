from datetime import datetime

from app.schemas.common import CamelModel


class RiskOut(CamelModel):
    id: str
    project_id: str
    code: str
    title: str
    description: str = ""
    category: str
    probability: int
    impact: int
    score: int
    rating: str
    status: str
    owner_id: str
    owner_name: str
    identified_by: str
    identified_at: datetime
    assessed_at: datetime | None = None
    mitigations: list = []
    triggers: list = []
    related_entities: list = []
    monte_carlo: dict | None = None
    created_at: datetime
    updated_at: datetime


class RiskCreate(CamelModel):
    code: str = ""
    title: str
    description: str = ""
    category: str
    probability: int
    impact: int
    status: str = "identified"
    owner_id: str = ""
    owner_name: str = ""


class AssessIn(CamelModel):
    probability: int
    impact: int
    assessed_by: str


class MitigationIn(CamelModel):
    title: str
    description: str = ""
    type: str = "mitigate"
    status: str = "planned"
    effectiveness: int = 3
    cost: float = 0.0
    cost_currency: str = "INR"
    responsible_id: str = ""
    responsible_name: str = ""
    due_date: str = ""


class CompleteMitigationIn(CamelModel):
    residual_score: int | None = None


class TriggerIn(CamelModel):
    description: str
    indicator: str = ""
    threshold: str = ""


class RelatedEntityIn(CamelModel):
    type: str
    entity_id: str
    entity_name: str = ""
    relationship: str = "cause"


class MonteCarloIn(CamelModel):
    runs: int | None = None
    seed: int | None = None
