"""Savings receipt endpoints."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.schemas import SavingsReceiptOut
from app.services import receipt_service

router = APIRouter()


@router.get("/", response_model=list[SavingsReceiptOut])
def list_receipts(limit: int = 100, db: Session = Depends(get_db)):
    return receipt_service.list_receipts(db, limit)


@router.get("/{receipt_id}", response_model=SavingsReceiptOut)
def get_receipt(receipt_id: UUID, db: Session = Depends(get_db)):
    r = receipt_service.get_receipt(db, receipt_id)
    if not r:
        raise HTTPException(404, "receipt not found")
    return r


@router.get("/task/{task_id}", response_model=SavingsReceiptOut)
def get_for_task(task_id: UUID, db: Session = Depends(get_db)):
    r = receipt_service.get_for_task(db, task_id)
    if not r:
        raise HTTPException(404, "no receipt for task")
    return r


@router.post("/task/{task_id}/demo", response_model=SavingsReceiptOut)
def create_demo_receipt(task_id: UUID, db: Session = Depends(get_db)):
    """Create a clearly-labelled DEMO / SIMULATED receipt for a task.

    Prototype-only: used when the real x402 payment flow cannot settle (e.g.
    missing Testnet USDC) so the receipt feature can still be demonstrated.
    The receipt is created with provenance = SIMULATED, never MEASURED, and no
    fake blockchain transaction or payment settlement is recorded. Idempotent.
    """
    try:
        return receipt_service.generate_demo_receipt(db, task_id)
    except ValueError as e:
        raise HTTPException(404, str(e))
