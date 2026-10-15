"""ORM -> frontend-shaped camelCase dicts (mirrors @/types field names)."""


def iso(dt):
    return dt.isoformat() if dt else None


def user_out(u) -> dict:
    return {"id": u.id, "email": u.email, "name": u.name, "avatar": u.avatar,
            "role": u.role, "createdAt": iso(u.created_at), "updatedAt": iso(u.updated_at)}


def project_out(p, members: list | None = None) -> dict:
    return {"id": p.id, "name": p.name, "description": p.description, "status": p.status,
            "location": p.location, "startDate": p.start_date, "endDate": p.end_date,
            "budget": p.budget, "currency": p.currency, "ownerId": p.owner_id,
            "members": members or [], "settings": p.settings or {},
            "createdAt": iso(p.created_at), "updatedAt": iso(p.updated_at)}


def member_out(m, user=None) -> dict:
    return {"userId": m.user_id, "user": user_out(user) if user else None,
            "role": m.role, "joinedAt": iso(m.joined_at)}


def drawing_out(d, analysis=None) -> dict:
    return {"id": d.id, "projectId": d.project_id, "name": d.name, "originalName": d.original_name,
            "type": d.type, "discipline": d.discipline, "version": d.version, "status": d.status,
            "fileUrl": d.file_url, "thumbnailUrl": None, "fileSize": d.file_size, "pages": d.pages,
            "metadata": None, "analysis": analysis, "uploadedBy": d.uploaded_by,
            "createdAt": iso(d.created_at), "updatedAt": iso(d.updated_at)}


def analysis_out(a) -> dict:
    return {"id": a.id, "drawingId": a.drawing_id, "status": a.status, "elements": a.elements or [],
            "ocrText": a.ocr_text or [], "confidence": a.confidence,
            "processedAt": iso(a.processed_at), "error": a.error}


def model_out(m, floors=None, elements=None, conflicts=None) -> dict:
    return {"id": m.id, "projectId": m.project_id, "name": m.name, "version": m.version,
            "fileUrl": m.file_url, "format": m.format, "fileSize": m.file_size,
            "metadata": m.meta or {}, "floors": floors or [], "elements": elements or [],
            "conflicts": conflicts or [], "createdAt": iso(m.created_at), "updatedAt": iso(m.updated_at)}


def floor_out(f) -> dict:
    return {"id": f.id, "name": f.name, "level": f.level, "elevation": f.elevation,
            "height": f.height, "modelId": f.model_id, "visible": f.visible, "elements": f.elements or []}


def element_out(e) -> dict:
    return {"id": e.id, "modelId": e.model_id, "floorId": e.floor_id, "name": e.name,
            "category": e.category, "type": e.type, "guid": e.guid, "geometry": e.geometry or {},
            "properties": e.properties or {}, "quantity": e.quantity, "cost": e.cost,
            "schedule": e.schedule, "boqItems": e.boq_items or [], "visible": e.visible, "color": e.color}


def mconflict_out(c) -> dict:
    return {"id": c.id, "modelId": c.model_id, "type": c.type, "severity": c.severity,
            "status": c.status, "elements": c.elements or [], "description": c.description,
            "location": c.location or {}, "assignedTo": c.assigned_to,
            "createdAt": iso(c.created_at), "resolvedAt": iso(c.resolved_at)}


def takeoff_out(t) -> dict:
    return {"id": t.id, "projectId": t.project_id, "trade": t.trade, "category": t.category,
            "code": t.code, "description": t.description, "unit": t.unit, "quantity": t.quantity,
            "formula": t.formula, "drawingReferences": t.drawing_refs or [],
            "modelReferences": t.model_refs or [], "notes": t.notes, "status": t.status,
            "createdBy": t.created_by, "createdAt": iso(t.created_at), "updatedAt": iso(t.updated_at)}


