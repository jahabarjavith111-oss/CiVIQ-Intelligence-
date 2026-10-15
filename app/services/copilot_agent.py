"""Copilot agent: keyword intent + local tool answers, OpenAI-compatible LLM when configured."""
import json

import httpx
from sqlalchemy.orm import Session

from app import deps
from app.services import copilot_tools
from app.services.platform import ai_config

KEYWORDS: list[tuple[str, list[str]]] = [
    ("quantity_calculation", ["quantity", "how much concrete", "how much steel", "takeoff", "measure"]),
    ("cost_analysis", ["cost", "budget", "estimate", "price", "variance", "forecast"]),
    ("schedule_analysis", ["schedule", "gantt", "delay", "critical path", "milestone", "duration"]),
    ("risk_analysis", ["risk", "mitigation", "monte carlo", "threat"]),
    ("conflict_analysis", ["conflict", "clash", "coordination", "interference"]),
    ("revision_analysis", ["revision", "change", "diff"]),
    ("drawing_analysis", ["drawing", "plan", "ocr", "wall", "column", "door"]),
    ("model_query", ["3d", "model", "element", "floor", "bim", "ifc"]),
    ("what_if", ["what if", "scenario", "simulate", "if steel", "what-if"]),
    ("report_question", ["report", "pdf", "export"]),
    ("boq_analysis", ["boq", "rate analysis", "work package", "bill of quantities"]),
]


def detect_intent(message: str) -> tuple[str, float]:
    lower = message.lower()
    for intent, keys in KEYWORDS:
        if any(k in lower for k in keys):
            return intent, 0.85
    return "project_question", 0.5


INTENT_TOOL = {
    "quantity_calculation": "quantity_calculation", "cost_analysis": "cost_analysis",
    "schedule_analysis": "schedule_analysis", "risk_analysis": "risk_analysis",
    "conflict_analysis": "conflict_analysis", "revision_analysis": "revision_analysis",
    "drawing_analysis": "drawing_analysis", "model_query": "model_query",
    "what_if": "what_if", "report_question": "report_question",
    "boq_analysis": "boq_analysis", "project_question": "project_question",
}

_FALLBACK_TEMPLATES = {
    "quantity_calculation": "Takeoff shows **{itemCount} items** totaling **{totalQuantity}** ({trade}).",
    "cost_analysis": "Budget **{totalBudget}**, actual **{totalActual}**, forecast **{totalForecast}** ({budgetHealth}).",
    "schedule_analysis": "Progress **{overallProgress}%**, SPI **{SPI}**, variance **{varianceDays} days**.",
    "risk_analysis": "**{totalRisks} risks**, {openHighRisks} high open, {mitigationCompletionRate:.0%} mitigated.",
    "conflict_analysis": "**{total} conflicts open**, {openCritical} critical.",
    "boq_analysis": "BOQ total **{totalAmount}** across {totalItems} items.",
}


def _local_answer(intent: str, result: dict) -> str:
    tpl = _FALLBACK_TEMPLATES.get(intent)
    if tpl:
        try:
            return tpl.format(**{k: v for k, v in result.items() if not isinstance(v, (dict, list))},
                              **{k: v for k, v in result.items()})
        except Exception:
            pass
    if isinstance(result, dict):
        if "answer" in result:
            return str(result["answer"])
        bits = [f"{k}: {v}" for k, v in list(result.items())[:6] if not isinstance(v, (dict, list))]
        return "; ".join(bits) if bits else "Here is what I found in the project data."
    return str(result)


def llm_configured(db=None) -> bool:
    cfg = ai_config(db)
    return bool(cfg["base_url"] and cfg["api_key"])


def openai_tools_schema() -> list[dict]:
    return [
        {"type": "function", "function": {
            "name": d["name"], "description": d["description"],
            "parameters": {"type": "object", "properties": {k: {"type": "string"} for k in d["parameters"]}}}}
        for d in copilot_tools.TOOL_DEFS
    ]


def llm_chat(db: Session, content: str, ctx: dict, history: list[dict]) -> tuple[str, str, list[dict]]:
    """Tool-calling loop against any OpenAI-compatible endpoint. Returns (answer, intent, evidence)."""
    cfg = ai_config(db)
    url = (cfg["base_url"] or "").rstrip("/") + "/chat/completions"
    headers = {"Authorization": f"Bearer {cfg['api_key']}", "Content-Type": "application/json"}
    messages = [{"role": "system", "content": (
        "You are CivIQ Copilot, a construction intelligence assistant. "
        "Use the provided tools to retrieve live project data before answering. "
        "Always cite sources. Keep answers concise with key figures.")}]
    for m in history[-10:]:
        messages.append({"role": m.get("role", "user"), "content": m.get("content", "")})
    messages.append({"role": "user", "content": content})
    evidence: list[dict] = []
    intent, _ = detect_intent(content)
    answer = ""
    with httpx.Client(timeout=60) as client:
        for _ in range(4):
            resp = client.post(url, headers=headers, json={
                "model": cfg["model"], "messages": messages,
                "tools": openai_tools_schema(), "tool_choice": "auto",
            })
            resp.raise_for_status()
            choice = resp.json()["choices"][0]["message"]
            messages.append(choice)
            calls = choice.get("tool_calls") or []
            if not calls:
                answer = choice.get("content") or ""
                break
            for call in calls:
                name = (call.get("function") or {}).get("name", "")
                try:
                    fargs = json.loads((call.get("function") or {}).get("arguments", "{}"))
                except Exception:
                    fargs = {}
                fn = copilot_tools.TOOLS.get(name)
                if not fn:
                    out = {"result": {"error": f"unknown tool {name}"}, "evidence": []}
                else:
                    out = fn(db, fargs, {**(ctx or {}), "projectId": (ctx or {}).get("projectId")})
                evidence.extend(out.get("evidence", []))
                messages.append({"role": "tool", "tool_call_id": call.get("id", ""),
                                 "content": json.dumps(out.get("result", {}))[:4000]})
        else:
            answer = answer or "I gathered the data — see the cited sources."
    if not answer:
        answer = "I retrieved the latest project data — see the cited evidence."
    return answer, intent, evidence


def answer(db: Session, content: str, ctx: dict | None, history: list[dict]) -> tuple[str, str, list[dict]]:
    """Main entry: LLM when configured, else local keyword + live-data answer."""
    ctx = ctx or {}
    intent, _ = detect_intent(content)
    if llm_configured(db):
        try:
            return llm_chat(db, content, ctx, history)
        except Exception as exc:
            print(f"[copilot] LLM failed ({exc}); using local responder")
    tool = INTENT_TOOL.get(intent, "project_question")
    fn = copilot_tools.TOOLS[tool]
    args = dict(ctx)
    if tool == "what_if":
        args = {"projectId": ctx.get("projectId"), "scenario": ctx}
    out = fn(db, args, ctx)
    result = out.get("result", {})
    return _local_answer(intent, result), intent, out.get("evidence", [])


def answer_stream(answer_text: str, chunk: int = 60):
    """SSE-friendly chunking of a complete answer."""
    for i in range(0, len(answer_text), chunk):
        yield answer_text[i:i + chunk]
