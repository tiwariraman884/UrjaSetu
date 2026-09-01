"""History / audit timeline endpoint."""
from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Task, Decision, Command, Outcome, SavingsReceipt, Payment, PaymentAuditEvent

router = APIRouter()


@router.get("/", response_model=list[dict])
def history(limit: int = 50, db: Session = Depends(get_db)):
    events: list[dict] = []
    for t in db.query(Task).order_by(Task.created_at.desc()).limit(limit).all():
        events.append({"time": t.created_at.isoformat(), "type": "task_created", "entity": str(t.id), "detail": t.name})
    for p in db.query(Payment).order_by(Payment.created_at.desc()).limit(limit).all():
        events.append({"time": p.created_at.isoformat(), "type": "payment", "entity": str(p.id), "detail": p.status})
        for ae in p.audit_events:
            events.append({"time": ae.created_at.isoformat(), "type": f"payment_{ae.event_type}", "entity": str(p.id), "detail": ae.event_type})
    for c in db.query(Command).order_by(Command.issued_at.desc()).limit(limit).all():
        events.append({"time": c.issued_at.isoformat(), "type": "command", "entity": c.id, "detail": f"{c.action} {c.state}"})
    for r in db.query(SavingsReceipt).order_by(SavingsReceipt.created_at.desc()).limit(limit).all():
        events.append({"time": r.created_at.isoformat(), "type": "receipt", "entity": str(r.id), "detail": f"benefit={r.incremental_benefit}"})
    events.sort(key=lambda e: e["time"], reverse=True)
    return events[:limit]
