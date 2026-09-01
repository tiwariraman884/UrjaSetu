"""Device registration, listing, status."""
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Device
from app.schemas.schemas import DeviceCreate, DeviceOut, DeviceStatus
from app.services import telemetry_service

router = APIRouter()


@router.post("/register", response_model=DeviceOut)
def register_device(payload: DeviceCreate, db: Session = Depends(get_db)):
    if db.query(Device).filter(Device.hardware_id == payload.hardware_id).first():
        raise HTTPException(400, "hardware_id already registered")
    data = {k: str(v) if hasattr(v, 'hex') else v for k, v in payload.model_dump().items()}
    device = Device(**data, firmware="0.2.0")
    db.add(device)
    db.commit()
    db.refresh(device)
    return device


@router.get("/", response_model=list[DeviceOut])
def list_devices(limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Device).limit(limit).all()


@router.get("/{device_id}", response_model=DeviceOut)
def get_device(device_id: UUID, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == str(device_id)).first()
    if not device:
        raise HTTPException(404, "device not found")
    return device


@router.get("/{device_id}/status", response_model=DeviceStatus)
def device_status(device_id: UUID, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == str(device_id)).first()
    if not device:
        raise HTTPException(404, "device not found")
    threshold = device.site.freshness_threshold_s if device.site else 20
    is_fresh, age = telemetry_service.is_device_fresh(db, device_id, threshold)
    return DeviceStatus(
        device_id=device_id,
        state=device.state,
        last_seen=device.last_seen,
        is_fresh=is_fresh,
        freshness_age_s=age if age != float("inf") else None,
    )

