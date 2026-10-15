import json

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app import deps, serializers as S
from app.db import get_db
from app.models.copilot import Conversation, Message
from app.models.user import User
from app.schemas import copilot as sch
from app.services import copilot_agent, copilot_tools
from app.services.activity import log

router = APIRouter(prefix="/copilot", tags=["copilot"])


def _conv_out(db: Session, c: Conversation) -> dict:
    msgs = db.query(Message).filter(Message.conversation_id == c.id).order_by(Message.created_at).all()
    return S.conversation_out(c, [S.message_out(m) for m in msgs])


def _scope(db: Session, cid: str, user: User) -> Conversation:
    c = deps.get_or_404(db, Conversation, cid, "Conversation")
    if c.project_id:
        deps.require_project_member(db, c.project_id, user)
    elif c.created_by != user.id and user.role not in ("admin",):
        raise HTTPException(status_code=403, detail="Forbidden")
    return c


@router.post("/conversations", status_code=201)
def create_conversation(body: sch.ConversationCreate, user: User = Depends(deps.get_current_user),
                        db: Session = Depends(get_db)):
    if body.project_id:
        deps.require_project_member(db, body.project_id, user)
    c = Conversation(id=deps.uid(), project_id=body.project_id, title=body.title or "New conversation",
                     context={"projectId": body.project_id} if body.project_id else {}, created_by=user.id)
    db.add(c)
    db.commit()
    return _conv_out(db, c)


