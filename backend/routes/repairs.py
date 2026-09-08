import os
import random
from datetime import datetime, date as date_cls
from werkzeug.utils import secure_filename
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    jwt_required,
    get_jwt_identity,
    verify_jwt_in_request,
)
from extensions import db
from models import (
    User,
    Service,
    RepairRequest,
    StatusHistory,
    Message,
    Photo,
    Notification,
    Quotation,
)

repairs_bp = Blueprint("repairs", __name__)

ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp"}

# --- Appointment scheduling config -----------------------------------------
SLOT_HOURS = list(range(9, 17))  # 9 AM through 4 PM start times (last slot ends 5 PM)
MAX_BOOKINGS_PER_SLOT = 3


def generate_slots():
    slots = []
    for h in SLOT_HOURS:
        start = f"{h % 12 or 12}:00 {'AM' if h < 12 else 'PM'}"
        end_h = h + 1
        end = f"{end_h % 12 or 12}:00 {'AM' if end_h < 12 else 'PM'}"
        slots.append(f"{start} - {end}")
    return slots


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def generate_order_id():
    year = datetime.utcnow().year
    for _ in range(20):
        candidate = f"TR-{random.randint(1000, 9999)}-{year}"
        if not RepairRequest.query.filter_by(order_id=candidate).first():
            return candidate
    raise RuntimeError("Could not generate a unique order id")


def get_optional_user():
    """Returns the logged-in User if a valid JWT is present, else None."""
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id:
            return User.query.get(int(user_id))
    except Exception:
        pass
    return None


# --- Public: services (Service Management feeds these) ---------------------
@repairs_bp.route("/services", methods=["GET"])
def list_active_services():
    services = Service.query.filter_by(is_active=True).order_by(Service.name).all()
    return jsonify([s.to_dict() for s in services])


# --- Public: appointment availability (Online Appointment Scheduling) ------
@repairs_bp.route("/availability", methods=["GET"])
def availability():
    date_str = request.args.get("date")
    if not date_str:
        return jsonify({"error": "date query param (YYYY-MM-DD) is required"}), 400
    try:
        target_date = datetime.strptime(date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "date must be in YYYY-MM-DD format"}), 400

    if target_date < date_cls.today():
        return jsonify({"error": "Cannot book a date in the past"}), 400

    booked = (
        db.session.query(RepairRequest.preferred_slot, db.func.count(RepairRequest.id))
        .filter(RepairRequest.preferred_date == target_date)
        .group_by(RepairRequest.preferred_slot)
        .all()
    )
    booked_map = {slot: count for slot, count in booked}

    slots = [
        {
            "slot": s,
            "capacity": MAX_BOOKINGS_PER_SLOT,
            "booked": booked_map.get(s, 0),
            "remaining": max(MAX_BOOKINGS_PER_SLOT - booked_map.get(s, 0), 0),
        }
        for s in generate_slots()
    ]
    return jsonify({"date": date_str, "slots": slots})


@repairs_bp.route("", methods=["POST"])
def create_booking():
    """Step-by-step booking wizard submits here as one payload:
    { full_name, phone, email, service_id, device_model,
      reported_issue, preferred_date, preferred_slot }
    """
    data = request.get_json() or {}

    full_name = (data.get("full_name") or "").strip()
    phone = (data.get("phone") or "").strip()
    email = (data.get("email") or "").strip().lower()
    service_id = data.get("service_id")
    device_model = (data.get("device_model") or "").strip()
    reported_issue = (data.get("reported_issue") or "").strip()
    preferred_date = data.get("preferred_date")
    preferred_slot = data.get("preferred_slot")

    if not full_name or not phone or not email:
        return jsonify({"error": "full_name, phone and email are required"}), 400
    if not service_id or not device_model:
        return jsonify({"error": "service_id and device_model are required"}), 400

    service = Service.query.get(service_id)
    if not service or not service.is_active:
        return jsonify({"error": "Selected service is not available"}), 400

    parsed_date = None
    if preferred_date:
        try:
            parsed_date = datetime.strptime(preferred_date, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "preferred_date must be in YYYY-MM-DD format"}), 400

        if preferred_slot:
            if preferred_slot not in generate_slots():
                return jsonify({"error": "Invalid time slot"}), 400
            current_count = RepairRequest.query.filter_by(
                preferred_date=parsed_date, preferred_slot=preferred_slot
            ).count()
            if current_count >= MAX_BOOKINGS_PER_SLOT:
                return jsonify({"error": "That time slot just filled up — please pick another."}), 409

    customer = get_optional_user()
    if customer is None:
        customer = User.query.filter_by(email=email).first()
        if customer is None:
            customer = User(
                full_name=full_name, email=email, phone=phone, role="customer"
            )
            db.session.add(customer)
            db.session.flush()

    repair = RepairRequest(
        order_id=generate_order_id(),
        customer_id=customer.id,
        service_id=service.id,
        appliance_category=service.name,
        device_model=device_model,
        reported_issue=reported_issue,
        status="Submitted",
        priority="Medium",
        preferred_date=parsed_date,
        preferred_slot=preferred_slot,
        estimated_cost=service.base_price,
        free_checkup_eligible=True,
    )
    db.session.add(repair)
    db.session.flush()

    db.session.add(
        StatusHistory(repair_id=repair.id, status="Submitted", actor="Customer")
    )
    db.session.add(
        Notification(
            repair_id=repair.id,
            label="Appointment Confirmation",
            delivery_status="Sent",
        )
    )
    db.session.commit()

    return jsonify(repair.to_detail_dict()), 201


