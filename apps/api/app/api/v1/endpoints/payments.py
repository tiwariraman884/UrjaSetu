"""Payment endpoints: requirement, unlock, verify, lookup, transaction."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Task, User
from app.schemas.schemas import PaymentOut, PaymentVerifyRequest, PaymentTransactionOut, PaymentRequirement
from app.services import payment_service
from app.config import settings

router = APIRouter()

DEFAULT_AMOUNT = 0.01  # USDC


@router.post("/unlock", response_model=PaymentOut)
def unlock(task_id: str, db: Session = Depends(get_db)):
    """Create a payment requirement for a task (returns HTTP 402 semantics in gateway)."""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "task not found")
    user = db.query(User).first()
    if not user:
        raise HTTPException(400, "no user")
    resource = f"/api/v1/tasks/{task.id}/optimize"
    payment = payment_service.create_requirement(db,task.id, user.id, DEFAULT_AMOUNT, resource)
    return payment


@router.post("/verify", response_model=PaymentOut)
async def verify(payload: PaymentVerifyRequest, db: Session = Depends(get_db)):
    """Verify + settle a payment via the facilitator. Only real settlement authorizes the task."""
    try:
        return await payment_service.verify_and_settle(
            db,
            payload.payment_id,
            payload.x_payment_header,
            payload.payment_requirements,
            tx_id=payload.tx_id,
            task_id=payload.task_id,
        )
    except PermissionError as e:
        raise HTTPException(409, str(e))
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/{payment_id}", response_model=PaymentOut)
def get_payment(payment_id: UUID, db: Session = Depends(get_db)):
    p = payment_service.get(db, payment_id)
    if not p:
        raise HTTPException(404, "payment not found")
    return p


@router.get("/{payment_id}/transaction", response_model=PaymentTransactionOut | None)
def get_transaction(payment_id: UUID, db: Session = Depends(get_db)):
    return payment_service.get_transaction(db, payment_id)


@router.get("/task/{task_id}", response_model=list[PaymentOut])
def payments_for_task(task_id: UUID, db: Session = Depends(get_db)):
    return payment_service.for_task(db, task_id)
