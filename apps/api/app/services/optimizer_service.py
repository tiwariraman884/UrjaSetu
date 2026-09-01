"""Rules-first deterministic optimizer with explainable recommendations.

Planning steps (per PRD section 18):
1. Validate inputs.
2. Reject missing/invalid/stale telemetry.
3. Generate candidate start times.
4. Evaluate every candidate (source, load, tariff, limits, conflicts).
5. Calculate baseline, candidate cost, incremental benefit.
6. Rank candidates; apply user preference as tie-breaker.
7. If benefit < threshold => ADVICE_ONLY.
8. Otherwise SUGGESTED; require approval.
"""
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Task, Device, Telemetry, Proposal
from app.core import formulas
from app.services import telemetry_service

BENEFIT_THRESHOLD = 0.0001  # USD; below => ADVICE_ONLY


def _as_naive_utc(dt: datetime | None) -> datetime | None:
    """Normalize a datetime to a timezone-naive UTC value.

    SQLite stores timestamps as naive datetime values (no tzinfo), while
    `_utcnow()` and incoming API payloads may be timezone-aware. Mixing the
    two raises ``TypeError: can't compare offset-naive and offset-aware
    datetimes``. This helper gives the optimizer a single, consistent
    convention: everything compared inside planning is naive UTC.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt  # already naive; assume already UTC
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def _utcnow() -> datetime:
    # Naive UTC, matching the convention used by SQLite/SQLAlchemy columns.
    return _as_naive_utc(datetime.now(timezone.utc))


def create_task(db: Session, user_id: UUID, payload) -> Task:
    """Create a task (TaskCreate schema)."""
    # Initial target energy = rated_power_w * runtime_hours; fall back to the
    # latest observed load power when rated power is unavailable. This gives a
    # fresh task a feasible, >0 target immediately (plan() may re-estimate it).
    device = db.query(Device).filter(Device.id == str(payload.device_id)).first()
    rated = device.rated_power_w if device else 0.0
    if not rated:
        latest = telemetry_service.latest_for_device(db, payload.device_id)
        if latest:
            rated = latest.load_power_w or 0.0
    target_energy = formulas.energy_watt_hours(rated, payload.runtime_min / 60.0)
    task = Task(
        user_id=str(user_id),
        device_id=str(payload.device_id),
        name=payload.name,
        runtime_min=payload.runtime_min,
        earliest_start=payload.earliest_start,
        deadline=payload.deadline,
        priority=payload.priority,
        preference=payload.preference,
        target_energy_wh=round(target_energy, 4),
        state="created",
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def get(db: Session, task_id: UUID) -> Task | None:
    return db.query(Task).filter(Task.id == str(task_id)).first()


def list_tasks(db: Session, limit: int = 100):
    return db.query(Task).order_by(Task.created_at.desc()).limit(limit).all()


def plan(db: Session, task_id: UUID) -> dict:
    """Generate optimization proposals for a task.

    Returns {"proposals": [...], "telemetry_fresh": bool, "explanation": str}.
    """
    task = db.query(Task).filter(Task.id == str(task_id)).first()
    if not task:
        raise ValueError("task not found")

    device = db.query(Device).filter(Device.id == task.device_id).first()
    if not device:
        raise ValueError("device not found")

    # 2. Reject stale telemetry
    site = device.site
    threshold = site.freshness_threshold_s if site else 20
    is_fresh, age = telemetry_service.is_device_fresh(db, device.id, threshold)
    if not is_fresh:
        task.state = "planned"
        db.commit()
        return {
            "proposals": [],
            "telemetry_fresh": False,
            "explanation": f"Telemetry stale (age {age:.0f}s > {threshold}s). HOLD - no automatic command.",
        }

    latest = telemetry_service.latest_for_device(db, device.id)
    if not latest:
        return {"proposals": [], "telemetry_fresh": False,
                "explanation": "No telemetry available."}

    # 3. Candidate slots
    # Normalize all planning datetimes to naive UTC so SQLite-loaded values
    # (naive) and _utcnow()/API values (possibly aware) are comparable.
    earliest = _as_naive_utc(task.earliest_start) or _utcnow()
    deadline = _as_naive_utc(task.deadline) or (earliest + timedelta(hours=4))
    slots = formulas.candidate_slots(earliest, deadline, task.runtime_min)
    if not slots:
        return {"proposals": [], "telemetry_fresh": True,
                "explanation": "No feasible candidate slots in window."}

    # Estimate energy: rated_power * runtime
    rated = device.rated_power_w or (latest.load_power_w or 0.0)
    target_energy = formulas.energy_watt_hours(rated, task.runtime_min / 60.0)
    task.target_energy_wh = target_energy

    import_val = site.import_value_per_kwh if site else 0.12
    export_val = site.export_value_per_kwh if site else 0.08

    # Remove proposals left over from earlier optimization runs that the user
    # has not acted on, so repeated planning does not accumulate duplicates.
    # Any proposal the user already approved/skipped is preserved.
    for old in list(task.proposals):
        if not old.decisions:
            db.delete(old)
    db.flush()
    # 4-9. Evaluate candidates
    proposals: list[Proposal] = []
    for slot in slots:
        # Baseline: run at earliest slot (naive)
        baseline_cost = formulas.estimate_cost(target_energy, import_val)
        # Optimized: if source power available at slot, offset import
        source_available = (latest.source_power_w or 0.0) > 0
        if source_available:
            offset_wh = min(target_energy, formulas.energy_watt_hours(
                latest.source_power_w or 0.0, task.runtime_min / 60.0))
            net_import_wh = max(0.0, target_energy - offset_wh)
            planned_cost = formulas.estimate_cost(net_import_wh, import_val)
        else:
            planned_cost = baseline_cost

        benefit = formulas.incremental_benefit(baseline_cost, planned_cost)
        recommendation = "SUGGESTED" if benefit > BENEFIT_THRESHOLD else "ADVICE_ONLY"

        assumptions = (
            f"rated_power={rated}W, target_energy={target_energy:.2f}Wh, "
            f"import_tariff=${import_val}/kWh, source_available={source_available}"
        )

        p = Proposal(
            task_id=task.id,
            candidate_slot=slot.isoformat(),
            baseline_cost=round(baseline_cost, 6),
            planned_cost=round(planned_cost, 6),
            incremental_benefit=round(benefit, 6),
            assumptions=assumptions,
            confidence="medium",
            recommendation=recommendation,
            expires_at=slot + timedelta(minutes=task.runtime_min),
        )
        db.add(p)
        proposals.append(p)

    # 10-11. Rank by benefit, apply preference
    if task.preference == "earliest":
        proposals.sort(key=lambda p: p.candidate_slot)
    elif task.preference == "green":
        proposals.sort(key=lambda p: -p.incremental_benefit)
    else:  # cost
        proposals.sort(key=lambda p: -p.incremental_benefit)

    task.state = "planned"
    db.commit()

    best = proposals[0] if proposals else None
    if best:
        expl = (
            f"WHY: shift load to capture source energy. "
            f"WHEN: {best.candidate_slot}. "
            f"EXPECTED COST: ${best.planned_cost:.4f}. "
            f"BASELINE: ${best.baseline_cost:.4f}. "
            f"BENEFIT: ${best.incremental_benefit:.4f}. "
            f"RECOMMENDATION: {best.recommendation}."
        )
    else:
        expl = "No candidates."

    return {
        "proposals": proposals,
        "telemetry_fresh": True,
        "explanation": expl,
    }


def mark_authorized(db: Session, task_id: UUID) -> Task:
    task = db.query(Task).filter(Task.id == str(task_id)).first()
    if task:
        task.state = "authorized"
        db.commit()
        db.refresh(task)
    return task