@repairs_bp.route("/my", methods=["GET"])
@jwt_required()
def my_repairs():
    user_id = int(get_jwt_identity())
    repairs = (
        RepairRequest.query.filter_by(customer_id=user_id)
        .order_by(RepairRequest.submitted_at.desc())
        .all()
    )
    active = sum(1 for r in repairs if r.status not in ("Quality Check & Done", "Cannot Process"))
    done = sum(1 for r in repairs if r.status == "Quality Check & Done")
    review = sum(1 for r in repairs if r.status == "Under Review")
    pending_quotes = sum(1 for r in repairs if r.quotation and r.quotation.status == "Pending")
    return jsonify(
        {
            "counts": {
                "active": active,
                "completed": done,
                "under_review": review,
                "pending_quotes": pending_quotes,
            },
            "repairs": [r.to_summary_dict() for r in repairs],
        }
    )


@repairs_bp.route("/<order_id>", methods=["GET"])
@jwt_required()
def get_repair(order_id):
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    repair = RepairRequest.query.filter_by(order_id=order_id).first_or_404()

    if user.role == "customer" and repair.customer_id != user.id:
        return jsonify({"error": "Not authorized to view this repair"}), 403

    include_internal = user.role in ("admin", "technician")
    return jsonify(repair.to_detail_dict(include_internal=include_internal))


@repairs_bp.route("/<order_id>/photos", methods=["POST"])
@jwt_required()
def upload_photo(order_id):
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    repair = RepairRequest.query.filter_by(order_id=order_id).first_or_404()

    if user.role == "customer" and repair.customer_id != user.id:
        return jsonify({"error": "Not authorized"}), 403

    if "file" not in request.files:
        return jsonify({"error": "No file part"}), 400
    file = request.files["file"]
    if file.filename == "" or not allowed_file(file.filename):
        return jsonify({"error": "Invalid or missing file"}), 400

    os.makedirs(current_app.config["UPLOAD_FOLDER"], exist_ok=True)
    filename = secure_filename(f"{repair.order_id}_{int(datetime.utcnow().timestamp())}_{file.filename}")
    file.save(os.path.join(current_app.config["UPLOAD_FOLDER"], filename))

    photo = Photo(repair_id=repair.id, filename=filename, uploaded_by_role=user.role)
    db.session.add(photo)
    db.session.commit()

    return jsonify(photo.to_dict()), 201


# --- Quotation Approval (customer side) -------------------------------------
@repairs_bp.route("/<order_id>/quotation", methods=["PATCH"])
@jwt_required()
def decide_quotation(order_id):
    user_id = int(get_jwt_identity())
    user = User.query.get_or_404(user_id)
    repair = RepairRequest.query.filter_by(order_id=order_id).first_or_404()

    if user.role == "customer" and repair.customer_id != user.id:
        return jsonify({"error": "Not authorized"}), 403

    if not repair.quotation:
        return jsonify({"error": "No quotation exists for this repair yet"}), 404

    data = request.get_json() or {}
    decision = data.get("decision")  # "Approved" | "Declined"
    if decision not in ("Approved", "Declined"):
        return jsonify({"error": "decision must be 'Approved' or 'Declined'"}), 400

    repair.quotation.status = decision
    repair.quotation.decided_at = datetime.utcnow()

    db.session.add(
        StatusHistory(
            repair_id=repair.id,
            status=f"Quotation {decision}",
            actor=user.full_name,
        )
    )
    db.session.add(
        Notification(
            repair_id=repair.id,
            label=f"Quotation {decision} by customer",
            delivery_status="Sent",
        )
    )
    if decision == "Approved" and repair.status == "Under Review":
        repair.status = "Approved & Scheduled"
        db.session.add(
            StatusHistory(repair_id=repair.id, status="Approved & Scheduled", actor="Customer (via quote approval)")
        )

    db.session.commit()
    return jsonify(repair.to_detail_dict())
