import csv
import io
from datetime import datetime, date as date_cls
from functools import wraps
from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from sqlalchemy import or_
from extensions import db
from models import (
    User,
    RepairRequest,
    StatusHistory,
    Message,
    Technician,
    Notification,
    Service,
    Part,
    RepairPart,
    Quotation,
    QuotationItem,
    STATUS_FLOW,
)

admin_bp = Blueprint("admin", __name__)


def staff_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") not in ("admin", "technician"):
            return jsonify({"error": "Staff access only"}), 403
        return fn(*args, **kwargs)

    return wrapper


def admin_only(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        claims = get_jwt()
        if claims.get("role") != "admin":
            return jsonify({"error": "Admin access only"}), 403
        return fn(*args, **kwargs)

    return wrapper


# ---------------------------------------------------------------------------
# Dashboard & Reporting
# ---------------------------------------------------------------------------
@admin_bp.route("/stats", methods=["GET"])
@staff_required
def stats():
    new_requests = RepairRequest.query.filter_by(status="Submitted").count()
    in_progress = RepairRequest.query.filter_by(status="In Repair").count()
    ready_pickup = RepairRequest.query.filter_by(status="Quality Check & Done").count()
    pending_quotes = Quotation.query.filter_by(status="Pending").count()
    low_stock = Part.query.filter(Part.stock_qty <= Part.reorder_level).count()

    now = datetime.utcnow()
    month_repairs = RepairRequest.query.filter(
        RepairRequest.status == "Quality Check & Done",
        db.extract("month", RepairRequest.updated_at) == now.month,
        db.extract("year", RepairRequest.updated_at) == now.year,
    ).all()
    monthly_revenue = sum(float(r.estimated_cost or 0) for r in month_repairs)

    return jsonify(
        {
            "new_requests": new_requests,
            "in_progress": in_progress,
            "ready_pickup": ready_pickup,
            "monthly_revenue": monthly_revenue,
            "pending_quotes": pending_quotes,
            "low_stock_parts": low_stock,
        }
    )


def _repairs_in_range(start_str, end_str):
    query = RepairRequest.query
    if start_str:
        start = datetime.strptime(start_str, "%Y-%m-%d")
        query = query.filter(RepairRequest.submitted_at >= start)
    if end_str:
        end = datetime.strptime(end_str, "%Y-%m-%d")
        end = end.replace(hour=23, minute=59, second=59)
        query = query.filter(RepairRequest.submitted_at <= end)
    return query.order_by(RepairRequest.submitted_at.desc()).all()


@admin_bp.route("/reports", methods=["GET"])
@staff_required
def reports_summary():
    start_str = request.args.get("start")
    end_str = request.args.get("end")
    repairs = _repairs_in_range(start_str, end_str)

    completed = [r for r in repairs if r.status == "Quality Check & Done"]
    cannot_process = [r for r in repairs if r.status == "Cannot Process"]
    revenue = sum(float(r.estimated_cost or 0) for r in completed)

    by_status = {}
    for r in repairs:
        by_status[r.status] = by_status.get(r.status, 0) + 1

    by_category = {}
    for r in repairs:
        key = r.appliance_category or "Uncategorized"
        by_category[key] = by_category.get(key, 0) + 1

    return jsonify(
        {
            "range": {"start": start_str, "end": end_str},
            "total_requests": len(repairs),
            "completed": len(completed),
            "cannot_process": len(cannot_process),
            "revenue": revenue,
            "by_status": by_status,
            "by_category": by_category,
            "repairs": [r.to_summary_dict() for r in repairs],
        }
    )


@admin_bp.route("/reports/export", methods=["GET"])
@staff_required
def reports_export():
    start_str = request.args.get("start")
    end_str = request.args.get("end")
    repairs = _repairs_in_range(start_str, end_str)

    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(
        ["Order ID", "Customer", "Category", "Device", "Status", "Priority",
         "Submitted At", "Est. Completion", "Estimated Cost"]
    )
    for r in repairs:
        writer.writerow(
            [
                r.order_id,
                r.customer.full_name if r.customer else "",
                r.appliance_category or "",
                r.device_model or "",
                r.status,
                r.priority,
                r.submitted_at.strftime("%Y-%m-%d %H:%M") if r.submitted_at else "",
                r.est_completion.isoformat() if r.est_completion else "",
                float(r.estimated_cost) if r.estimated_cost else "",
            ]
        )

    filename = f"tapalla-repair-report_{start_str or 'all'}_{end_str or 'all'}.csv"
    return Response(
        buffer.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


# ---------------------------------------------------------------------------
# Repair queue
# ---------------------------------------------------------------------------
@admin_bp.route("/repairs", methods=["GET"])
@staff_required
def list_repairs():
    query = RepairRequest.query
    search = request.args.get("search")
    status = request.args.get("status")
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 10))

    if status and status != "All":
        query = query.filter(RepairRequest.status == status)

    if search:
        like = f"%{search}%"
        query = query.join(User, RepairRequest.customer_id == User.id).filter(
            or_(
                RepairRequest.order_id.ilike(like),
                RepairRequest.device_model.ilike(like),
                User.full_name.ilike(like),
            )
        )

    query = query.order_by(RepairRequest.submitted_at.desc())
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()

    return jsonify(
        {
            "total": total,
            "page": page,
            "per_page": per_page,
            "repairs": [r.to_summary_dict() for r in items],
        }
    )