@router.get("/conversations")
def list_conversations(project_id: str | None = Query(default=None, alias="projectId"),
                       user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    q = db.query(Conversation).filter(Conversation.created_by == user.id)
    if project_id:
        q = q.filter(Conversation.project_id == project_id)
    return [_conv_out(db, c) for c in q.order_by(Conversation.updated_at.desc()).limit(50).all()]


@router.get("/conversations/{cid}")
def get_conversation(cid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    return _conv_out(db, _scope(db, cid, user))


@router.delete("/conversations/{cid}")
def delete_conversation(cid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    c = _scope(db, cid, user)
    db.query(Message).filter(Message.conversation_id == cid).delete()
    db.delete(c)
    db.commit()
    return {"ok": True}


def _append_user(db: Session, c: Conversation, content: str) -> Message:
    m = Message(id=deps.uid(), conversation_id=c.id, role="user", content=content)
    db.add(m)
    db.flush()
    return m


def _append_assistant(db: Session, c: Conversation, answer: str, intent: str, evidence: list) -> Message:
    m = Message(id=deps.uid(), conversation_id=c.id, role="assistant", content=answer,
                intent=intent, evidence=evidence or [], verification="verified")
    db.add(m)
    c.title = (c.title if c.title != "New conversation" else (answer[:48] if answer else c.title))
    db.commit()
    return m


@router.post("/conversations/{cid}/messages")
def send_message(cid: str, body: sch.MessageIn, user: User = Depends(deps.get_current_user),
                 db: Session = Depends(get_db)):
    c = _scope(db, cid, user)
    ctx = dict(c.context or {})
    if body.context:
        ctx.update(body.context)
    _append_user(db, c, body.content)
    history = [{"role": m.role, "content": m.content}
               for m in db.query(Message).filter(Message.conversation_id == cid).order_by(Message.created_at).all()[-12:]]
    answer, intent, evidence = copilot_agent.answer(db, body.content, ctx, history)
    m = _append_assistant(db, c, answer, intent, evidence)
    log(db, c.project_id or "", user, "asked copilot", "project", c.id, body.content[:80])
    out = S.message_out(m)
    return {"message": out}


@router.post("/conversations/{cid}/messages/stream")
def send_stream(cid: str, body: sch.MessageIn, user: User = Depends(deps.get_current_user),
                db: Session = Depends(get_db)):
    c = _scope(db, cid, user)
    ctx = dict(c.context or {})
    if body.context:
        ctx.update(body.context)
    _append_user(db, c, body.content)
    history = [{"role": m.role, "content": m.content}
               for m in db.query(Message).filter(Message.conversation_id == cid).order_by(Message.created_at).all()[-12:]]
    answer, intent, evidence = copilot_agent.answer(db, body.content, ctx, history)
    m = _append_assistant(db, c, answer, intent, evidence)
    # serialize now: the DB session closes before the stream body runs
    mid, snapshot = m.id, S.message_out(m)

    def gen():
        for chunk in copilot_agent.answer_stream(answer):
            yield f"data: {json.dumps({'delta': chunk, 'messageId': mid})}\n\n"
        yield f"data: {json.dumps({'done': True, 'message': snapshot})}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")


@router.post("/intent")
def detect(body: sch.IntentIn, user: User = Depends(deps.get_current_user)):
    intent, conf = copilot_agent.detect_intent(body.message)
    return {"intent": intent, "confidence": conf, "entities": {}}


@router.post("/tools/execute")
def execute_tool(body: dict, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    name = body.get("name", "")
    fn = copilot_tools.TOOLS.get(name)
    if not fn:
        raise HTTPException(status_code=404, detail=f"Unknown tool {name}")
    try:
        out = fn(db, body.get("arguments", {}) or {}, {})
        return {"result": out.get("result"), "success": True}
    except Exception as exc:
        return {"result": None, "success": False, "error": str(exc)}


@router.get("/messages/{mid}/evidence")
def get_evidence(mid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    m = deps.get_or_404(db, Message, mid, "Message")
    _scope(db, m.conversation_id, user)
    return m.evidence or []


@router.post("/messages/{mid}/verify")
def verify(mid: str, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    m = deps.get_or_404(db, Message, mid, "Message")
    _scope(db, m.conversation_id, user)
    has_evidence = bool(m.evidence)
    m.verification = "verified" if has_evidence else "partially-verified"
    db.commit()
    return {"status": m.verification, "details": f"{len(m.evidence or [])} sources cited"}


@router.get("/tools")
def list_tools(user: User = Depends(deps.get_current_user)):
    return copilot_tools.TOOL_DEFS


@router.patch("/conversations/{cid}/context")
def update_context(cid: str, body: sch.ContextUpdate, user: User = Depends(deps.get_current_user),
                   db: Session = Depends(get_db)):
    c = _scope(db, cid, user)
    c.context = dict(body.context or {})
    db.commit()
    return _conv_out(db, c)


@router.get("/conversations/{cid}/export")
def export_conversation(cid: str, format: str = "json", user: User = Depends(deps.get_current_user),
                        db: Session = Depends(get_db)):
    from fastapi.responses import PlainTextResponse

    from app.services.exports import build as build_export

    c = _scope(db, cid, user)
    msgs = db.query(Message).filter(Message.conversation_id == cid).order_by(Message.created_at).all()
    if format == "json":
        import json as _json

        return PlainTextResponse(_json.dumps([S.message_out(m) for m in msgs], indent=2), media_type="application/json",
                                 headers={"Content-Disposition": f'attachment; filename="conversation-{cid}.json"'})
    if format == "markdown":
        md = f"# {c.title}\n\n" + "\n\n".join(f"**{m.role}**: {m.content}" for m in msgs)
        return PlainTextResponse(md, media_type="text/markdown",
                                 headers={"Content-Disposition": f'attachment; filename="conversation-{cid}.md"'})
    rows = [[m.role, m.content[:300], m.created_at.isoformat() if m.created_at else ""] for m in msgs]
    data, ctype = build_export("pdf", f"conversation-{c.title}", ["role", "content", "at"], rows)
    from fastapi import Response as _Response

    return _Response(content=data, media_type=ctype,
                     headers={"Content-Disposition": f'attachment; filename="conversation-{cid}.pdf"'})


@router.post("/messages/{mid}/rating")
def rate(mid: str, body: sch.RatingIn, user: User = Depends(deps.get_current_user), db: Session = Depends(get_db)):
    m = deps.get_or_404(db, Message, mid, "Message")
    _scope(db, m.conversation_id, user)
    m.rating = body.rating
    m.feedback = body.feedback
    db.commit()
    return {"ok": True}
