from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import deps, serializers as S
from app.db import get_db
from app.models.project import Project
from app.models.simulation import Simulation
from app.models.user import User
from app.schemas import simulation as sch
from app.services import engines
from app.services.activity import log

router = APIRouter(tags=["simulations"])


@router.get("/projects/{pid}/simulations")
def list_sims(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    return [S.simulation_out(s) for s in db.query(Simulation).filter(Simulation.project_id == pid).all()]


@router.post("/projects/{pid}/simulations", status_code=201)
def create_sim(pid: str, body: sch.SimulationCreate, user: User = Depends(deps.get_current_user),
               db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    s = Simulation(id=deps.uid(), project_id=pid, name=body.name, description=body.description,
                   inputs=dict(body.inputs or {}), status="draft", created_by=user.id)
    db.add(s)
    db.commit()
    return S.simulation_out(s)


@router.get("/simulations/{sid}")
def get_sim(sid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    s = deps.get_or_404(db, Simulation, sid, "Simulation")
    deps.require_project_member(db, s.project_id, user)
    return S.simulation_out(s)


@router.post("/simulations/{sid}/run")
def run_sim(sid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    s = deps.get_or_404(db, Simulation, sid, "Simulation")
    deps.require_project_member(db, s.project_id, user)
    s.status = "running"
    db.commit()
    p = db.get(Project, s.project_id)
    total = float(p.budget) if p and p.budget else 45000000
    baseline_finish = p.end_date if p and p.end_date else ""
    s.results = engines.run_what_if(total, baseline_finish, s.inputs or {})
    s.status = "completed"
    db.commit()
    log(db, s.project_id, user, "ran simulation", "project", s.id, s.name)
    return S.simulation_out(s)


@router.delete("/simulations/{sid}")
def delete_sim(sid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    s = deps.get_or_404(db, Simulation, sid, "Simulation")
    deps.require_project_member(db, s.project_id, user)
    db.delete(s)
    db.commit()
    return {"ok": True}


@router.post("/projects/{pid}/simulations/compare")
def compare(pid: str, body: sch.CompareIn, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    sims = db.query(Simulation).filter(Simulation.id.in_(body.ids or ["__none__"])).all()
    return {"scenarios": [S.simulation_out(s) for s in sims]}