@admin_bp.route("/repairs/<order_id>", methods=["GET"])
@staff_required
def repair_detail(order_id):
    repair = RepairRequest.query.filter_by(order_id=order_id).first_or_404()
    return jsonify(repair.to_detail_dict(include_internal=True))


@admin_bp.route("/repairs/<order_id>/status", methods=["PATCH"])
@staff_required
def update_status(order_id):
    repair = RepairRequest.query.filter_by(order_id=order_id).first_or_404()
    data = request.get_json() or {}
    new_status = data.get("status")
    actor = data.get("actor", "Admin")

    valid_statuses = STATUS_FLOW + ["Cannot Process"]
    if new_status not in valid_statuses:
        return jsonify({"error": f"status must be one of {valid_statuses}"}), 400

    repair.status = new_status
    if "priority" in data:
        repair.priority = data["priority"]
    if "technician_id" in data:
        repair.technician_id = data["technician_id"] or None
    if "estimated_cost" in data:
        repair.estimated_cost = data["estimated_cost"]
    if "est_completion" in data and data["est_completion"]:
        repair.est_completion = datetime.strptime(data["est_completion"], "%Y-%m-%d").date()

    db.session.add(StatusHistory(repair_id=repair.id, status=new_status, actor=actor))
    db.session.add(
        Notification(
            repair_id=repair.id,
            label=f"Status Update: {new_status}",
            delivery_status="Sent",
        )
    )
    db.session.commit()
    return jsonify(repair.to_detail_dict(include_internal=True))


@admin_bp.route("/repairs/<order_id>/notes", methods=["POST"])
@staff_required
def add_note(order_id):
    """Adds either an internal-only technician note, or a customer-visible update."""
    repair = RepairRequest.query.filter_by(order_id=order_id).first_or_404()
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}
    content = (data.get("content") or "").strip()
    visible_to_customer = bool(data.get("visible_to_customer", True))
    internal_only = bool(data.get("internal_only", False))

    if not content:
        return jsonify({"error": "content is required"}), 400

    if internal_only:
        repair.internal_notes = (
            (repair.internal_notes + "\n" if repair.internal_notes else "") + content
        )
        db.session.commit()
        return jsonify({"internal_notes": repair.internal_notes})

    message = Message(
        repair_id=repair.id,
        sender_name=user.full_name,
        sender_role=user.role,
        content=content,
        visible_to_customer=visible_to_customer,
    )
    db.session.add(message)
    db.session.commit()
    return jsonify(message.to_dict()), 201


@admin_bp.route("/technicians", methods=["GET"])
@staff_required
def list_technicians():
    techs = Technician.query.all()
    return jsonify([t.to_dict() for t in techs])


@admin_bp.route("/activity", methods=["GET"])
@staff_required
def recent_activity():
    limit = int(request.args.get("limit", 10))
    history = (
        StatusHistory.query.order_by(StatusHistory.timestamp.desc()).limit(limit).all()
    )
    return jsonify(
        [
            {
                "repair_order_id": h.repair.order_id,
                "actor": h.actor,
                "status": h.status,
                "timestamp": h.timestamp.isoformat(),
            }
            for h in history
        ]
    )


# ---------------------------------------------------------------------------
# Service Management
# ---------------------------------------------------------------------------
@admin_bp.route("/services", methods=["GET"])
@staff_required
def list_services():
    services = Service.query.order_by(Service.name).all()
    return jsonify([s.to_dict() for s in services])


@admin_bp.route("/services", methods=["POST"])
@staff_required
def create_service():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400
    service = Service(
        name=name,
        description=data.get("description", ""),
        base_price=data.get("base_price"),
        is_active=data.get("is_active", True),
    )
    db.session.add(service)
    db.session.commit()
    return jsonify(service.to_dict()), 201


@admin_bp.route("/services/<int:service_id>", methods=["PUT"])
@staff_required
def update_service(service_id):
    service = Service.query.get_or_404(service_id)
    data = request.get_json() or {}
    if "name" in data:
        service.name = data["name"]
    if "description" in data:
        service.description = data["description"]
    if "base_price" in data:
        service.base_price = data["base_price"]
    if "is_active" in data:
        service.is_active = data["is_active"]
    db.session.commit()
    return jsonify(service.to_dict())


