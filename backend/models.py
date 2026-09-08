from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db


class User(db.Model):
    """Covers customers, admins and technicians (see `role`)."""

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    phone = db.Column(db.String(30))
    password_hash = db.Column(db.String(255), nullable=True)  # null for guest bookings
    role = db.Column(db.String(20), nullable=False, default="customer")  # customer | admin | technician
    address = db.Column(db.String(255))
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    repairs = db.relationship(
        "RepairRequest",
        back_populates="customer",
        foreign_keys="RepairRequest.customer_id",
    )
    assigned_repairs = db.relationship(
        "RepairRequest",
        back_populates="technician",
        foreign_keys="RepairRequest.technician_id",
    )

    def set_password(self, raw_password):
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password):
        if not self.password_hash:
            return False
        return check_password_hash(self.password_hash, raw_password)

    def to_dict(self):
        return {
            "id": self.id,
            "full_name": self.full_name,
            "email": self.email,
            "phone": self.phone,
            "role": self.role,
            "address": self.address,
            "customer_since": self.created_at.strftime("%b %Y") if self.created_at else None,
        }


class Technician(db.Model):
    """Extra profile info for staff with role='technician' or 'admin'."""

    __tablename__ = "technicians"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    title = db.Column(db.String(60), default="Technician")  # Technician | Admin
    capacity_percent = db.Column(db.Integer, default=0)

    user = db.relationship("User")

    def to_dict(self):
        active_jobs = RepairRequest.query.filter(
            RepairRequest.technician_id == self.user_id,
            RepairRequest.status.notin_(["Quality Check & Done", "Cannot Process"]),
        ).count()
        return {
            "id": self.id,
            "user_id": self.user_id,
            "name": self.user.full_name,
            "title": self.title,
            "active_jobs": active_jobs,
            "capacity_percent": self.capacity_percent,
        }


STATUS_FLOW = [
    "Submitted",
    "Under Review",
    "Approved & Scheduled",
    "In Repair",
    "Quality Check & Done",
]


# ---------------------------------------------------------------------------
# Service Management
# ---------------------------------------------------------------------------
class Service(db.Model):
    """A repair service the shop offers (feeds the public site + booking wizard)."""

    __tablename__ = "services"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)  # e.g. "TV & Entertainment"
    description = db.Column(db.Text)
    base_price = db.Column(db.Numeric(10, 2), nullable=True)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "base_price": float(self.base_price) if self.base_price is not None else None,
            "is_active": self.is_active,
        }


# ---------------------------------------------------------------------------
# Inventory Management
# ---------------------------------------------------------------------------
class Part(db.Model):
    __tablename__ = "parts"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    sku = db.Column(db.String(60), unique=True)
    stock_qty = db.Column(db.Integer, default=0)
    reorder_level = db.Column(db.Integer, default=5)
    unit_cost = db.Column(db.Numeric(10, 2), default=0)
    unit_price = db.Column(db.Numeric(10, 2), default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "sku": self.sku,
            "stock_qty": self.stock_qty,
            "reorder_level": self.reorder_level,
            "unit_cost": float(self.unit_cost) if self.unit_cost is not None else 0,
            "unit_price": float(self.unit_price) if self.unit_price is not None else 0,
            "low_stock": self.stock_qty <= self.reorder_level,
        }


class RepairPart(db.Model):
    """A part used on a specific repair job (deducts stock, feeds the quote)."""

    __tablename__ = "repair_parts"

    id = db.Column(db.Integer, primary_key=True)
    repair_id = db.Column(db.Integer, db.ForeignKey("repair_requests.id"), nullable=False)
    part_id = db.Column(db.Integer, db.ForeignKey("parts.id"), nullable=False)
    quantity = db.Column(db.Integer, default=1)
    unit_price_at_use = db.Column(db.Numeric(10, 2), default=0)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    repair = db.relationship("RepairRequest", back_populates="parts_used")
    part = db.relationship("Part")

    def to_dict(self):
        return {
            "id": self.id,
            "part_id": self.part_id,
            "part_name": self.part.name if self.part else None,
            "quantity": self.quantity,
            "unit_price": float(self.unit_price_at_use) if self.unit_price_at_use is not None else 0,
            "line_total": float(self.unit_price_at_use or 0) * self.quantity,
        }


