"""Bounding-box clash engine (v1): pairwise AABB interference on model elements."""


def _overlap_1d(a0: float, a1: float, b0: float, b1: float, tol: float = 0.0) -> bool:
    return min(a1, b1) - max(a0, b0) > -tol


def boxes_clash(b1: dict, b2: dict, tol: float = 0.05) -> bool:
    try:
        mn1, mx1 = b1["min"], b1["max"]
        mn2, mx2 = b2["min"], b2["max"]
        return all(
            _overlap_1d(mn1[ax], mx1[ax], mn2[ax], mx2[ax], tol) for ax in ("x", "y", "z")
        )
    except (KeyError, TypeError):
        return False


def detect(elements: list[dict], tolerance: float = 0.05, categories: list[str] | None = None) -> list[dict]:
    """Return clash dicts for every interfering pair (different categories only)."""
    pool = [e for e in elements if not categories or e.get("category") in categories]
    out = []
    for i in range(len(pool)):
        for j in range(i + 1, len(pool)):
            a, b = pool[i], pool[j]
            if a.get("category") == b.get("category"):
                continue
            ga, gb = a.get("geometry", {}), b.get("geometry", {})
            bb1 = ga.get("bbox3D") or ga.get("bbox")
            bb2 = gb.get("bbox3D") or gb.get("bbox")
            if not bb1 or not bb2:
                continue
            if boxes_clash(bb1, bb2, tolerance):
                loc = {ax: round((bb1["min"][ax] + bb1["max"][ax]) / 2, 2) for ax in ("x", "y", "z")}
                out.append({
                    "a": a.get("id"), "b": b.get("id"),
                    "aName": a.get("name", ""), "bName": b.get("name", ""),
                    "location": loc,
                })
    return out
