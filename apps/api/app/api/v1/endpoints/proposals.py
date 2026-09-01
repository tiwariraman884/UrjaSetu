"""Proposal decision endpoint (approve/skip)."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database import get_db
from app.models import Proposal, Decision, User
from app.schemas.schemas import DecisionCreate, DecisionOut

router = APIRouter()


@router.post("/{proposal_id}/decision", response_model=DecisionOut)
def decide(proposal_id: str, payload: DecisionCreate, db: Session = Depends(get_db)):
    proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
    if not proposal:
        raise HTTPException(404, "proposal not found")
    user = db.query(User).first()
    actor = user.email if user else "system"
    decision = Decision(
        proposal_id=proposal_id,
        actor=actor,
        approve_or_skip=payload.approve_or_skip,
        selected_slot=payload.selected_slot,
    )
    db.add(decision)
    if payload.approve_or_skip == "approve":
        proposal.task.state = "approved"
    else:
        proposal.task.state = "skipped"
    db.commit()
    db.refresh(decision)
    return decision
