"""Import parsers: CSV/XLSX rows + BCF-zip conflicts + schedule XML stubs."""
import csv
import io
import zipfile
import xml.etree.ElementTree as ET


def _rows_from_csv(data: bytes) -> list[list[str]]:
    text = data.decode("utf-8-sig")
    return [r for r in csv.reader(io.StringIO(text)) if any(c.strip() for c in r)]


def _rows_from_xlsx(data: bytes) -> list[list]:
    from openpyxl import load_workbook

    wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    ws = wb.active
    return [[c.value for c in row] for row in ws.iter_rows() if any(c.value not in (None, "") for c in row)]


def tabular(data: bytes, filename: str) -> tuple[list[str], list[list]]:
    """Return (headers, rows) from csv/xlsx bytes regardless of extension."""
    name = (filename or "").lower()
    rows = _rows_from_xlsx(data) if name.endswith((".xlsx", ".xls")) else _rows_from_csv(data)
    if not rows:
        return [], []
    headers = [str(h or "").strip() for h in rows[0]]
    return headers, rows[1:]


def _col(row: list, mapping: dict[str, int], *names: str, default=""):
    for n in names:
        if n in mapping:
            v = row[mapping[n]]
            return "" if v is None else v
    return default


def _num(v, default: float = 0.0) -> float:
    try:
        return float(str(v).replace(",", "").strip() or default)
    except (ValueError, TypeError):
        return default


def takeoff_items(headers: list[str], rows: list[list], trade_default: str = "concrete") -> list[dict]:
    m = {h.lower(): i for i, h in enumerate(headers)}
    out = []
    for r in rows:
        out.append({
            "trade": str(_col(r, m, "trade", default=trade_default)),
            "category": str(_col(r, m, "category", default="General")),
            "code": str(_col(r, m, "code")),
            "description": str(_col(r, m, "description")),
            "unit": str(_col(r, m, "unit", default="m3")),
            "quantity": _num(_col(r, m, "quantity", "qty")),
            "status": "draft",
        })
    return [o for o in out if o["code"] or o["description"]]


def boq_items(headers: list[str], rows: list[list]) -> list[dict]:
    m = {h.lower(): i for i, h in enumerate(headers)}
    out = []
    for r in rows:
        out.append({
            "code": str(_col(r, m, "code")),
            "description": str(_col(r, m, "description")),
            "unit": str(_col(r, m, "unit", default="m3")),
            "quantity": _num(_col(r, m, "quantity", "qty")),
            "rate": _num(_col(r, m, "rate")),
        })
    return [o for o in out if o["code"] or o["description"]]


def risk_items(headers: list[str], rows: list[list]) -> list[dict]:
    m = {h.lower(): i for i, h in enumerate(headers)}
    out = []
    for r in rows:
        try:
            prob = max(1, min(5, int(float(_col(r, m, "probability", "p", default=3) or 3))))
        except (ValueError, TypeError):
            prob = 3
        try:
            imp = max(1, min(5, int(float(_col(r, m, "impact", "i", default=3) or 3))))
        except (ValueError, TypeError):
            imp = 3
        out.append({
            "title": str(_col(r, m, "title")),
            "description": str(_col(r, m, "description")),
            "category": str(_col(r, m, "category", default="design")),
            "probability": prob, "impact": imp,
            "status": "identified",
        })
    return [o for o in out if o["title"]]


def bcf_conflicts(data: bytes) -> list[dict]:
    """Parse BCF-zip markup.bcf files into conflict dicts."""
    out = []
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            for name in z.namelist():
                if not name.endswith("markup.bcf"):
                    continue
                try:
                    root = ET.fromstring(z.read(name))
                except ET.ParseError:
                    continue
                for topic in root.findall("Topic"):
                    out.append({
                        "title": (topic.findtext("Title") or "BCF issue").strip(),
                        "description": ((topic.findtext("Description") or "") + " " + " ".join(
                            (c.findtext("Comment") or "").strip() for c in root.findall("Comment"))).strip(),
                        "type": "coordination",
                        "severity": "medium",
                        "status": "new",
                    })
    except zipfile.BadZipFile:
        pass
    return out
