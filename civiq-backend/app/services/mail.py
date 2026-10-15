"""Email stub: dev logs tokens to console; SMTP when SMTP_URL is configured."""
from app.config import settings

_last_sent: dict = {}


def send_email(to: str, subject: str, body: str) -> None:
    _last_sent["to"] = to
    _last_sent["subject"] = subject
    if settings.smtp_url:
        # Production hook: integrate SendGrid/SES/SMTP here.
        print(f"[mail] (smtp stub) to={to} subject={subject}")
    else:
        print(f"[mail] to={to} subject={subject}\n{body}")


def last_sent() -> dict:
    return dict(_last_sent)
