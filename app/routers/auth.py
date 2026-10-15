from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import deps, security, serializers as S
from app.db import get_db
from app.models.user import EmailToken, RefreshToken, User
from app.schemas import auth as sch
from app.services import mail

router = APIRouter(prefix="/auth", tags=["auth"])


def _auth_response(user: User, db: Session) -> dict:
    access = security.create_access_token(user.id, user.role)
    token, digest, expires = security.new_refresh_token()
    db.add(RefreshToken(id=deps.uid(), token_hash=digest, user_id=user.id, expires_at=expires))
    db.commit()
    return {"user": S.user_out(user), "accessToken": access, "refreshToken": token}


@router.post("/login")
def login(body: sch.LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower().strip()).first()
    if not user or not security.verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return _auth_response(user, db)


@router.post("/register", status_code=200)
def register(body: sch.RegisterIn, db: Session = Depends(get_db)):
    email = body.email.lower().strip()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    user = User(id=deps.uid(), email=email, name=body.name, company=body.company,
                password_hash=security.hash_password(body.password), role="engineer")
    db.add(user)
    db.commit()
    return _auth_response(user, db)


@router.post("/logout")
def logout(user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    db.query(RefreshToken).filter(RefreshToken.user_id == user.id).update({"revoked": True})
    db.commit()
    return {"ok": True}


@router.post("/refresh")
def refresh(body: sch.RefreshIn, db: Session = Depends(get_db)):
    digest = security.hash_token(body.refresh_token)
    rec = db.query(RefreshToken).filter(RefreshToken.token_hash == digest).first()
    now = datetime.now(timezone.utc)
    exp = rec.expires_at.replace(tzinfo=timezone.utc) if rec and rec.expires_at.tzinfo is None else (rec.expires_at if rec else now)
    if not rec or rec.revoked or exp < now:
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = db.get(User, rec.user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    # rotate
    rec.revoked = True
    access = security.create_access_token(user.id, user.role)
    token, new_digest, expires = security.new_refresh_token()
    db.add(RefreshToken(id=deps.uid(), token_hash=new_digest, user_id=user.id, expires_at=expires))
    db.commit()
    return {"accessToken": access, "refreshToken": token}


@router.get("/me")
def me(user: User = Depends(deps.get_current_user)):
    return S.user_out(user)


@router.patch("/profile")
def update_profile(body: sch.ProfileUpdate, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    if body.name is not None:
        user.name = body.name
    if body.avatar is not None:
        user.avatar = body.avatar
    db.commit()
    return S.user_out(user)


@router.post("/change-password")
def change_password(body: sch.ChangePasswordIn, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    if not security.verify_password(body.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(body.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password too short")
    user.password_hash = security.hash_password(body.new_password)
    db.commit()
    return {"ok": True}


def _issue_token(db: Session, kind: str, user: User, payload: str = "") -> str:
    import secrets

    token = secrets.token_urlsafe(32)
    digest = security.hash_token(token)
    expires = datetime.now(timezone.utc) + timedelta(hours=24)
    db.add(EmailToken(id=deps.uid(), kind=kind, token_hash=digest, user_id=user.id,
                      email=user.email, payload=payload, expires_at=expires))
    db.commit()
    return token


@router.post("/forgot-password")
def forgot_password(body: sch.ForgotIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower().strip()).first()
    if user:
        token = _issue_token(db, "reset", user)
        mail.send_email(user.email, "Reset your CivIQ password",
                        f"Use this token to reset your password: {token}\nValid for 24 hours.")
    return {"ok": True}


@router.post("/reset-password")
def reset_password(body: sch.ResetIn, db: Session = Depends(get_db)):
    rec = db.query(EmailToken).filter(EmailToken.kind == "reset",
                                      EmailToken.token_hash == security.hash_token(body.token)).first()
    now = datetime.now(timezone.utc)
    exp = rec.expires_at.replace(tzinfo=timezone.utc) if rec and rec.expires_at.tzinfo is None else None
    if not rec or rec.used or (exp and exp < now):
        raise HTTPException(status_code=400, detail="Invalid or expired token")
    user = db.get(User, rec.user_id)
    if not user:
        raise HTTPException(status_code=400, detail="Invalid token")
    if len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password too short")
    user.password_hash = security.hash_password(body.password)
    rec.used = True
    db.commit()
    return {"ok": True}


@router.post("/verify-email")
def verify_email(body: sch.VerifyIn, db: Session = Depends(get_db)):
    rec = db.query(EmailToken).filter(EmailToken.kind == "verify",
                                      EmailToken.token_hash == security.hash_token(body.token)).first()
    if not rec or rec.used:
        raise HTTPException(status_code=400, detail="Invalid token")
    user = db.get(User, rec.user_id)
    if user:
        user.email_verified = True
    rec.used = True
    db.commit()
    return {"ok": True}


@router.post("/resend-verification")
def resend_verification(body: sch.ResendIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == body.email.lower().strip()).first()
    if user and not user.email_verified:
        token = _issue_token(db, "verify", user)
        mail.send_email(user.email, "Verify your CivIQ email", f"Verification token: {token}")
    return {"ok": True}
