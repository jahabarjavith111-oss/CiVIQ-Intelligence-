from datetime import datetime

from app.schemas.common import CamelModel


class UserOut(CamelModel):
    id: str
    email: str
    name: str
    avatar: str | None = None
    role: str
    created_at: datetime
    updated_at: datetime


class AuthResponse(CamelModel):
    user: UserOut
    access_token: str
    refresh_token: str


class LoginIn(CamelModel):
    email: str
    password: str
    remember_me: bool = False


class RegisterIn(CamelModel):
    email: str
    password: str
    name: str
    company: str | None = None


class RefreshIn(CamelModel):
    refresh_token: str


class RefreshOut(CamelModel):
    access_token: str
    refresh_token: str | None = None


class ForgotIn(CamelModel):
    email: str


class ResetIn(CamelModel):
    token: str
    password: str


class VerifyIn(CamelModel):
    token: str


class ResendIn(CamelModel):
    email: str


class ProfileUpdate(CamelModel):
    name: str | None = None
    avatar: str | None = None


class ChangePasswordIn(CamelModel):
    current_password: str
    new_password: str
