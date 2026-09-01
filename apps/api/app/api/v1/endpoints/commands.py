"""Command ledger endpoints: issue, poll next, ack receipt, stop."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.schemas import CommandOut, CommandReceipt, OutcomeOut
from app.services import command_service

router = APIRouter()


@router.post("/{task_id}/issue", response_model=CommandOut)
def issue(task_id: UUID, db: Session = Depends(get_db)):
    try:
        return command_service.issue_command(db, task_id)
    except PermissionError as e:
        raise HTTPException(403, str(e))
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/next", response_model=CommandOut | None)
def next_cmd(device_id: UUID, db: Session = Depends(get_db)):
    return command_service.next_command(db, device_id)


@router.post("/{command_id}/receipt", response_model=CommandOut)
def receipt(command_id: str, payload: CommandReceipt, db: Session = Depends(get_db)):
    try:
        return command_service.ack_command(db, payload)
    except PermissionError as e:
        raise HTTPException(410, str(e))
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.post("/{command_id}/complete", response_model=OutcomeOut)
def complete(command_id: str, observed_power_w: float, runtime_s: float, db: Session = Depends(get_db)):
    try:
        return command_service.complete_command(db, command_id, observed_power_w, runtime_s)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.post("/{task_id}/stop", response_model=dict)
def stop(task_id: UUID, db: Session = Depends(get_db)):
    return command_service.stop_task(db, task_id)


@router.post("/devices/{device_id}/estop", response_model=dict)
def estop(device_id: UUID, db: Session = Depends(get_db)):
    return command_service.emergency_stop(db, device_id)
