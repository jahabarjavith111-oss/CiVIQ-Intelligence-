"""Pure-Python Monte Carlo cost/schedule simulation (no numpy needed)."""
import random

from app.deps import utcnow_iso


def _pct(sorted_vals: list[float], p: float) -> float:
    if not sorted_vals:
        return 0.0
    k = (len(sorted_vals) - 1) * p / 100.0
    lo = int(k)
    hi = min(lo + 1, len(sorted_vals) - 1)
    frac = k - lo
    return sorted_vals[lo] + (sorted_vals[hi] - sorted_vals[lo]) * frac


def run(risks: list[dict], base_cost: float, base_duration: int, runs: int = 10000, seed: int | None = None) -> dict:
    rng = random.Random(seed)
    costs: list[float] = []
    durs: list[float] = []
    for _ in range(runs):
        cost = base_cost
        dur = float(base_duration)
        for r in risks:
            p = (r.get("probability", 3) or 3) / 5.0
            impact = r.get("impact", 3) or 3
            if rng.random() < p:
                # impact 1-5 scales 0.5%..8% of base cost, 1..20 days
                cost += base_cost * (0.005 + 0.015 * impact) * rng.uniform(0.5, 1.5)
                dur += impact * rng.uniform(0.5, 4.0)
        costs.append(cost)
        durs.append(dur)
    costs.sort()
    durs.sort()
    n = len(costs)
    mean_cost = sum(costs) / n
    mean_dur = sum(durs) / n
    buckets = 20
    lo_c, hi_c = costs[0], costs[-1]
    lo_d, hi_d = durs[0], durs[-1]
    cost_dist = []
    dur_dist = []
    for i in range(buckets):
        c0 = lo_c + (hi_c - lo_c) * i / buckets
        c1 = lo_c + (hi_c - lo_c) * (i + 1) / buckets
        d0 = lo_d + (hi_d - lo_d) * i / buckets
        d1 = lo_d + (hi_d - lo_d) * (i + 1) / buckets
        cost_dist.append({"value": round((c0 + c1) / 2), "probability": round(sum(1 for v in costs if c0 <= v < c1 or (i == buckets - 1 and v == hi_c)) / n, 4)})
        dur_dist.append({"value": round((d0 + d1) / 2), "probability": round(sum(1 for v in durs if d0 <= v < d1 or (i == buckets - 1 and v == hi_d)) / n, 4)})
    return {
        "runs": runs,
        "meanCost": round(mean_cost),
        "meanDuration": round(mean_dur, 1),
        "p10Cost": round(_pct(costs, 10)), "p50Cost": round(_pct(costs, 50)), "p90Cost": round(_pct(costs, 90)),
        "p10Duration": round(_pct(durs, 10), 1), "p50Duration": round(_pct(durs, 50), 1), "p90Duration": round(_pct(durs, 90), 1),
        "costDistribution": cost_dist, "durationDistribution": dur_dist,
        "runAt": utcnow_iso(),
    }
