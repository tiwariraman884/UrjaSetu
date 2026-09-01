"""Telemetry ingestion endpoint (POST /api/v1/telemetry)."""
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.schemas import TelemetryIn, TelemetryOut
from app.services import telemetry_service

router = APIRouter()


@router.post("/", response_model=TelemetryOut)
def ingest_telemetry(payload: TelemetryIn, db: Session = Depends(get_db)):
    try:
        return telemetry_service.ingest(db, payload)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.get("/{device_id}", response_model=list[TelemetryOut])
def list_telemetry(device_id: UUID, limit: int = 100, db: Session = Depends(get_db)):
    return telemetry_service.list_for_device(db, device_id, limit)


@router.get("/{device_id}/latest", response_model=TelemetryOut | None)
def latest_telemetry(device_id: UUID, db: Session = Depends(get_db)):
    return telemetry_service.latest_for_device(db, device_id)