def workpackage_out(w, items=None, total: float = 0.0) -> dict:
    return {"id": w.id, "projectId": w.project_id, "parentId": w.parent_id, "code": w.code,
            "name": w.name, "description": w.description, "level": w.level, "order": w.order,
            "children": [], "items": items or [], "totalAmount": total, "currency": w.currency,
            "createdAt": iso(w.created_at), "updatedAt": iso(w.updated_at)}


def boq_item_out(i, takeoff_refs=None, model_refs=None, rate_analysis=None) -> dict:
    return {"id": i.id, "workPackageId": i.work_package_id, "code": i.code,
            "description": i.description, "unit": i.unit, "quantity": i.quantity, "rate": i.rate,
            "amount": i.amount, "rateAnalysis": rate_analysis,
            "takeoffReferences": takeoff_refs if takeoff_refs is not None else [],
            "modelReferences": model_refs if model_refs is not None else [],
            "status": i.status, "notes": i.notes,
            "createdAt": iso(i.created_at), "updatedAt": iso(i.updated_at)}


def rate_analysis_out(ra, components=None) -> dict:
    comps = components or []
    by_bucket: dict[str, list] = {"materials": [], "labour": [], "equipment": []}
    for c in comps:
        by_bucket.setdefault(c.bucket, []).append(
            {"id": c.id, "description": c.description, "unit": c.unit, "quantity": c.quantity,
             "unitRate": c.unit_rate, "amount": c.amount, "source": c.source, "reference": c.reference})
    return {"id": ra.id, "boqItemId": ra.boq_item_id, **by_bucket,
            "overheadPercent": ra.overhead_percent, "profitPercent": ra.profit_percent,
            "totalRate": ra.total_rate, "currency": ra.currency, "version": ra.version,
            "approvedBy": ra.approved_by, "approvedAt": iso(ra.approved_at),
            "createdAt": iso(ra.created_at), "updatedAt": iso(ra.updated_at)}


def breakdown_out(b) -> dict:
    return {"id": b.id, "projectId": b.project_id, "category": b.category, "subCategory": b.sub_category,
            "budgeted": b.budgeted, "actual": b.actual, "committed": b.committed, "forecast": b.forecast,
            "variance": b.variance, "variancePercent": b.variance_percent, "currency": b.currency,
            "period": b.period, "details": [], "updatedAt": iso(b.updated_at)}


def variance_out(v) -> dict:
    return {"id": v.id, "projectId": v.project_id, "category": v.category, "period": v.period,
            "budgeted": v.budgeted, "actual": v.actual, "variance": v.variance,
            "variancePercent": v.variance_percent, "explanation": v.explanation, "impact": v.impact,
            "status": v.status, "createdAt": iso(v.created_at), "resolvedAt": iso(v.resolved_at)}


def forecast_out(f) -> dict:
    return {"id": f.id, "projectId": f.project_id, "name": f.name, "description": f.description,
            "assumptions": f.assumptions or [], "results": f.results, "isBaseline": f.is_baseline,
            "createdBy": f.created_by, "createdAt": iso(f.created_at)}


def activity_out(a, resources=None, preds=None, succs=None, constraints=None) -> dict:
    return {"id": a.id, "projectId": a.project_id, "wbsCode": a.wbs_code, "name": a.name,
            "description": a.description, "type": a.type, "status": a.status, "progress": a.progress,
            "startDate": a.start_date, "endDate": a.end_date,
            "earlyStart": a.early_start, "earlyFinish": a.early_finish,
            "lateStart": a.late_start, "lateFinish": a.late_finish,
            "duration": a.duration, "actualStart": a.actual_start, "actualFinish": a.actual_finish,
            "remainingDuration": a.remaining_duration, "totalFloat": a.total_float,
            "freeFloat": a.free_float, "isCritical": a.is_critical, "calendarId": a.calendar_id,
            "resources": resources or [], "predecessors": preds or [], "successors": succs or [],
            "constraints": constraints or [], "notes": a.notes,
            "createdAt": iso(a.created_at), "updatedAt": iso(a.updated_at)}


