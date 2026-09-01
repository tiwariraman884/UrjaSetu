"""System overview endpoint (dashboard summary)."""
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Device, Task, SavingsReceipt, Telemetry
from app.schemas.schemas import Overview
from app.services import telemetry_service
from app.core import formulas

router = APIRouter()


@router.get("/", response_model=Overview)
def overview(db: Session = Depends(get_db)):
    device = db.query(Device).first()
    is_fresh = False
    source_p = 0.0
    load_p = 0.0
    imp_p = 0.0
    exp_p = 0.0
    today_energy = 0.0

    if device:
        threshold = device.site.freshness_threshold_s if device.site else 20
        is_fresh, _ = telemetry_service.is_device_fresh(db, device.id, threshold)
        latest = telemetry_service.latest_for_device(db, device.id)
        if latest:
            source_p = latest.source_power_w or 0.0
            load_p = latest.load_power_w or 0.0
            imp_p = latest.import_power_w or 0.0
            exp_p = latest.export_power_w or 0.0

    active_task = db.query(Task).filter(Task.state.in_(["executing", "authorized", "approved"])).first()
    recent_receipt = db.query(SavingsReceipt).order_by(SavingsReceipt.created_at.desc()).first()
    cea = device.site.cea_carbon_factor if device and device.site else 0.82
    carbon = formulas.indicative_carbon_kg(today_energy / 1000.0, cea)

    return Overview(
        system_healthy=is_fresh and (device is not None),
        device_online=(device is not None and device.state != "offline") if device else False,
        telemetry_fresh=is_fresh,
        source_power_w=source_p,
        load_power_w=load_p,
        import_power_w=imp_p,
        export_power_w=exp_p,
        today_energy_wh=today_energy,
        indicative_carbon_kg=carbon,
        active_task=active_task.name if active_task else None,
        optimization_opportunity=is_fresh and source_p > 0,
        recent_savings_wh=recent_receipt.energy_wh if recent_receipt else 0.0,
        payment_required=active_task is not None and not any(p.status == "settled" for p in active_task.payments) if active_task else False,
    )
