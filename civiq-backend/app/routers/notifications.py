from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import deps, serializers as S
from app.db import get_db
from app.models.collab import Notification, NotificationPrefs
from app.models.user import User
from app.schemas import collab as sch

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(pp: dict = Depends(deps.page_params),
                       unread_only: bool = Query(default=False, alias="unreadOnly"),
                       user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    q = db.query(Notification).filter(Notification.user_id == user.id)
    if unread_only:
        q = q.filter(Notification.read.is_(False))
    total = q.count()
    unread = db.query(Notification).filter(Notification.user_id == user.id, Notification.read.is_(False)).count()
    rows = q.order_by(Notification.created_at.desc()).offset(pp["offset"]).limit(pp["limit"]).all()
    return {"data": [S.notification_out(n) for n in rows], "total": total, "unread": unread}


@router.post("/{nid}/read")
def mark_read(nid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == nid, Notification.user_id == user.id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.read = True
    db.commit()
    return S.notification_out(n)


@router.post("/read-all")
def mark_all_read(user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    db.query(Notification).filter(Notification.user_id == user.id).update({"read": True})
    db.commit()
    return {"ok": True}


@router.get("/preferences")
def get_prefs(user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    prefs = db.get(NotificationPrefs, user.id)
    if not prefs:
        prefs = NotificationPrefs(user_id=user.id)
        db.add(prefs)
        db.commit()
    return {"email": prefs.email, "push": prefs.push, "inApp": prefs.in_app}


@router.patch("/preferences")
def update_prefs(body: sch.PrefsUpdate, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    prefs = db.get(NotificationPrefs, user.id)
    if not prefs:
        prefs = NotificationPrefs(user_id=user.id)
        db.add(prefs)
    if body.email is not None:
        prefs.email = body.email
    if body.push is not None:
        prefs.push = body.push
    if body.in_app is not None:
        prefs.in_app = body.in_app
    db.commit()
    return {"email": prefs.email, "push": prefs.push, "inApp": prefs.in_app}
