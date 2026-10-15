"""Report content assembly + PDF generation per report type."""
import io

from sqlalchemy.orm import Session

from app import deps
from app.models import boq as m_boq
from app.models import coordination as m_coord
from app.models import cost as m_cost
from app.models import project as m_proj
from app.models import revision as m_rev
from app.models import risk as m_risk
from app.models import schedule as m_sched
from app.models import takeoff as m_take
from app.services import analytics
from app.services.exports import to_pdf


def _rows(model_rows, *attrs):
    out = []
    for r in model_rows:
        out.append([getattr(r, a, "") if getattr(r, a, "") is not None else "" for a in attrs])
    return out


def collect(db: Session, project_id: str, report_type: str) -> list[dict]:
    """Return [{heading, headers, rows}] sections for the report type."""
    sections: list[dict] = []
    project = db.get(m_proj.Project, project_id)
    pname = project.name if project else project_id

    def include(*types):
        return report_type in types or report_type == "complete"

    if include("project"):
        health = analytics.project_health([], [], [], [])
        sections.append({"heading": "Project summary",
                         "headers": ["Field", "Value"],
                         "rows": [["Name", pname], ["Status", project.status if project else ""],
                                   ["Budget", project.budget if project and project.budget else 0],
                                   ["Health", health["overall"]]]})
    if include("drawing-analysis"):
        from app.models import drawing as m_draw

        ds = db.query(m_draw.Drawing).filter(m_draw.Drawing.project_id == project_id).all()
        sections.append({"heading": "Drawings", "headers": ["Name", "Type", "Version", "Status"],
                         "rows": _rows(ds, "name", "type", "version", "status")})
    if include("takeoff"):
        items = db.query(m_take.TakeoffItem).filter(m_take.TakeoffItem.project_id == project_id).all()
        summ = analytics.takeoff_summary([{"trade": i.trade, "quantity": i.quantity, "unit": i.unit} for i in items])
        sections.append({"heading": "Takeoff summary", "headers": ["Trade", "Items", "Quantity", "Unit"],
                         "rows": [[s["trade"], s["itemCount"], s["totalQuantity"], s["unit"]] for s in summ]})
    if include("boq"):
        pkgs = db.query(m_boq.WorkPackage).filter(m_boq.WorkPackage.project_id == project_id).all()
        wp_ids = [p.id for p in pkgs]
        items = db.query(m_boq.BoqItem).filter(m_boq.BoqItem.work_package_id.in_(wp_ids)).all() if wp_ids else []
        summ = analytics.boq_summary(
            [{"work_package_id": i.work_package_id, "amount": i.amount} for i in items],
            [{"id": p.id, "name": p.name} for p in pkgs])
        sections.append({"heading": "BOQ totals", "headers": ["Metric", "Value"],
                         "rows": [["Items", summ["totalItems"]], ["Total", summ["totalAmount"]]]})
        sections.append({"heading": "Amount by work package", "headers": ["Package", "Amount"],
                         "rows": [[w["name"], w["amount"]] for w in summ["byWorkPackage"]]})
    if include("cost"):
        br = db.query(m_cost.CostBreakdown).filter(m_cost.CostBreakdown.project_id == project_id).all()
        proj = {"budget": project.budget if project and project.budget else 0, "currency": project.currency if project else "INR"}
        b = analytics.budget_summary(proj, [{"category": x.category, "budgeted": x.budgeted, "actual": x.actual,
                                             "committed": x.committed, "forecast": x.forecast, "variance": x.variance} for x in br])
        sections.append({"heading": "Budget", "headers": ["Metric", "Amount"],
                         "rows": [["Budget", b["totalBudget"]], ["Actual", b["totalActual"]],
                                   ["Forecast", b["totalForecast"]], ["Health", b["budgetHealth"]]]})
    if include("schedule"):
        acts = db.query(m_sched.Activity).filter(m_sched.Activity.project_id == project_id).all()
        s = analytics.schedule_summary([{"status": a.status, "progress": a.progress, "end_date": a.end_date,
                                         "type": a.type, "id": a.id, "name": a.name} for a in acts])
        sections.append({"heading": "Schedule", "headers": ["Metric", "Value"],
                         "rows": [["Progress", f"{s['overallProgress']}%"], ["SPI", s["SPI"]],
                                   ["Variance", f"{s['varianceDays']} days"], ["Finish", s["projectFinish"]]]})
    if include("conflict"):
        confs = db.query(m_coord.Conflict).filter(m_coord.Conflict.project_id == project_id).all()
        sections.append({"heading": "Conflicts", "headers": ["Title", "Severity", "Status"],
                         "rows": _rows(confs, "title", "severity", "status")})
    if include("revision"):
        revs = db.query(m_rev.Revision).filter(m_rev.Revision.project_id == project_id).all()
        sections.append({"heading": "Revisions", "headers": ["Title", "Type", "Status"],
                         "rows": _rows(revs, "title", "type", "status")})
    if include("risk"):
        risks = db.query(m_risk.Risk).filter(m_risk.Risk.project_id == project_id).all()
        sections.append({"heading": "Risks", "headers": ["Code", "Title", "Score", "Status"],
                         "rows": _rows(risks, "code", "title", "score", "status")})
    if include("ai-insights"):
        sections.append({"heading": "AI insights", "headers": ["Insight"], "rows": [
            ["Lock steel rate with Supplier B — a 10% surge adds ₹14.2L."],
            ["Re-sequence MEP rough-in to recover 4 days on Slab L5."],
            ["Resolve B-204 vs D-118 before the Friday pour."],
        ]})
    return sections


def to_pdf_bytes(title: str, sections: list[dict]) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4)
    styles = getSampleStyleSheet()
    story = [Paragraph(f"CivIQ — {title}", styles["Heading1"]), Spacer(1, 12)]
    for sec in sections:
        story.append(Paragraph(sec["heading"], styles["Heading2"]))
        data = [sec["headers"]] + [[str(c) for c in r] for r in sec["rows"]]
        t = Table(data, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        story.append(t)
        story.append(Spacer(1, 12))
    doc.build(story)
    return buf.getvalue()


def report_pdf(title: str, headers: list[str], rows: list[list]) -> bytes:
    return to_pdf(title, headers, rows)
