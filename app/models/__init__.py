"""Import all models so Base.metadata is complete (alembic + create_all)."""
from app.models.user import User, RefreshToken, EmailToken  # noqa: F401
from app.models.project import Project, ProjectMember  # noqa: F401
from app.models.drawing import Drawing, DrawingAnalysis  # noqa: F401
from app.models.model3d import Model, Floor, ModelElement, ModelConflict, ViewState, Measurement, SectionPlane  # noqa: F401
from app.models.takeoff import TakeoffItem, TakeoffLink, TakeoffTemplate, Formula  # noqa: F401
from app.models.boq import WorkPackage, BoqItem, BoqLink, RateAnalysis, RateComponent, BoqVersion  # noqa: F401
from app.models.cost import CostBreakdown, CostVariance, Forecast  # noqa: F401
from app.models.schedule import Activity, Dependency, Constraint, Resource, Calendar, Baseline  # noqa: F401
from app.models.coordination import Conflict, ConflictElement, ConflictComment, ConflictAttachment, ClashRun  # noqa: F401
from app.models.revision import Revision, RevisionChange, VisualEvidence, EvidenceAnnotation  # noqa: F401
from app.models.risk import Risk, Mitigation, RiskTrigger, RelatedEntity  # noqa: F401
from app.models.simulation import Simulation  # noqa: F401
from app.models.report import Report, Document  # noqa: F401
from app.models.collab import ActivityItem, Notification, NotificationPrefs  # noqa: F401
from app.models.copilot import Conversation, Message, CopilotToolRating  # noqa: F401