# ---------------------------------------------------------------------------
# Quotation Approval
# ---------------------------------------------------------------------------
class Quotation(db.Model):
    __tablename__ = "quotations"

    id = db.Column(db.Integer, primary_key=True)
    repair_id = db.Column(db.Integer, db.ForeignKey("repair_requests.id"), unique=True, nullable=False)
    status = db.Column(db.String(20), default="Pending")  # Pending | Approved | Declined
    notes = db.Column(db.Text)
    created_by = db.Column(db.String(120))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    decided_at = db.Column(db.DateTime, nullable=True)

    repair = db.relationship("RepairRequest", back_populates="quotation")
    items = db.relationship(
        "QuotationItem", back_populates="quotation", cascade="all, delete-orphan"
    )

    @property
    def total_amount(self):
        return sum(float(i.amount or 0) for i in self.items)

    def to_dict(self):
        return {
            "id": self.id,
            "status": self.status,
            "notes": self.notes,
            "created_by": self.created_by,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "decided_at": self.decided_at.isoformat() if self.decided_at else None,
            "total_amount": self.total_amount,
            "items": [i.to_dict() for i in self.items],
        }


class QuotationItem(db.Model):
    __tablename__ = "quotation_items"

    id = db.Column(db.Integer, primary_key=True)
    quotation_id = db.Column(db.Integer, db.ForeignKey("quotations.id"), nullable=False)
    description = db.Column(db.String(255), nullable=False)
    amount = db.Column(db.Numeric(10, 2), default=0)

    quotation = db.relationship("Quotation", back_populates="items")

    def to_dict(self):
        return {
            "id": self.id,
            "description": self.description,
            "amount": float(self.amount) if self.amount is not None else 0,
        }


# ---------------------------------------------------------------------------
# Repair request
# ---------------------------------------------------------------------------
class RepairRequest(db.Model):
    __tablename__ = "repair_requests"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.String(20), unique=True, nullable=False, index=True)  # e.g. TR-8842-2024

    customer_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    technician_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    service_id = db.Column(db.Integer, db.ForeignKey("services.id"), nullable=True)

    appliance_category = db.Column(db.String(60))  # denormalized copy of service.name at booking time
    device_model = db.Column(db.String(150))
    reported_issue = db.Column(db.Text)

    status = db.Column(db.String(30), default="Submitted")
    priority = db.Column(db.String(10), default="Medium")  # Low | Medium | High

    preferred_date = db.Column(db.Date, nullable=True)
    preferred_slot = db.Column(db.String(30), nullable=True)  # e.g. "09:00 AM - 10:00 AM"
    est_completion = db.Column(db.Date, nullable=True)
    estimated_cost = db.Column(db.Numeric(10, 2), nullable=True)
    free_checkup_eligible = db.Column(db.Boolean, default=False)

    internal_notes = db.Column(db.Text)  # not visible to customer

    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = db.relationship("User", back_populates="repairs", foreign_keys=[customer_id])
    technician = db.relationship("User", back_populates="assigned_repairs", foreign_keys=[technician_id])
    service = db.relationship("Service")
    status_history = db.relationship(
        "StatusHistory", back_populates="repair", cascade="all, delete-orphan",
        order_by="StatusHistory.timestamp",
    )
    messages = db.relationship(
        "Message", back_populates="repair", cascade="all, delete-orphan",
        order_by="Message.timestamp",
    )
    photos = db.relationship(
        "Photo", back_populates="repair", cascade="all, delete-orphan",
        order_by="Photo.timestamp",
    )
    notifications = db.relationship(
        "Notification", back_populates="repair", cascade="all, delete-orphan",
        order_by="Notification.timestamp",
    )
    quotation = db.relationship(
        "Quotation", back_populates="repair", uselist=False, cascade="all, delete-orphan"
    )
    parts_used = db.relationship(
        "RepairPart", back_populates="repair", cascade="all, delete-orphan"
    )

    def to_summary_dict(self):
        return {
            "order_id": self.order_id,
            "appliance_category": self.appliance_category,
            "device_model": self.device_model,
            "status": self.status,
            "priority": self.priority,
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
            "preferred_date": self.preferred_date.isoformat() if self.preferred_date else None,
            "preferred_slot": self.preferred_slot,
            "est_completion": self.est_completion.isoformat() if self.est_completion else None,
            "customer_name": self.customer.full_name if self.customer else None,
            "quotation_status": self.quotation.status if self.quotation else None,
        }

    def to_detail_dict(self, include_internal=False):
        data = {
            "order_id": self.order_id,
            "appliance_category": self.appliance_category,
            "service": self.service.to_dict() if self.service else None,
            "device_model": self.device_model,
            "reported_issue": self.reported_issue,
            "status": self.status,
            "priority": self.priority,
            "preferred_date": self.preferred_date.isoformat() if self.preferred_date else None,
            "preferred_slot": self.preferred_slot,
            "est_completion": self.est_completion.isoformat() if self.est_completion else None,
            "free_checkup_eligible": self.free_checkup_eligible,
            "submitted_at": self.submitted_at.isoformat() if self.submitted_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "customer": self.customer.to_dict() if self.customer else None,
            "technician": self.technician.to_dict() if self.technician else None,
            "status_history": [s.to_dict() for s in self.status_history],
            "messages": [m.to_dict() for m in self.messages if include_internal or m.visible_to_customer],
            "photos": [p.to_dict() for p in self.photos],
            "quotation": self.quotation.to_dict() if self.quotation else None,
        }
        if include_internal:
            data["internal_notes"] = self.internal_notes
            data["estimated_cost"] = float(self.estimated_cost) if self.estimated_cost else None
            data["notifications"] = [n.to_dict() for n in self.notifications]
            data["parts_used"] = [p.to_dict() for p in self.parts_used]
        return data


