import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app import models  # noqa: F401  (register metadata)
from app.config import settings
from app.db import Base, get_engine
from app.realtime.manager import redis_listener
from app.routers import (
    activity, auth, boq, coordination, copilot, cost, drawings,
    models as models_router, notifications, projects, reports, revisions, risks, schedule,
    simulations, takeoff, team, ws,
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=get_engine())
    try:
        import asyncio

        asyncio.get_event_loop().create_task(redis_listener())
    except Exception:
        pass
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)

origins = {settings.frontend_url, "http://localhost:3000", "http://127.0.0.1:3000"}
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(origins),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.local_files_dir, exist_ok=True)
app.mount("/files", StaticFiles(directory=settings.local_files_dir), name="files")


@app.get("/healthz")
def healthz():
    return {"status": "ok", "env": settings.env}


_api = [
    auth, projects, team, activity, notifications, drawings, models_router, takeoff, boq,
    cost, schedule, coordination, revisions, risks, simulations, reports, copilot,
]
for r in _api:
    app.include_router(r.router, prefix="/api")
app.include_router(ws.router)
