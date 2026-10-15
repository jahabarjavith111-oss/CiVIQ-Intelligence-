from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Response, UploadFile
from sqlalchemy.orm import Session

from app import deps, serializers as S
from app.db import get_db
from app.models.schedule import Activity, Baseline, Calendar, Constraint, Dependency, Resource
from app.models.user import User
from app.schemas import schedule as sch
from app.services import analytics, cpm
from app.services.activity import log
from app.services.exports import build as build_export, filename

router = APIRouter(tags=["schedule"])


def _full(db: Session, a: Activity) -> dict:
    res = [S.resource_out(r) for r in db.query(Resource).filter(Resource.activity_id == a.id).all()]
    preds = [S.dep_out(d) for d in db.query(Dependency).filter(Dependency.to_activity_id == a.id).all()]
    succs = [S.dep_out(d) for d in db.query(Dependency).filter(Dependency.from_activity_id == a.id).all()]
    cons = [S.constraint_out(c) for c in db.query(Constraint).filter(Constraint.activity_id == a.id).all()]
    return S.activity_out(a, res, preds, succs, cons)


def _acts_payload(db: Session, pid: str) -> list[dict]:
    return [{"id": a.id, "start_date": a.start_date, "end_date": a.end_date, "duration": a.duration}
            for a in db.query(Activity).filter(Activity.project_id == pid).all()]


def _deps_payload(db: Session, pid: str) -> list[dict]:
    return [{"from_activity_id": d.from_activity_id, "to_activity_id": d.to_activity_id,
             "type": d.type, "lag": d.lag}
            for d in db.query(Dependency).filter(Dependency.project_id == pid).all()]