class StatusHistory(db.Model):
    __tablename__ = "status_history"

    id = db.Column(db.Integer, primary_key=True)
    repair_id = db.Column(db.Integer, db.ForeignKey("repair_requests.id"), nullable=False)
    status = db.Column(db.String(30), nullable=False)
    actor = db.Column(db.String(120))  # e.g. "Admin (Maria)", "Customer", "Tech (Rico)"
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    repair = db.relationship("RepairRequest", back_populates="status_history")

    def to_dict(self):
        return {
            "status": self.status,
            "actor": self.actor,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }


class Message(db.Model):
    """Shop <-> customer updates, plus internal-only technician notes."""

    __tablename__ = "messages"

    id = db.Column(db.Integer, primary_key=True)
    repair_id = db.Column(db.Integer, db.ForeignKey("repair_requests.id"), nullable=False)
    sender_name = db.Column(db.String(120))
    sender_role = db.Column(db.String(20))  # admin | technician | customer | system
    content = db.Column(db.Text, nullable=False)
    visible_to_customer = db.Column(db.Boolean, default=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    repair = db.relationship("RepairRequest", back_populates="messages")

    def to_dict(self):
        return {
            "sender_name": self.sender_name,
            "sender_role": self.sender_role,
            "content": self.content,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }


class Photo(db.Model):
    __tablename__ = "photos"

    id = db.Column(db.Integer, primary_key=True)
    repair_id = db.Column(db.Integer, db.ForeignKey("repair_requests.id"), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    uploaded_by_role = db.Column(db.String(20))  # customer | admin | technician
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    repair = db.relationship("RepairRequest", back_populates="photos")

    def to_dict(self):
        return {
            "filename": self.filename,
            "url": f"/uploads/{self.filename}",
            "uploaded_by_role": self.uploaded_by_role,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }


class Notification(db.Model):
    __tablename__ = "notifications"

    id = db.Column(db.Integer, primary_key=True)
    repair_id = db.Column(db.Integer, db.ForeignKey("repair_requests.id"), nullable=False)
    label = db.Column(db.String(120))  # e.g. "Appointment Confirmation", "Technician Assigned"
    delivery_status = db.Column(db.String(20), default="Sent")  # Sent | Delivered
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    repair = db.relationship("RepairRequest", back_populates="notifications")

    def to_dict(self):
        return {
            "label": self.label,
            "delivery_status": self.delivery_status,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }
