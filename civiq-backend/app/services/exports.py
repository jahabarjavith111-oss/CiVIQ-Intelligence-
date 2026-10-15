"""File export builders: CSV / XLSX / PDF bytes. Also BCF + schedule XML."""
import csv
import io


def to_csv(headers: list[str], rows: list[list]) -> bytes:
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(headers)
    w.writerows([[("" if v is None else v) for v in r] for r in rows])
    return buf.getvalue().encode("utf-8-sig")


def to_xlsx(title: str, headers: list[str], rows: list[list]) -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Font

    wb = Workbook()
    ws = wb.active
    ws.title = title[:31]
    ws.append(headers)
    for c in ws[1]:
        c.font = Font(bold=True)
    for r in rows:
        ws.append([("" if v is None else v) for v in r])
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def to_pdf(title: str, headers: list[str], rows: list[list]) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=landscape(A4))
    styles = getSampleStyleSheet()
    story = [Paragraph(title, styles["Heading1"]), Spacer(1, 12)]
    data = [headers] + [[str("" if v is None else v) for v in r] for r in rows]
    t = Table(data, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
    ]))
    story.append(t)
    doc.build(story)
    return buf.getvalue()


def build(fmt: str, title: str, headers: list[str], rows: list[list]) -> tuple[bytes, str]:
    fmt = (fmt or "csv").lower()
    if fmt == "xlsx":
        return to_xlsx(title, headers, rows), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    if fmt == "pdf":
        return to_pdf(title, headers, rows), "application/pdf"
    if fmt == "xml":
        xml = ['<?xml version="1.0" encoding="UTF-8"?>', f"<export title=\"{title}\">"]
        for r in rows:
            xml.append("  <row>" + "".join(f"<c{i}>{v if v is not None else ''}</c{i}>" for i, v in enumerate(r)) + "</row>")
        xml.append("</export>")
        return "\n".join(xml).encode(), "application/xml"
    return to_csv(headers, rows), "text/csv"


def to_bcf(conflicts: list[dict]) -> bytes:
    """Minimal BCF-zip: one markup.bcf per conflict (BCF 2.1 subset)."""
    import zipfile

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for i, c in enumerate(conflicts):
            markup = (
                '<?xml version="1.0" encoding="UTF-8"?>\n<Markup><Header>'
                f"<Filename>{c.get('title', 'conflict')}</Filename></Header>"
                f"<Topic Guid=\"{c.get('id', i)}\" TopicType=\"{c.get('type', '')}\" TopicStatus=\"{c.get('status', '')}\">"
                f"<Title>{c.get('title', '')}</Title></Topic>"
                f"<Comment Guid=\"c{i}\"><Comment>{c.get('description', '')}</Comment></Comment>"
                "</Markup>"
            )
            z.writestr(f"{c.get('id', i)}/markup.bcf", markup)
    return buf.getvalue()


def filename(base: str, fmt: str) -> str:
    safe = "".join(c if c.isalnum() or c in "-_." else "-" for c in base)
    return f"{safe}.{fmt.lower()}"