def dep_out(d) -> dict:
    return {"id": d.id, "fromActivityId": d.from_activity_id, "toActivityId": d.to_activity_id,
            "type": d.type, "lag": d.lag}


def constraint_out(c) -> dict:
    return {"id": c.id, "activityId": c.activity_id, "type": c.type, "date": c.date}


def resource_out(r) -> dict:
    return {"id": r.id, "activityId": r.activity_id, "type": r.type, "name": r.name,
            "quantity": r.quantity, "unit": r.unit, "costPerUnit": r.cost_per_unit, "totalCost": r.total_cost}


def calendar_out(c) -> dict:
    return {"id": c.id, "projectId": c.project_id, "name": c.name, "isDefault": c.is_default,
            "workingDays": c.working_days or [], "workingHours": c.working_hours or [],
            "exceptions": c.exceptions or []}


def baseline_out(b) -> dict:
    return {"id": b.id, "projectId": b.project_id, "name": b.name, "description": b.description,
            "activities": b.activities or [], "projectStart": b.project_start,
            "projectFinish": b.project_finish, "totalDuration": b.total_duration,
            "isCurrent": b.is_current, "createdBy": b.created_by, "createdAt": iso(b.created_at)}


def conflict_out(c, elements=None, comments=None, attachments=None) -> dict:
    return {"id": c.id, "projectId": c.project_id, "drawingIds": c.drawing_ids or [],
            "modelId": c.model_id, "type": c.type, "severity": c.severity, "status": c.status,
            "title": c.title, "description": c.description, "location": c.location,
            "elements": elements or [], "assignedTo": c.assigned_to, "reportedBy": c.reported_by,
            "reportedAt": iso(c.reported_at), "reviewedAt": iso(c.reviewed_at),
            "resolvedAt": iso(c.resolved_at), "resolution": c.resolution,
            "attachments": attachments or [], "comments": comments or []}


def comment_out(c) -> dict:
    return {"id": c.id, "conflictId": c.conflict_id, "authorId": c.author_id,
            "authorName": c.author_name, "content": c.content, "createdAt": iso(c.created_at)}


def attachment_out(a) -> dict:
    return {"id": a.id, "conflictId": a.conflict_id, "fileName": a.file_name,
            "fileUrl": a.file_url, "type": a.type, "uploadedBy": a.uploaded_by,
            "uploadedAt": iso(a.uploaded_at)}


def revision_out(r, changes=None) -> dict:
    return {"id": r.id, "projectId": r.project_id, "fromVersion": r.from_version,
            "toVersion": r.to_version, "title": r.title, "description": r.description,
            "type": r.type, "status": r.status, "changes": changes or [], "impacts": r.impacts or {},
            "submittedBy": r.submitted_by, "submittedAt": iso(r.submitted_at),
            "reviewedBy": r.reviewed_by, "reviewedAt": iso(r.reviewed_at),
            "approvedBy": r.approved_by, "approvedAt": iso(r.approved_at),
            "implementedAt": iso(r.implemented_at)}


def risk_out(r, mitigations=None, triggers=None, related=None) -> dict:
    return {"id": r.id, "projectId": r.project_id, "code": r.code, "title": r.title,
            "description": r.description, "category": r.category, "probability": r.probability,
            "impact": r.impact, "score": r.score, "rating": r.rating, "status": r.status,
            "ownerId": r.owner_id, "ownerName": r.owner_name, "identifiedBy": r.identified_by,
            "identifiedAt": iso(r.identified_at), "assessedAt": iso(r.assessed_at),
            "mitigations": mitigations or [], "triggers": triggers or [], "relatedEntities": related or [],
            "monteCarlo": r.monte_carlo, "createdAt": iso(r.created_at), "updatedAt": iso(r.updated_at)}


