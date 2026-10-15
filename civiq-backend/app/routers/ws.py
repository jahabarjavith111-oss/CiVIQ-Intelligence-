"""WebSocket gateway at /ws — subscribe handshake + WsEvent broadcast."""
import json

from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from app import deps, security
from app.db import get_db
from app.models.user import User
from app.realtime.manager import manager

router = APIRouter(tags=["ws"])


@router.websocket("/ws")
async def gateway(ws: WebSocket, token: str | None = None):
    user: User | None = None
    if token:
        try:
            payload = security.decode_access_token(token)
            db_gen = get_db()
            db: Session = next(db_gen)
            try:
                user = db.get(User, payload.get("sub"))
            finally:
                try:
                    next(db_gen)
                except StopIteration:
                    pass
        except Exception:
            user = None
    await ws.accept()
    channels: list[str] = []
    try:
        # handshake: {"subscribe": ["activity", "project:<id>", ...]}
        raw = await ws.receive_text()
        try:
            msg = json.loads(raw)
            if isinstance(msg.get("subscribe"), list):
                channels = [str(c) for c in msg["subscribe"]]
        except Exception:
            pass
        manager.clients.add(ws)
        manager.subs[ws] = channels
        await ws.send_json(manager.event("copilot", {"status": "ready",
                                                     "user": user.name if user else "guest"}))
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(ws)
