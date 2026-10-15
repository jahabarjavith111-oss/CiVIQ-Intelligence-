"""Critical Path Method: forward/backward pass over activities + dependencies."""
from datetime import date


def _d(s: str) -> date:
    return date.fromisoformat(s[:10])


def calculate(activities: list[dict], dependencies: list[dict]) -> dict:
    """Mutates copies: sets early/late dates, floats, is_critical. Returns {critical_path, activities}."""
    acts = {a["id"]: dict(a) for a in activities}
    preds: dict[str, list[dict]] = {aid: [] for aid in acts}
    succs: dict[str, list[dict]] = {aid: [] for aid in acts}
    for d in dependencies:
        if d["from_activity_id"] in acts and d["to_activity_id"] in acts:
            preds[d["to_activity_id"]].append(d)
            succs[d["from_activity_id"]].append(d)

    # topological order (Kahn), fallback to insertion order on cycles
    indeg = {aid: len(preds[aid]) for aid in acts}
    queue = [aid for aid, n in indeg.items() if n == 0]
    order: list[str] = []
    while queue:
        aid = queue.pop(0)
        order.append(aid)
        for d in succs[aid]:
            indeg[d["to_activity_id"]] -= 1
            if indeg[d["to_activity_id"]] == 0:
                queue.append(d["to_activity_id"])
    for aid in acts:
        if aid not in order:
            order.append(aid)

    for aid in order:
        a = acts[aid]
        es = _d(a["start_date"])
        for d in preds[aid]:
            p = acts[d["from_activity_id"]]
            lag = d.get("lag", 0) or 0
            t = d.get("type", "FS")
            p_end = _d(p.get("early_finish") or p["end_date"])
            p_start = _d(p.get("early_start") or p["start_date"])
            if t == "FS":
                cand = date.fromordinal(p_end.toordinal() + lag)
            elif t == "SS":
                cand = date.fromordinal(p_start.toordinal() + lag)
            elif t == "FF":
                cand = date.fromordinal(p_end.toordinal() + lag - (a.get("duration", 0) or 0))
            else:  # SF
                cand = date.fromordinal(p_start.toordinal() + lag - (a.get("duration", 0) or 0))
            if cand > es:
                es = cand
        dur = a.get("duration", 0) or 0
        ef = date.fromordinal(es.toordinal() + max(dur - 1, 0))
        a["early_start"] = es.isoformat()
        a["early_finish"] = ef.isoformat()

    project_finish = max(_d(a["early_finish"]) for a in acts.values())
    for aid in reversed(order):
        a = acts[aid]
        lf = project_finish
        for d in succs[aid]:
            s = acts[d["to_activity_id"]]
            lag = d.get("lag", 0) or 0
            t = d.get("type", "FS")
            s_start = _d(s.get("late_start") or s.get("early_start") or s["start_date"])
            s_finish = _d(s.get("late_finish") or s.get("early_finish") or s["end_date"])
            if t in ("FS", "FF"):
                cand = date.fromordinal(s_start.toordinal() - lag)
            else:
                cand = date.fromordinal(s_finish.toordinal() - lag)
            if cand < lf:
                lf = cand
        dur = a.get("duration", 0) or 0
        ls = date.fromordinal(lf.toordinal() - max(dur - 1, 0))
        a["late_finish"] = lf.isoformat()
        a["late_start"] = ls.isoformat()
        tf = (lf - _d(a["early_finish"])).days
        a["total_float"] = float(tf)
        a["free_float"] = float(tf)
        a["is_critical"] = tf <= 0

    crit = [aid for aid in order if acts[aid]["is_critical"]]
    total_dur = max((a.get("duration", 0) or 0) for a in acts.values()) if acts else 0
    return {
        "critical_path": {"activities": crit, "totalDuration": sum(acts[c].get("duration", 0) or 0 for c in crit), "projectFinish": project_finish.isoformat()},
        "activities": [acts[aid] for aid in order],
        "total_duration": total_dur,
    }
