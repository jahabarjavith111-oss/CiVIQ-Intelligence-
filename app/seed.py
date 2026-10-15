"""Seed demo workspace mirroring the frontend MSW fixtures.

Run:  python -m app.seed
Login: demo@civiq.ai / demo1234
"""
from datetime import datetime, timedelta

from app import models  # noqa: F401
from app import security
from app.db import Base, get_engine, get_session_local
from app.deps import uid
from app.models.boq import BoqItem, WorkPackage
from app.models.collab import ActivityItem, Notification
from app.models.coordination import Conflict
from app.models.cost import CostBreakdown
from app.models.drawing import Drawing, DrawingAnalysis
from app.models.model3d import Model
from app.models.project import Project, ProjectMember
from app.models.revision import Revision
from app.models.risk import Risk
from app.models.schedule import Activity
from app.models.takeoff import TakeoffItem
from app.models.user import User

PID = "proj-greenview-01"


def seed():
    engine = get_engine()
    Base.metadata.create_all(bind=engine)
    Session = get_session_local()
    db = Session()
    try:
        if db.query(User).filter(User.email == "demo@civiq.ai").first():
            print("seed: demo user already exists, skipping")
            return
        now = datetime.utcnow()
        demo = User(id="u-1", email="demo@civiq.ai", name="Demo Engineer",
                    password_hash=security.hash_password("demo1234"),
                    role="project-manager", email_verified=True)
        ananya = User(id="u-2", email="ananya@acme.com", name="Ananya Rao",
                      password_hash=security.hash_password("demo1234"), role="engineer")
        ravi = User(id="u-3", email="ravi@acme.com", name="Ravi Kumar",
                    password_hash=security.hash_password("demo1234"), role="engineer")
        db.add_all([demo, ananya, ravi])

        proj = Project(id=PID, name="Greenview Residency — Tower B",
                       description="G+10 residential tower, 120 units", status="active",
                       start_date="2026-01-15", end_date="2027-06-30", budget=45000000,
                       currency="INR", owner_id="u-1",
                       settings={"units": "metric", "timezone": "Asia/Kolkata", "language": "en",
                                 "notifications": {"email": True, "push": True, "inApp": True},
                                 "integrations": {}})
        db.add(proj)
        for uid_, role in (("u-1", "owner"), ("u-2", "manager"), ("u-3", "engineer")):
            db.add(ProjectMember(id=uid(), project_id=PID, user_id=uid_, role=role))

        db.add_all([
            Drawing(id="dwg-a101", project_id=PID, name="A-101 Ground Floor Plan", original_name="A-101.pdf",
                    type="architectural", discipline="Arch", version=2, status="analyzed",
                    file_url="/drawings/A-101.pdf", file_size=2400000, pages=1, uploaded_by="u-1"),
            Drawing(id="dwg-s201", project_id=PID, name="S-201 Framing L3", original_name="S-201.pdf",
                    type="structural", discipline="Struct", version=1, status="analyzed",
                    file_url="/drawings/S-201.pdf", file_size=1800000, pages=1, uploaded_by="u-1"),
        ])
        db.add(Model(id="mdl-1", project_id=PID, name="Tower B — Federated", version=3,
                     file_url="/models/sample.glb", format="glb", file_size=42000000,
                     meta={"units": "metric", "boundingBox": {"min": {"x": 0, "y": 0, "z": 0},
                                                              "max": {"x": 30, "y": 36, "z": 20}}}))
        elements = [
            {"id": "el-1", "type": "wall", "category": "architecture",
             "bbox": {"x": 120, "y": 80, "width": 640, "height": 24, "page": 1}, "confidence": 0.97,
             "properties": {"material": "AAC block 200mm"},
             "evidenceRegion": {"page": 1, "bbox": {"x": 120, "y": 80, "width": 640, "height": 24, "page": 1}, "imageUrl": ""}},
            {"id": "el-2", "type": "column", "category": "structure",
             "bbox": {"x": 200, "y": 200, "width": 48, "height": 48, "page": 1}, "confidence": 0.95,
             "properties": {"size": "400x400", "grade": "M30"},
             "evidenceRegion": {"page": 1, "bbox": {"x": 200, "y": 200, "width": 48, "height": 48, "page": 1}, "imageUrl": ""}},
            {"id": "el-3", "type": "door", "category": "architecture",
             "bbox": {"x": 420, "y": 300, "width": 90, "height": 12, "page": 1}, "confidence": 0.91,
             "properties": {"leaf": "Flush door 900mm"},
             "evidenceRegion": {"page": 1, "bbox": {"x": 420, "y": 300, "width": 90, "height": 12, "page": 1}, "imageUrl": ""}},
        ]
        ocr = [
            {"text": "GROUND FLOOR PLAN", "bbox": {"x": 60, "y": 40, "width": 300, "height": 28, "page": 1}, "confidence": 0.99, "type": "title"},
            {"text": "GRID C-4", "bbox": {"x": 520, "y": 60, "width": 90, "height": 18, "page": 1}, "confidence": 0.72, "type": "note"},
        ]
        for dwg in ("dwg-a101", "dwg-s201"):
            db.add(DrawingAnalysis(id=f"an-{dwg}", drawing_id=dwg, status="completed",
                                   elements=elements, ocr_text=ocr, confidence=0.94,
                                   processed_at=now))
        db.add_all([
            TakeoffItem(id="tk-1", project_id=PID, trade="concrete", category="Footings", code="C-01",
                        description="M25 footing concrete", unit="m3", quantity=320, status="reviewed", created_by="u-1"),
            TakeoffItem(id="tk-2", project_id=PID, trade="steel", category="Columns", code="S-04",
                        description="Fe550 rebar columns L2-L5", unit="t", quantity=86.4, status="draft", created_by="u-1"),
        ])
        db.add_all([
            WorkPackage(id="wp-1", project_id=PID, code="WP-01", name="Substructure", level=0, order=1, currency="INR"),
            WorkPackage(id="wp-2", project_id=PID, code="WP-02", name="Superstructure", level=0, order=2, currency="INR"),
        ])
        db.add(BoqItem(id="bq-1", work_package_id="wp-2", code="4.2.3",
                       description="M25 RCC beam 500x300 incl. formwork", unit="m3",
                       quantity=46, rate=18400, amount=846400, status="priced"))
        db.add_all([
            CostBreakdown(id="cb-1", project_id=PID, category="material", sub_category="Steel & cement",
                          budgeted=26000000, actual=11800000, committed=15000000, forecast=27900000,
                          variance=1400000, variance_percent=5.4, currency="INR", period="2026-10"),
            CostBreakdown(id="cb-2", project_id=PID, category="labour", sub_category="Site labour",
                          budgeted=10000000, actual=4600000, committed=5200000, forecast=10680000,
                          variance=680000, variance_percent=6.8, currency="INR", period="2026-10"),
        ])
        db.add_all([
            Activity(id="sch-1", project_id=PID, wbs_code="1.1", name="Footings", type="task", status="completed",
                     progress=100, start_date="2026-02-01", end_date="2026-03-10",
                     early_start="2026-02-01", early_finish="2026-03-10", late_start="2026-02-01",
                     late_finish="2026-03-10", duration=28, is_critical=True),
            Activity(id="sch-2", project_id=PID, wbs_code="1.2", name="Columns L2", type="task", status="in-progress",
                     progress=55, start_date="2026-09-01", end_date="2026-10-20",
                     early_start="2026-09-01", early_finish="2026-10-20", late_start="2026-08-28",
                     late_finish="2026-10-16", duration=36, remaining_duration=16, total_float=-4, is_critical=True),
        ])
        db.add(Conflict(id="cf-1", project_id=PID, type="structural-vs-mep", severity="critical", status="new",
                        title="Beam B-204 vs Duct D-118 — zero clearance at L3",
                        description="Duct clashes with beam soffit; needs reroute or notch.", reported_by="u-1"))
        db.add(Revision(id="rev-1", project_id=PID, from_version=1, to_version=2,
                        title="SW-3 thickened, grid C shifted", type="drawing", status="approved",
                        impacts={"cost": {"magnitude": "medium", "value": 840000, "percent": 1.9,
                                           "description": "+₹8.4L", "details": []},
                                 "schedule": {"magnitude": "low", "value": 4, "percent": 1,
                                              "description": "+4 days", "details": []},
                                 "material": {"magnitude": "medium", "value": 38, "percent": 4,
                                              "description": "+38t steel", "details": []},
                                 "risk": {"magnitude": "low", "value": 1, "percent": 2, "description": "", "details": []}},
                        submitted_by="u-1"))
        db.add(Risk(id="r-7", project_id=PID, code="R-07", title="Steel procurement delay",
                    description="Supplier B backlog", category="procurement", probability=4, impact=5,
                    score=20, rating="very-high", status="mitigating", owner_id="u-1", owner_name="Demo",
                    identified_by="u-1"))
        for i, (aid, aname, action, etype, ename, mins) in enumerate([
            ("u-2", "Ananya", "updated rate on", "boq", "BOQ 4.2.3", 2),
            ("u-3", "Site Bot", "ran clash detection", "conflict", "CR-41 (3 new)", 60),
            ("u-4", "Ravi", "marked progress on", "schedule", "Columns L2 → 55%", 180),
            ("u-2", "Ananya", "approved", "revision", "V1 → V2", 1440),
        ]):
            db.add(ActivityItem(id=f"a-{i+1}", project_id=PID, actor_id=aid, actor_name=aname, action=action,
                                entity_type=etype, entity_name=ename, created_at=now - timedelta(minutes=mins)))
        db.add_all([
            Notification(id="n-1", user_id="u-1", type="conflict", title="Critical clash: B-204 vs D-118",
                         body="Zero clearance at L3 — blocks Friday pour.", link="/coordination"),
            Notification(id="n-2", user_id="u-1", type="risk", title="R-07 steel procurement at 20 pts",
                         body="Supplier B backlog — dual-source mitigation due.", link="/risks"),
            Notification(id="n-3", user_id="u-1", type="schedule", title="Slab L5 at risk (Oct 28)",
                         body="12 days behind baseline BL-01.", link="/schedule", read=True),
        ])
        db.commit()
        print("seed: demo workspace created (demo@civiq.ai / demo1234)")
    ensure_single_admin()
    finally:
        db.close()


def ensure_single_admin() -> None:
    """Idempotent single-admin bootstrap: promotes ADMIN_EMAIL if no admin exists."""
    import os

    from app.models.admin import DEFAULT_SETTINGS, PlatformSetting

    Session = get_session_local()
    db = Session()
    try:
        if db.query(User).filter(User.role == "admin").first():
            return
        email = (os.getenv("ADMIN_EMAIL") or "").lower().strip()
        target = db.query(User).filter(User.email == email).first() if email else None
        if not target:
            print("seed: no admin present — set ADMIN_EMAIL to bootstrap the single super admin")
            return
        target.role = "admin"
        target.is_active = True
        target.email_verified = True
        db.commit()
        for key, val in DEFAULT_SETTINGS.items():
            if not db.get(PlatformSetting, key):
                db.add(PlatformSetting(key=key, value=dict(val)))
        db.commit()
        print(f"seed: promoted {target.email} to super admin")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
