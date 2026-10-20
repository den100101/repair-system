from decimal import Decimal
from flask import request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from extensions import db
from models import AuditLog, User


def client_ip():
    forwarded = request.headers.get("X-Forwarded-For", "")
    return (forwarded.split(",")[0].strip() or request.remote_addr or "")[:45]


def log_action(action, target_type=None, target_id=None, details=None, user=None, commit=False):
    actor = user
    if actor is None:
        try:
            verify_jwt_in_request(optional=True)
            identity = get_jwt_identity()
            if identity:
                actor = db.session.get(User, int(identity))
        except Exception:
            actor = None
    db.session.add(
        AuditLog(
            user_id=actor.id if actor else None,
            actor_name=actor.full_name if actor else "Guest",
            actor_role=actor.role if actor else "guest",
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id is not None else None,
            details=details,
            ip_address=client_ip(),
        )
    )
    if commit:
        db.session.commit()


def snapshot(obj, fields):
    return {field: getattr(obj, field) for field in fields}


def _norm(value):
    if isinstance(value, (Decimal, int, float)) and not isinstance(value, bool):
        return float(value)
    return value


def _fmt(value):
    value = _norm(value)
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value)


def diff(before, after):
    changes = []
    for key, old in before.items():
        new = after.get(key)
        if _norm(old) != _norm(new):
            changes.append(f"{key}: {_fmt(old)} -> {_fmt(new)}")
    return "; ".join(changes) or "No field changes"