@admin_bp.route("/services/<int:service_id>", methods=["DELETE"])
@staff_required
def delete_service(service_id):
    service = Service.query.get_or_404(service_id)
    in_use = RepairRequest.query.filter_by(service_id=service.id).first()
    if in_use:
        service.is_active = False
        db.session.commit()
        return jsonify({"message": "Service is referenced by existing repairs — deactivated instead of deleted."})
    db.session.delete(service)
    db.session.commit()
    return jsonify({"message": "Service deleted"})


# ---------------------------------------------------------------------------
# Inventory Management
# ---------------------------------------------------------------------------
@admin_bp.route("/parts", methods=["GET"])
@staff_required
def list_parts():
    parts = Part.query.order_by(Part.name).all()
    return jsonify([p.to_dict() for p in parts])


@admin_bp.route("/parts", methods=["POST"])
@staff_required
def create_part():
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400
    part = Part(
        name=name,
        sku=data.get("sku"),
        stock_qty=data.get("stock_qty", 0),
        reorder_level=data.get("reorder_level", 5),
        unit_cost=data.get("unit_cost", 0),
        unit_price=data.get("unit_price", 0),
    )
    db.session.add(part)
    db.session.commit()
    return jsonify(part.to_dict()), 201


@admin_bp.route("/parts/<int:part_id>", methods=["PUT"])
@staff_required
def update_part(part_id):
    part = Part.query.get_or_404(part_id)
    data = request.get_json() or {}
    for field in ("name", "sku", "stock_qty", "reorder_level", "unit_cost", "unit_price"):
        if field in data:
            setattr(part, field, data[field])
    db.session.commit()
    return jsonify(part.to_dict())


@admin_bp.route("/parts/<int:part_id>", methods=["DELETE"])
@staff_required
def delete_part(part_id):
    part = Part.query.get_or_404(part_id)
    db.session.delete(part)
    db.session.commit()
    return jsonify({"message": "Part deleted"})


@admin_bp.route("/repairs/<order_id>/parts", methods=["POST"])
@staff_required
def add_part_to_repair(order_id):
    """Records a part used on a job and deducts it from stock."""
    repair = RepairRequest.query.filter_by(order_id=order_id).first_or_404()
    data = request.get_json() or {}
    part_id = data.get("part_id")
    quantity = int(data.get("quantity", 1))

    part = Part.query.get_or_404(part_id)
    if part.stock_qty < quantity:
        return jsonify({"error": f"Not enough stock for {part.name} (have {part.stock_qty}, need {quantity})"}), 400

    part.stock_qty -= quantity
    repair_part = RepairPart(
        repair_id=repair.id,
        part_id=part.id,
        quantity=quantity,
        unit_price_at_use=part.unit_price,
    )
    db.session.add(repair_part)
    db.session.commit()
    return jsonify(repair_part.to_dict()), 201


@admin_bp.route("/repairs/<order_id>/parts/<int:repair_part_id>", methods=["DELETE"])
@staff_required
def remove_part_from_repair(order_id, repair_part_id):
    """Removes a part usage entry and restores the stock."""
    repair_part = RepairPart.query.get_or_404(repair_part_id)
    part = repair_part.part
    if part:
        part.stock_qty += repair_part.quantity
    db.session.delete(repair_part)
    db.session.commit()
    return jsonify({"message": "Part usage removed and stock restored"})


# ---------------------------------------------------------------------------
# Quotation Approval (staff side)
# ---------------------------------------------------------------------------
@admin_bp.route("/repairs/<order_id>/quotation", methods=["POST"])
@staff_required
def create_or_update_quotation(order_id):
    repair = RepairRequest.query.filter_by(order_id=order_id).first_or_404()
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    data = request.get_json() or {}
    items = data.get("items", [])  # [{description, amount}, ...]
    notes = data.get("notes", "")

    if not items:
        return jsonify({"error": "At least one line item is required"}), 400

    if repair.quotation:
        # Replace items on the existing quotation and reset it to Pending.
        for item in list(repair.quotation.items):
            db.session.delete(item)
        repair.quotation.notes = notes
        repair.quotation.status = "Pending"
        repair.quotation.created_by = user.full_name
        repair.quotation.decided_at = None
        quotation = repair.quotation
    else:
        quotation = Quotation(repair_id=repair.id, notes=notes, created_by=user.full_name)
        db.session.add(quotation)
        db.session.flush()

    for item in items:
        db.session.add(
            QuotationItem(
                quotation_id=quotation.id,
                description=item.get("description", ""),
                amount=item.get("amount", 0),
            )
        )

    db.session.add(
        Notification(
            repair_id=repair.id,
            label="Quotation sent for approval",
            delivery_status="Sent",
        )
    )
    db.session.commit()
    return jsonify(repair.to_detail_dict(include_internal=True)), 201
