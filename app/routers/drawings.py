from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

from app import deps, serializers as S
from app.db import get_db
from app.models.drawing import Drawing, DrawingAnalysis
from app.models.user import User
from app.schemas import drawing as sch
from app.services import drawings_ai
from app.services.activity import log
from app.services.platform import upload_max_mb
from app.services.exports import build as build_export, filename
from app.storage.store import get_store, new_key

router = APIRouter(tags=["drawings"])


def _analysis_out(db: Session, drawing_id: str) -> dict | None:
    a = db.query(DrawingAnalysis).filter(DrawingAnalysis.drawing_id == drawing_id).order_by(DrawingAnalysis.created_at.desc()).first()
    return S.analysis_out(a) if a else None


@router.get("/projects/{pid}/drawings")
def list_drawings(pid: str, pp: dict = Depends(deps.page_params), type: str | None = None,
                  status: str | None = None, search: str | None = None,
                  user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    q = db.query(Drawing).filter(Drawing.project_id == pid)
    if type:
        q = q.filter(Drawing.type == type)
    if status:
        q = q.filter(Drawing.status == status)
    if search:
        q = q.filter(Drawing.name.ilike(f"%{search}%"))
    total = q.count()
    rows = q.order_by(Drawing.updated_at.desc()).offset(pp["offset"]).limit(pp["limit"]).all()
    return deps.envelope([S.drawing_out(d, _analysis_out(db, d.id)) for d in rows], total, pp["page"], pp["limit"])


@router.post("/projects/{pid}/drawings", status_code=201)
async def upload_drawing(pid: str, file: UploadFile = File(...), type: str = Form("architectural"),
                         discipline: str = Form(""), user: User = Depends(deps.get_current_user),
                         db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    data = await file.read()
    max_mb = upload_max_mb(db)
    if len(data) > max_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File too large (max {max_mb}MB)")
    store = get_store()
    key = new_key(f"drawings/{pid}", file.filename or "drawing.pdf")
    url = store.save(data, key, file.content_type or "application/pdf")
    info = drawings_ai.pdf_info(data) if (file.filename or "").lower().endswith(".pdf") else {"pages": 1, "texts": []}
    name = (file.filename or "drawing").rsplit(".", 1)[0]
    d = Drawing(id=deps.uid(), project_id=pid, name=name, original_name=file.filename or name,
                type=type, discipline=discipline, version=1, status="uploaded",
                file_key=key, file_url=url, file_size=len(data), pages=info["pages"], uploaded_by=user.id)
    db.add(d)
    db.commit()
    log(db, pid, user, "uploaded drawing", "drawing", d.id, name)
    return S.drawing_out(d)


@router.post("/projects/{pid}/drawings/batch-analyze")
def batch_analyze(pid: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    ids = body.get("drawingIds", []) or []
    options = body.get("options") or {}
    for did in ids:
        d = db.get(Drawing, did)
        if d and d.project_id == pid:
            _run_analysis(db, d, options, user)
    return {"ok": True, "count": len(ids)}


def _run_analysis(db: Session, d: Drawing, options: dict, user: User | None = None) -> dict:
    from app.services.activity import log as _log

    store = get_store()
    data = store.get(d.file_key) or b""
    res = drawings_ai.analyze_drawing(data, d.original_name, options)
    a = DrawingAnalysis(id=deps.uid(), drawing_id=d.id, status="completed", elements=res["elements"],
                        ocr_text=res["ocr_text"], confidence=res["confidence"])
    from datetime import datetime

    a.processed_at = datetime.utcnow()
    db.add(a)
    if res["pages"] and res["pages"] != d.pages:
        d.pages = res["pages"]
    d.status = "analyzed"
    db.commit()
    return S.analysis_out(a)


@router.get("/projects/{pid}/drawings/stats")
def drawing_stats(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    rows = db.query(Drawing).filter(Drawing.project_id == pid).all()
    by_type: dict[str, int] = {}
    by_status: dict[str, int] = {}
    for d in rows:
        by_type[d.type] = by_type.get(d.type, 0) + 1
        by_status[d.status] = by_status.get(d.status, 0) + 1
    return {"total": len(rows), "byType": by_type, "byStatus": by_status}


@router.get("/drawings/{did}")
def get_drawing(did: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    d = deps.get_or_404(db, Drawing, did, "Drawing")
    deps.require_project_member(db, d.project_id, user)
    return S.drawing_out(d, _analysis_out(db, did))


@router.patch("/drawings/{did}")
def update_drawing(did: str, body: sch.DrawingUpdate, user: User = Depends(deps.get_current_user),
                   db: Session = Depends(get_db)):
    d = deps.get_or_404(db, Drawing, did, "Drawing")
    deps.require_project_member(db, d.project_id, user)
    for f in ("name", "type", "discipline", "status"):
        v = getattr(body, f)
        if v is not None:
            setattr(d, f, v)
    db.commit()
    return S.drawing_out(d, _analysis_out(db, did))


@router.delete("/drawings/{did}")
def delete_drawing(did: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    d = deps.get_or_404(db, Drawing, did, "Drawing")
    deps.require_project_member(db, d.project_id, user)
    get_store().delete(d.file_key)
    db.delete(d)
    db.commit()
    return {"ok": True}


@router.post("/drawings/{did}/analyze")
def analyze(did: str, body: sch.AnalyzeIn, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    d = deps.get_or_404(db, Drawing, did, "Drawing")
    deps.require_project_member(db, d.project_id, user)
    d.status = "processing"
    db.commit()
    try:
        return _run_analysis(db, d, (body.options.model_dump() if body.options else {}), user)
    except Exception as exc:
        d.status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/drawings/{did}/analysis")
def get_analysis(did: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    d = deps.get_or_404(db, Drawing, did, "Drawing")
    deps.require_project_member(db, d.project_id, user)
    a = _analysis_out(db, did)
    if not a:
        raise HTTPException(status_code=404, detail="No analysis yet")
    return a


@router.get("/drawings/{did}/elements")
def get_elements(did: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    d = deps.get_or_404(db, Drawing, did, "Drawing")
    deps.require_project_member(db, d.project_id, user)
    a = _analysis_out(db, did)
    return (a or {}).get("elements", [])


@router.get("/drawings/{did}/ocr")
def get_ocr(did: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    d = deps.get_or_404(db, Drawing, did, "Drawing")
    deps.require_project_member(db, d.project_id, user)
    a = _analysis_out(db, did)
    return (a or {}).get("ocrText", [])


@router.get("/drawings/{did}/thumbnail")
def thumbnail(did: str, page: int = 1, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    d = deps.get_or_404(db, Drawing, did, "Drawing")
    deps.require_project_member(db, d.project_id, user)
    img = drawings_ai.placeholder_render(d.name, page, 1.0, 480, 340)
    return Response(content=img, media_type="image/png")


@router.get("/drawings/{did}/pages/{page}")
def render_page(did: str, page: int, scale: float | None = None, user: User = Depends(deps.get_current_user),
                db: Session = Depends(get_db)):
    d = deps.get_or_404(db, Drawing, did, "Drawing")
    deps.require_project_member(db, d.project_id, user)
    img = drawings_ai.placeholder_render(d.name, page, scale or 1.0)
    return Response(content=img, media_type="image/png")


@router.get("/drawings/{did}/download")
def download(did: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    d = deps.get_or_404(db, Drawing, did, "Drawing")
    deps.require_project_member(db, d.project_id, user)
    data = get_store().get(d.file_key)
    if data is None:
        raise HTTPException(status_code=404, detail="File not found")
    return Response(content=data, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{d.original_name}"'})


@router.post("/drawings/{did}/duplicate", status_code=201)
def duplicate(did: str, body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    d = deps.get_or_404(db, Drawing, did, "Drawing")
    deps.require_project_member(db, d.project_id, user)
    target_pid = body.get("projectId", d.project_id)
    deps.require_project_member(db, target_pid, user)
    copy = Drawing(id=deps.uid(), project_id=target_pid, name=f"{d.name} (copy)", original_name=d.original_name,
                   type=d.type, discipline=d.discipline, version=1, status=d.status, file_key=d.file_key,
                   file_url=d.file_url, file_size=d.file_size, pages=d.pages, uploaded_by=user.id)
    db.add(copy)
    db.commit()
    return S.drawing_out(copy)