def mitigation_out(m) -> dict:
    return {"id": m.id, "riskId": m.risk_id, "title": m.title, "description": m.description,
            "type": m.type, "status": m.status, "effectiveness": m.effectiveness,
            "cost": m.cost, "costCurrency": m.cost_currency, "responsibleId": m.responsible_id,
            "responsibleName": m.responsible_name, "dueDate": m.due_date,
            "completedAt": iso(m.completed_at), "residualScore": m.residual_score}


def trigger_out(t) -> dict:
    return {"id": t.id, "riskId": t.risk_id, "description": t.description,
            "indicator": t.indicator, "threshold": t.threshold, "isActive": t.is_active,
            "detectedAt": iso(t.detected_at)}


def related_out(e) -> dict:
    return {"id": e.id, "type": e.type, "entityId": e.entity_id,
            "entityName": e.entity_name, "relationship": e.relationship}


def simulation_out(s) -> dict:
    return {"id": s.id, "projectId": s.project_id, "name": s.name, "description": s.description,
            "inputs": s.inputs or {}, "results": s.results, "status": s.status,
            "createdBy": s.created_by, "createdAt": iso(s.created_at)}


def report_out(r) -> dict:
    return {"id": r.id, "projectId": r.project_id, "name": r.name, "type": r.type,
            "status": r.status, "fileUrl": r.file_url, "config": r.config or {},
            "createdBy": r.created_by, "createdAt": iso(r.created_at)}


def document_out(d) -> dict:
    return {"id": d.id, "projectId": d.project_id, "name": d.name, "type": d.type,
            "fileUrl": d.file_url, "fileSize": d.file_size, "version": d.version,
            "folder": d.folder, "uploadedBy": d.uploaded_by, "createdAt": iso(d.created_at)}


def activity_item_out(a) -> dict:
    return {"id": a.id, "projectId": a.project_id, "actorId": a.actor_id, "actorName": a.actor_name,
            "action": a.action, "entityType": a.entity_type, "entityId": a.entity_id,
            "entityName": a.entity_name, "details": a.details, "createdAt": iso(a.created_at)}


def notification_out(n) -> dict:
    return {"id": n.id, "userId": n.user_id, "projectId": n.project_id, "type": n.type,
            "title": n.title, "body": n.body, "link": n.link, "read": n.read,
            "createdAt": iso(n.created_at)}


def admin_user_out(u, project_count: int = 0) -> dict:
    return {"id": u.id, "email": u.email, "name": u.name, "avatar": u.avatar,
            "role": u.role, "isActive": bool(u.is_active), "projectCount": project_count,
            "createdAt": iso(u.created_at), "updatedAt": iso(u.updated_at)}


def audit_out(a) -> dict:
    return {"id": a.id, "actorId": a.actor_id, "actorName": a.actor_name, "actorRole": a.actor_role,
            "action": a.action, "entityType": a.entity_type, "entityId": a.entity_id,
            "meta": a.meta or {}, "createdAt": iso(a.created_at)}


def setting_out(key: str, value, updated_by=None, updated_at=None) -> dict:
    return {"key": key, "value": value, "updatedBy": updated_by, "updatedAt": iso(updated_at)}


def team_member_out(u, membership=None) -> dict:
    return {"id": u.id, "email": u.email, "name": u.name, "role": u.role,
            "projectRole": membership.role if membership else None,
            "joinedAt": iso(membership.joined_at) if membership else None,
            "lastActive": None, "createdAt": iso(u.created_at), "updatedAt": iso(u.updated_at)}


def conversation_out(c, messages=None) -> dict:
    return {"id": c.id, "projectId": c.project_id, "title": c.title,
            "messages": messages or [], "context": c.context or {},
            "createdAt": iso(c.created_at), "updatedAt": iso(c.updated_at)}


def message_out(m) -> dict:
    return {"id": m.id, "conversationId": m.conversation_id, "role": m.role, "content": m.content,
            "intent": m.intent, "toolCalls": m.tool_calls or [], "evidence": m.evidence or [],
            "verification": m.verification, "createdAt": iso(m.created_at)}
