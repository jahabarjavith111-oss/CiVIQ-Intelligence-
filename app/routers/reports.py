from fastapi import APIRouter, Depends, File, Form, HTTPException, Response, UploadFile
from sqlalchemy.orm import Session

from app import deps, serializers as S
from app.db import get_db
from app.models.report import Document, Report
from app.models.user import User
from app.schemas import report as sch
from app.services import reports as report_svc
from app.services.activity import log
from app.storage.store import get_store, new_key

router = APIRouter(tags=["reports"])


@router.get("/projects/{pid}/reports")
def list_reports(pid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    return [S.report_out(r) for r in db.query(Report).filter(Report.project_id == pid).order_by(Report.created_at.desc()).all()]


@router.post("/projects/{pid}/reports", status_code=201)
def generate(pid: str, body: sch.ReportCreate, user: User = Depends(deps.get_current_user),
             db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    cfg = dict(body.config) if body.config else {"template": "standard", "sections": ["summary"]}
    rep = Report(id=deps.uid(), project_id=pid, name=body.name, type=body.type, status="generating",
                 config=cfg, created_by=user.id)
    db.add(rep)
    db.commit()
    try:
        sections = report_svc.collect(db, pid, body.type)
        pdf = report_svc.to_pdf_bytes(f"{body.name} — {body.type}", sections)
        key = new_key(f"reports/{pid}", f"{body.name}.pdf")
        url = get_store().save(pdf, key, "application/pdf")
        rep.file_key = key
        rep.file_url = url
        rep.status = "ready"
    except Exception as exc:
        rep.status = "failed"
        print(f"[reports] generation failed: {exc}")
    db.commit()
    log(db, pid, user, "generated report", "report", rep.id, rep.name)
    return S.report_out(rep)


@router.get("/reports/{rid}")
def get_report(rid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Report, rid, "Report")
    deps.require_project_member(db, r.project_id, user)
    return S.report_out(r)


@router.get("/reports/{rid}/download")
def download_report(rid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Report, rid, "Report")
    deps.require_project_member(db, r.project_id, user)
    data = get_store().get(r.file_key or "") if r.file_key else None
    if data is None:
        # regenerate on the fly as fallback
        sections = report_svc.collect(db, r.project_id, r.type)
        data = report_svc.to_pdf_bytes(f"{r.name} — {r.type}", sections)
    return Response(content=data, media_type="application/pdf",
                    headers={"Content-Disposition": f'attachment; filename="{r.name}.pdf"'})


@router.delete("/reports/{rid}")
def delete_report(rid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    r = deps.get_or_404(db, Report, rid, "Report")
    deps.require_project_member(db, r.project_id, user)
    if r.file_key:
        get_store().delete(r.file_key)
    db.delete(r)
    db.commit()
    return {"ok": True}


@router.get("/projects/{pid}/documents")
def list_documents(pid: str, folder: str | None = None, search: str | None = None,
                   user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    q = db.query(Document).filter(Document.project_id == pid)
    if folder:
        q = q.filter(Document.folder == folder)
    if search:
        q = q.filter(Document.name.ilike(f"%{search}%"))
    return [S.document_out(d) for d in q.order_by(Document.created_at.desc()).all()]


@router.post("/projects/{pid}/documents", status_code=201)
async def upload_document(pid: str, file: UploadFile = File(...), folder: str | None = Form(None),
                          user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    deps.require_project_member(db, pid, user)
    data = await file.read()
    key = new_key(f"documents/{pid}", file.filename or "document")
    url = get_store().save(data, key, file.content_type or "application/octet-stream")
    ext = (file.filename or "").rsplit(".", 1)[-1].lower() if "." in (file.filename or "") else "bin"
    same = db.query(Document).filter(Document.project_id == pid, Document.name == (file.filename or "document")).first()
    d = Document(id=deps.uid(), project_id=pid, name=file.filename or "document", type=ext,
                 file_key=key, file_url=url, file_size=len(data), version=(same.version + 1) if same else 1,
                 folder=folder, uploaded_by=user.id)
    db.add(d)
    db.commit()
    return S.document_out(d)


@router.delete("/documents/{did}")
def delete_document(did: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    d = deps.get_or_404(db, Document, did, "Document")
    deps.require_project_member(db, d.project_id, user)
    get_store().delete(d.file_key)
    db.delete(d)
    db.commit()
    return {"ok": True}


@router.get("/documents/{did}/download")
def download_document(did: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    d = deps.get_or_404(db, Document, did, "Document")
    deps.require_project_member(db, d.project_id, user)
    data = get_store().get(d.file_key)
    if data is None:
        raise HTTPException(status_code=404, detail="File not found")
    return Response(content=data, media_type="application/octet-stream",
                    headers={"Content-Disposition": f'attachment; filename="{d.name}"'})
