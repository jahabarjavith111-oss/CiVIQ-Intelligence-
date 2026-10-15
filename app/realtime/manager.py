"""WebSocket manager: in-process fan-out + Redis pub/sub when available."""
import asyncio
import json

from app.config import settings
from app.deps import utcnow_iso

_pubsub_task = None


class WSManager:
    def __init__(self):
        self.clients: set = set()
        self.subs: dict = {}

    async def connect(self, ws, channels: list[str]):
        await ws.accept()
        self.clients.add(ws)
        self.subs[ws] = channels

    def disconnect(self, ws):
        self.clients.discard(ws)
        self.subs.pop(ws, None)

    async def broadcast(self, event: dict):
        dead = []
        for ws in list(self.clients):
            channels = self.subs.get(ws, [])
            if channels and event.get("type") not in channels:
                continue
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

    def event(self, type: str, payload: dict) -> dict:
        return {"type": type, "payload": payload, "at": utcnow_iso()}


manager = WSManager()


def _redis():
    try:
        import redis

        return redis.Redis.from_url(settings.redis_url, socket_timeout=2)
    except Exception:
        return None


def publish(event: dict) -> None:
    """Best-effort: local fan-out now; Redis for other workers/processes."""
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(manager.broadcast(event))
    except RuntimeError:
        pass
    try:
        r = _redis()
        if r is not None:
            r.publish("civiq-events", json.dumps(event))
    except Exception:
        pass


async def redis_listener():
    """Worker-side: forward Redis events into local sockets."""
    try:
        import redis.asyncio as aioredis
    except Exception:
        return
    try:
        r = aioredis.from_url(settings.redis_url)
        pubsub = r.pubsub()
        await pubsub.subscribe("civiq-events")
        async for msg in pubsub.listen():
            if msg.get("type") != "message":
                continue
            try:
                await manager.broadcast(json.loads(msg["data"]))
            except Exception:
                pass
    except Exception:
        pass
