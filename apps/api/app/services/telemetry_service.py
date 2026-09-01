"""Telemetry ingestion, validation, freshness, sequence, anomaly detection."""
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Telemetry, Device
from app.schemas.schemas import TelemetryIn, TelemetryValidation
from app.core import formulas


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def validate(db: Session, payload: TelemetryIn) -> TelemetryValidation:
    """Validate telemetry: timestamp, sequence, ranges, freshness."""
    errors: list[str] = []
    now = _utcnow()

    # device exists?
    device = db.query(Device).filter(Device.id == str(payload.device_id)).first()
    if not device:
        errors.append("device not found")
        return TelemetryValidation(is_valid=False, is_fresh=False, quality="invalid", errors=errors)

    # timestamp ISO 8601 + freshness
    ts = payload.timestamp
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    age_s = (now - ts).total_seconds()
    threshold = device.site.freshness_threshold_s if device.site else 20
    is_fresh = age_s <= threshold

    # sequence monotonic
    last = (
        db.query(Telemetry)
        .filter(Telemetry.device_id == payload.device_id)
        .order_by(Telemetry.sequence.desc())
        .first()
    )
    if last and payload.sequence <= last.sequence:
        errors.append(f"sequence not monotonic: got {payload.sequence}, last {last.sequence}")

    # range validation
    for ch_name, ch in [("source", payload.source), ("load", payload.load)]:
        if ch.voltage_v < 0 or ch.voltage_v > 15:
            errors.append(f"{ch_name} voltage out of range: {ch.voltage_v}V")
        if ch.current_a < 0 or ch.current_a > 5:
            errors.append(f"{ch_name} current out of range: {ch.current_a}A")
        if ch.power_w < 0 or ch.power_w > 100:
            errors.append(f"{ch_name} power out of range: {ch.power_w}W")

    quality = "good"
    if errors:
        quality = "invalid"
    elif not is_fresh:
        quality = "stale"

    return TelemetryValidation(
        is_valid=len(errors) == 0,
        is_fresh=is_fresh,
        quality=quality,
        errors=errors,
    )


def ingest(db: Session, payload: TelemetryIn) -> Telemetry:
    """Validate and ingest telemetry. Reject invalid (but record stale)."""
    v = validate(db, payload)
    if not v.is_valid:
        raise ValueError(f"telemetry invalid: {v.errors}")

    gp = formulas.grid_power(payload.load.power_w, payload.source.power_w)

    record = Telemetry(
        device_id=str(payload.device_id),
        timestamp=payload.timestamp,
        sequence=payload.sequence,
        source_voltage_v=payload.source.voltage_v,
        source_current_a=payload.source.current_a,
        source_power_w=payload.source.power_w,
        source_label=payload.source.label,
        load_voltage_v=payload.load.voltage_v,
        load_current_a=payload.load.current_a,
        load_power_w=payload.load.power_w,
        load_label=payload.load.label,
        grid_power_w=gp,
        import_power_w=formulas.import_power(payload.load.power_w, payload.source.power_w),
        export_power_w=formulas.export_power(payload.load.power_w, payload.source.power_w),
        mode=payload.mode,
        faults=payload.faults,
        provenance=payload.provenance,
        quality=v.quality,
    )
    db.add(record)

    device = db.query(Device).filter(Device.id == str(payload.device_id)).first()
    if device:
        device.last_seen = _utcnow()
        device.state = "online" if v.is_fresh else "online"

    db.commit()
    db.refresh(record)
    return record


def latest_for_device(db: Session, device_id: UUID) -> Telemetry | None:
    return (
        db.query(Telemetry)
        .filter(Telemetry.device_id == str(device_id))
        .order_by(Telemetry.sequence.desc())
        .first()
    )


def list_for_device(db: Session, device_id: UUID, limit: int = 100):
    return (
        db.query(Telemetry)
        .filter(Telemetry.device_id == str(device_id))
        .order_by(Telemetry.sequence.desc())
        .limit(limit)
        .all()
    )


def is_device_fresh(db: Session, device_id: UUID, threshold_s: int = 20) -> tuple[bool, float]:
    """Return (is_fresh, age_seconds)."""
    t = latest_for_device(db, device_id)
    if not t:
        return False, float("inf")
    now = _utcnow()
    ts = t.timestamp.replace(tzinfo=timezone.utc) if t.timestamp.tzinfo is None else t.timestamp
    age = (now - ts).total_seconds()
    return age <= threshold_s, age


