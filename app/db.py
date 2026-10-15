"""Database engine with Postgres primary + SQLite fallback for zero-setup dev."""
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from app.config import settings


class Base(DeclarativeBase):
    pass


_engine = None
_using_fallback = False


def get_engine():
    global _engine, _using_fallback
    if _engine is None:
        url = settings.database_url
        try:
            _engine = create_engine(url, pool_pre_ping=True)
            with _engine.connect():
                pass
        except Exception as exc:
            if url.startswith("postgresql"):
                print(f"[db] Postgres unreachable ({exc}); falling back to local SQLite")
                os.makedirs("./data", exist_ok=True)
                _engine = create_engine("sqlite:///./data/civiq.db", connect_args={"check_same_thread": False})
                _using_fallback = True
            else:
                raise
    return _engine


def using_fallback() -> bool:
    get_engine()
    return _using_fallback


def get_session_local():
    return sessionmaker(bind=get_engine(), autoflush=False, autocommit=False)


def get_db():
    SessionLocal = get_session_local()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