@router.get("/projects/{pid}/schedule/activities")
def list_activities(pid: str, pp: dict = Depends(deps.page_params), status: str | None = None,
                    user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    q = db.query(Activity).filter(Activity.project_id == pid)
    if status:
        q = q.filter(Activity.status == status)
    total = q.count()
    rows = q.order_by(Activity.start_date).offset(pp["offset"]).limit(pp["limit"]).all()
    return deps.envelope([_full(db, a) for a in rows], total, pp["page"], pp["limit"])


@router.post("/projects/{pid}/schedule/activities", status_code=201)
def create_activity(pid: str, body: sch.ActivityCreate, user: User = Depends(deps.get_current_user),
                    db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    a = Activity(id=deps.uid(), project_id=pid, wbs_code=body.wbs_code, name=body.name,
                 description=body.description, type=body.type, status=body.status, progress=body.progress,
                 start_date=body.start_date, end_date=body.end_date,
                 early_start=body.start_date, early_finish=body.end_date,
                 late_start=body.start_date, late_finish=body.end_date,
                 duration=body.duration, remaining_duration=body.duration,
                 calendar_id=body.calendar_id, notes=body.notes)
    db.add(a)
    db.commit()
    return _full(db, a)


@router.get("/schedule/activities/{aid}")
def get_activity(aid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    a = deps.get_or_404(db, Activity, aid, "Activity")
    deps.require_project_member(db, a.project_id, user)
    return _full(db, a)


@router.patch("/schedule/activities/{aid}")
def update_activity(aid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    a = deps.get_or_404(db, Activity, aid, "Activity")
    deps.require_project_member(db, a.project_id, user)
    mapping = {"wbsCode": "wbs_code", "startDate": "start_date", "endDate": "end_date",
               "actualStart": "actual_start", "actualFinish": "actual_finish",
               "remainingDuration": "remaining_duration", "totalFloat": "total_float",
               "freeFloat": "free_float", "isCritical": "is_critical", "calendarId": "calendar_id"}
    for k, v in body.items():
        key = mapping.get(k, k)
        if hasattr(a, key) and key not in ("id", "project_id"):
            setattr(a, key, v)
    db.commit()
    return _full(db, a)


@router.delete("/schedule/activities/{aid}")
def delete_activity(aid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    a = deps.get_or_404(db, Activity, aid, "Activity")
    deps.require_project_member(db, a.project_id, user)
    db.delete(a)
    db.commit()
    return {"ok": True}


@router.patch("/projects/{pid}/schedule/activities/bulk")
def bulk_update(pid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    out = []
    for raw in body.get("updates", []) or []:
        a = db.get(Activity, raw.get("id"))
        if not a or a.project_id != pid:
            continue
        for k, v in (raw.get("data") or {}).items():
            if hasattr(a, k) and k not in ("id", "project_id"):
                setattr(a, k, v)
        out.append(a)
    db.commit()
    return [_full(db, a) for a in out]


@router.get("/projects/{pid}/schedule/dependencies")
def list_deps(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    return [S.dep_out(d) for d in db.query(Dependency).filter(Dependency.project_id == pid).all()]


@router.post("/projects/{pid}/schedule/dependencies", status_code=201)
def create_dep(pid: str, body: sch.DependencyIn, user: User = Depends(deps.get_current_user),
               db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    d = Dependency(id=deps.uid(), project_id=pid, from_activity_id=body.from_activity_id,
                   to_activity_id=body.to_activity_id, type=body.type, lag=body.lag)
    db.add(d)
    db.commit()
    return S.dep_out(d)


@router.patch("/schedule/dependencies/{did}")
def update_dep(did: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    d = deps.get_or_404(db, Dependency, did, "Dependency")
    deps.require_project_member(db, d.project_id, user)
    for k in ("from_activity_id", "fromActivityId", "to_activity_id", "toActivityId", "type", "lag"):
        if k in body:
            setattr(d, {"fromActivityId": "from_activity_id", "toActivityId": "to_activity_id"}.get(k, k), body[k])
    db.commit()
    return S.dep_out(d)


@router.delete("/schedule/dependencies/{did}")
def delete_dep(did: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    d = deps.get_or_404(db, Dependency, did, "Dependency")
    deps.require_project_member(db, d.project_id, user)
    db.delete(d)
    db.commit()
    return {"ok": True}


@router.get("/projects/{pid}/schedule/constraints")
def list_constraints(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    return [S.constraint_out(c) for c in db.query(Constraint).filter(Constraint.project_id == pid).all()]


@router.post("/projects/{pid}/schedule/constraints", status_code=201)
def create_constraint(pid: str, body: sch.ConstraintIn, user: User = Depends(deps.get_current_user),
                      db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    c = Constraint(id=deps.uid(), project_id=pid, activity_id=body.activity_id or "", type=body.type, date=body.date)
    db.add(c)
    db.commit()
    return S.constraint_out(c)


@router.patch("/schedule/constraints/{cid}")
def update_constraint(cid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    c = deps.get_or_404(db, Constraint, cid, "Constraint")
    deps.require_project_member(db, c.project_id, user)
    for k in ("type", "date", "activity_id", "activityId"):
        if k in body:
            setattr(c, "activity_id" if k == "activityId" else k, body[k])
    db.commit()
    return S.constraint_out(c)


@router.delete("/schedule/constraints/{cid}")
def delete_constraint(cid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    c = deps.get_or_404(db, Constraint, cid, "Constraint")
    deps.require_project_member(db, c.project_id, user)
    db.delete(c)
    db.commit()
    return {"ok": True}


@router.get("/schedule/activities/{aid}/resources")
def list_resources(aid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    a = deps.get_or_404(db, Activity, aid, "Activity")
    deps.require_project_member(db, a.project_id, user)
    return [S.resource_out(r) for r in db.query(Resource).filter(Resource.activity_id == aid).all()]


@router.post("/schedule/activities/{aid}/resources", status_code=201)
def add_resource(aid: str, body: sch.ResourceIn, user: User = Depends(deps.get_current_user),
                 db: Session = Depends(get_db)):
    a = deps.get_or_404(db, Activity, aid, "Activity")
    deps.require_project_member(db, a.project_id, user)
    r = Resource(id=deps.uid(), activity_id=aid, type=body.type, name=body.name, quantity=body.quantity,
                 unit=body.unit, cost_per_unit=body.cost_per_unit,
                 total_cost=body.total_cost or round(body.quantity * body.cost_per_unit, 2))
    db.add(r)
    db.commit()
    return S.resource_out(r)


@router.patch("/schedule/resources/{rid}")
def update_resource(rid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Resource, rid, "Resource")
    a = db.get(Activity, r.activity_id)
    deps.require_project_member(db, a.project_id if a else "", user)
    mapping = {"costPerUnit": "cost_per_unit", "totalCost": "total_cost"}
    for k, v in body.items():
        key = mapping.get(k, k)
        if hasattr(r, key):
            setattr(r, key, v)
    db.commit()
    return S.resource_out(r)


@router.delete("/schedule/resources/{rid}")
def delete_resource(rid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Resource, rid, "Resource")
    a = db.get(Activity, r.activity_id)
    deps.require_project_member(db, a.project_id if a else "", user)
    db.delete(r)
    db.commit()
    return {"ok": True}


@router.get("/projects/{pid}/schedule/calendars")
def list_calendars(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    return [S.calendar_out(c) for c in db.query(Calendar).filter(Calendar.project_id == pid).all()]


@router.get("/schedule/calendars/{cid}")
def get_calendar(cid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    c = deps.get_or_404(db, Calendar, cid, "Calendar")
    deps.require_project_member(db, c.project_id, user)
    return S.calendar_out(c)


@router.post("/projects/{pid}/schedule/calendars", status_code=201)
def create_calendar(pid: str, body: sch.CalendarIn, user: User = Depends(deps.get_current_user),
                    db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    c = Calendar(id=deps.uid(), project_id=pid, name=body.name, is_default=body.is_default,
                 working_days=list(body.working_days), working_hours=list(body.working_hours))
    db.add(c)
    db.commit()
    return S.calendar_out(c)


@router.patch("/schedule/calendars/{cid}")
def update_calendar(cid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    c = deps.get_or_404(db, Calendar, cid, "Calendar")
    deps.require_project_member(db, c.project_id, user)
    mapping = {"isDefault": "is_default", "workingDays": "working_days", "workingHours": "working_hours"}
    for k, v in body.items():
        key = mapping.get(k, k)
        if hasattr(c, key):
            setattr(c, key, v)
    db.commit()
    return S.calendar_out(c)


@router.post("/schedule/calendars/{cid}/exceptions", status_code=201)
def add_exception(cid: str, body: sch.ExceptionIn, user: User = Depends(deps.get_current_user),
                  db: Session = Depends(get_db)):
    c = deps.get_or_404(db, Calendar, cid, "Calendar")
    deps.require_project_member(db, c.project_id, user)
    exc = {"id": deps.uid(), "calendarId": cid, "date": body.date, "type": body.type,
           "name": body.name, "workingHours": body.working_hours}
    c.exceptions = (c.exceptions or []) + [exc]
    db.commit()
    return exc


@router.patch("/schedule/calendars/{cid}/exceptions/{eid}")
def update_exception(cid: str, eid: str, body: dict, user: User = Depends(deps.get_current_user),
                     db: Session = Depends(get_db)):
    c = deps.get_or_404(db, Calendar, cid, "Calendar")
    deps.require_project_member(db, c.project_id, user)
    out = []
    for e in c.exceptions or []:
        if e.get("id") == eid:
            e = {**e, **body}
        out.append(e)
    c.exceptions = out
    db.commit()
    return next((e for e in out if e.get("id") == eid), {"ok": True})


@router.delete("/schedule/calendars/{cid}/exceptions/{eid}")
def delete_exception(cid: str, eid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    c = deps.get_or_404(db, Calendar, cid, "Calendar")
    deps.require_project_member(db, c.project_id, user)
    c.exceptions = [e for e in (c.exceptions or []) if e.get("id") != eid]
    db.commit()
    return {"ok": True}


@router.post("/projects/{pid}/schedule/calculate")
def calculate(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    res = cpm.calculate(_acts_payload(db, pid), _deps_payload(db, pid))
    for a in res["activities"]:
        row = db.get(Activity, a["id"])
        if row:
            row.early_start = a["early_start"]
            row.early_finish = a["early_finish"]
            row.late_start = a["late_start"]
            row.late_finish = a["late_finish"]
            row.total_float = a["total_float"]
            row.free_float = a["free_float"]
            row.is_critical = a["is_critical"]
    db.commit()
    return {"criticalPath": res["critical_path"], "activities": [_full(db, db.get(Activity, a["id"])) for a in res["activities"]]}


@router.get("/projects/{pid}/schedule/critical-path")
def critical_path(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    res = cpm.calculate(_acts_payload(db, pid), _deps_payload(db, pid))
    cp = res["critical_path"]
    return {"activities": cp["activities"], "totalDuration": cp["totalDuration"], "projectFinish": cp["projectFinish"]}


@router.get("/projects/{pid}/schedule/summary")
def summary(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    acts = db.query(Activity).filter(Activity.project_id == pid).all()
    cur = db.query(Baseline).filter(Baseline.project_id == pid, Baseline.is_current.is_(True)).first()
    return analytics.schedule_summary(
        [{"status": a.status, "progress": a.progress, "end_date": a.end_date, "type": a.type, "id": a.id, "name": a.name} for a in acts],
        cur.project_finish if cur else "")


@router.get("/projects/{pid}/schedule/baselines")
def list_baselines(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    return [S.baseline_out(b) for b in db.query(Baseline).filter(Baseline.project_id == pid).all()]


@router.post("/projects/{pid}/schedule/baselines", status_code=201)
def create_baseline(pid: str, body: sch.BaselineIn, user: User = Depends(deps.get_current_user),
                    db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    acts = [_full(db, a) for a in db.query(Activity).filter(Activity.project_id == pid).all()]
    ends = sorted(a["endDate"] for a in acts if a.get("endDate")) if acts else []
    starts = sorted(a["startDate"] for a in acts if a.get("startDate")) if acts else []
    b = Baseline(id=deps.uid(), project_id=pid, name=body.name, description=body.description, activities=acts,
                 project_start=starts[0] if starts else "", project_finish=ends[-1] if ends else "",
                 total_duration=sum(a.get("duration", 0) or 0 for a in acts), created_by=user.id)
    db.add(b)
    db.commit()
    return S.baseline_out(b)


@router.post("/projects/{pid}/schedule/baselines/{bid}/set-current")
def set_current(pid: str, bid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    db.query(Baseline).filter(Baseline.project_id == pid).update({"is_current": False})
    b = db.query(Baseline).filter(Baseline.id == bid, Baseline.project_id == pid).first()
    if not b:
        raise HTTPException(status_code=404, detail="Baseline not found")
    b.is_current = True
    db.commit()
    return {"ok": True}


@router.get("/projects/{pid}/schedule/baselines/compare")
def compare_baselines(pid: str, baseline_id1: str = Query(alias="baselineId1"),
                      baseline_id2: str = Query(alias="baselineId2"),
                      user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    b1 = db.query(Baseline).filter(Baseline.id == baseline_id1, Baseline.project_id == pid).first()
    b2 = db.query(Baseline).filter(Baseline.id == baseline_id2, Baseline.project_id == pid).first()
    if not b1 or not b2:
        raise HTTPException(status_code=404, detail="Baseline not found")
    return {"baseline1": b1.name, "baseline2": b2.name,
            "finishVariance": 0, "durationVariance": (b2.total_duration or 0) - (b1.total_duration or 0),
            "criticalPathChanged": False}


@router.get("/projects/{pid}/schedule/export")
def export_schedule(pid: str, format: str = "csv", user: User = Depends(deps.get_current_user),
                     db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    acts = db.query(Activity).filter(Activity.project_id == pid).all()
    rows = [[a.wbs_code, a.name, a.status, a.progress, a.start_date, a.end_date] for a in acts]
    data, ctype = build_export(format, f"schedule-{pid}", ["wbs", "name", "status", "progress", "start", "end"], rows)
    return Response(content=data, media_type=ctype,
                    headers={"Content-Disposition": f'attachment; filename="{filename("schedule", format)}"'})


@router.post("/projects/{pid}/schedule/import")
async def import_schedule(pid: str, file: UploadFile = File(...), format: str = Form("csv"),
                          user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    from app.services.imports import tabular

    headers, rows = tabular(await file.read(), file.filename or f"import.{format}")
    m = {h.lower(): i for i, h in enumerate(headers)}
    count = 0
    for r in rows:
        def col(*names):
            for n in names:
                if n in m:
                    return r[m[n]]
            return ""
        name = str(col("name", "task") or "").strip()
        if not name:
            continue
        db.add(Activity(id=deps.uid(), project_id=pid, wbs_code=str(col("wbs", "wbscode") or ""),
                        name=name, status=str(col("status") or "not-started"),
                        progress=float(col("progress") or 0), start_date=str(col("start", "startdate") or ""),
                        end_date=str(col("end", "enddate") or ""), duration=int(float(col("duration") or 0))))
        count += 1
    db.commit()
    log(db, pid, user, f"imported {count} activities", "schedule", None, file.filename)
    return {"imported": count}


@router.get("/projects/{pid}/schedule/gantt")
def gantt(pid: str, start_date: str | None = Query(default=None, alias="startDate"),
          end_date: str | None = Query(default=None, alias="endDate"), zoom: str | None = None,
          user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    acts = db.query(Activity).filter(Activity.project_id == pid).all()
    if start_date:
        acts = [a for a in acts if (a.end_date or "") >= start_date]
    if end_date:
        acts = [a for a in acts if (a.start_date or "") <= end_date]
    return {"zoom": zoom or "month",
            "rows": [{"id": a.id, "wbsCode": a.wbs_code, "name": a.name, "start": a.start_date,
                      "end": a.end_date, "progress": a.progress, "isCritical": a.is_critical} for a in acts]}
