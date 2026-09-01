"""Task creation, planning (optimizer), listing, detail."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Task
from app.schemas.schemas import TaskCreate, TaskOut, PlanResponse
from app.services import optimizer_service
from app.api.v1.endpoints.auth import get_current_user
from app.schemas.schemas import TokenData

router = APIRouter()


@router.post("/", response_model=TaskOut)
def create_task(payload: TaskCreate, db: Session = Depends(get_db)):
    # In production, resolve user from JWT. For demo, use first user.
    user = db.query(User).first()
    user_id = user.id if user else None
    if not user_id:
        raise HTTPException(400, "no user exists - register first")
    return optimizer_service.create_task(db, user_id, payload)


@router.get("/", response_model=list[TaskOut])
def list_tasks(limit: int = 100, db: Session = Depends(get_db)):
    return optimizer_service.list_tasks(db, limit)


@router.get("/{task_id}", response_model=TaskOut)
def get_task(task_id: UUID, db: Session = Depends(get_db)):
    task = optimizer_service.get(db, task_id)
    if not task:
        raise HTTPException(404, "task not found")
    return task


@router.post("/{task_id}/plan", response_model=PlanResponse)
def plan_task(task_id: UUID, db: Session = Depends(get_db)):
    try:
        result = optimizer_service.plan(db, task_id)
        # convert proposal objects to schema
        from app.schemas.schemas import ProposalOut
        proposals = [ProposalOut.model_validate(p) for p in result["proposals"]]
        return PlanResponse(
            task_id=task_id,
            proposals=proposals,
            telemetry_fresh=result["telemetry_fresh"],
            explanation=result["explanation"],
        )
    except ValueError as e:
        raise HTTPException(400, str(e))
