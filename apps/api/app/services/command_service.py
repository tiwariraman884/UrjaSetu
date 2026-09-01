"""Command ledger: unique command IDs, expiry, idempotency, verification gate."""
import uuid
from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import Command, Task, Device, Outcome
from app.core import formulas
from app.services import telemetry_service, receipt_service

COMMAND_TTL_S = 120


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def can_execute(db: Session, task: Task) -> tuple[bool, str]:
    if not task:
        return False, "task not found"

    if task.state != "authorized":
        return False, f"task not authorized (state={task.state})"

    paid = any(p.status == "settled" for p in task.payments)
    if not paid:
        return False, "payment not verified/settled"

    device = db.query(Device).filter(Device.id == task.device_id).first()
    if not device:
        return False, "device not found"

    threshold = device.site.freshness_threshold_s if device.site else 20
    is_fresh, age = telemetry_service.is_device_fresh(
        db, device.id, threshold
    )

    if not is_fresh:
        return False, f"telemetry stale (age {age:.0f}s)"

    if device.state in ("offline", "fault"):
        return False, f"device {device.state}"

    if task.target_energy_wh <= 0:
        return False, "task not feasible (no target energy)"

    approved_proposal = None

    for prop in task.proposals:
        for dec in prop.decisions:
            if dec.approve_or_skip == "approve":
                approved_proposal = prop

    if not approved_proposal:
        return False, "no approved proposal (benefit not validated)"

    return True, "all conditions met"


def issue_command(db: Session, task_id: UUID) -> Command:
    task = db.query(Task).filter(Task.id == str(task_id)).first()

    if not task:
        raise ValueError("task not found")

    allowed, reason = can_execute(db, task)

    if not allowed:
        raise PermissionError(
            f"execution blocked: {reason}"
        )

    existing = (
        db.query(Command)
        .filter(
            Command.task_id == task_id,
            Command.state.in_(
                ["issued", "acked", "executing"]
            ),
        )
        .first()
    )

    if existing:
        return existing

    device = (
        db.query(Device)
        .filter(Device.id == task.device_id)
        .first()
    )

    now = _utcnow()

    cmd = Command(
        id=str(uuid.uuid4()),
        task_id=str(task_id),
        device_id=task.device_id,
        action="start",
        issued_at=now,
        expires_at=now + timedelta(seconds=COMMAND_TTL_S),
        expected_power_min_w=(
            device.min_power_w if device else 0.0
        ),
        expected_power_max_w=(
            device.rated_power_w if device else 0.0
        ),
        state="issued",
        idempotency_key=f"task-{task_id}-start",
    )

    db.add(cmd)

    task.state = "executing"

    db.commit()
    db.refresh(cmd)

    return cmd


def ack_command(db: Session, receipt) -> Command:
    cmd = (
        db.query(Command)
        .filter(Command.id == receipt.command_id)
        .first()
    )

    if not cmd:
        raise ValueError("command not found")

    now = _utcnow()

    exp = (
        cmd.expires_at.replace(tzinfo=timezone.utc)
        if cmd.expires_at.tzinfo is None
        else cmd.expires_at
    )

    if now > exp:
        cmd.state = "expired"
        db.commit()
        raise PermissionError("command expired")

    cmd.state = "acked"

    outcome = (
        db.query(Outcome)
        .filter(Outcome.command_id == cmd.id)
        .first()
    )

    if not outcome:
        outcome = Outcome(
            command_id=cmd.id,
            observed_power_w=receipt.observed_power_w,
        )
        db.add(outcome)
    else:
        outcome.observed_power_w = receipt.observed_power_w

    db.commit()
    db.refresh(cmd)

    return cmd


def complete_command(
    db: Session,
    command_id: str,
    observed_power_w: float,
    runtime_s: float,
) -> Outcome:

    cmd = (
        db.query(Command)
        .filter(Command.id == command_id)
        .first()
    )

    if not cmd:
        raise ValueError("command not found")

    now = _utcnow()

    cmd.state = "done"

    outcome = (
        db.query(Outcome)
        .filter(Outcome.command_id == cmd.id)
        .first()
    )

    if not outcome:
        outcome = Outcome(
            command_id=cmd.id,
        )
        db.add(outcome)

    outcome.observed_stop = now
    outcome.runtime_s = runtime_s
    outcome.observed_power_w = observed_power_w
    outcome.energy_wh = formulas.energy_wh_from_seconds(
        observed_power_w,
        runtime_s,
    )

    if cmd.expected_power_max_w > 0:

        if observed_power_w < cmd.expected_power_min_w * 0.5:
            outcome.verification_state = "failed"
            outcome.reason = (
                "observed power below expected range"
            )

        elif observed_power_w > cmd.expected_power_max_w * 1.5:
            outcome.verification_state = "failed"
            outcome.reason = (
                "observed power above expected range"
            )

        else:
            outcome.verification_state = "verified"
            outcome.reason = (
                "observed power within expected range"
            )

    else:
        outcome.verification_state = "unverified"
        outcome.reason = (
            "no expected power range defined"
        )

    db.commit()
    db.refresh(outcome)

    # Generate Savings Receipt automatically after
    # successful physical verification.
    if outcome.verification_state == "verified":

        task = (
            db.query(Task)
            .filter(Task.id == cmd.task_id)
            .first()
        )

        if task:

            existing_receipt = (
                db.query(receipt_service.SavingsReceipt)
                .filter(
                    receipt_service.SavingsReceipt.task_id
                    == str(task.id)
                )
                .first()
            )

            if not existing_receipt:

                approved_proposal = None

                for prop in task.proposals:
                    for dec in prop.decisions:
                        if dec.approve_or_skip == "approve":
                            approved_proposal = prop
                            break

                    if approved_proposal:
                        break

                receipt_service.generate_receipt(
                    db,
                    UUID(str(task.id)),
                    baseline_cost=(
                        float(approved_proposal.baseline_cost)
                        if approved_proposal
                        else 0.0
                    ),
                    optimized_cost=(
                        float(approved_proposal.planned_cost)
                        if approved_proposal
                        else 0.0
                    ),
                    incremental_benefit=(
                        float(
                            approved_proposal.incremental_benefit
                        )
                        if approved_proposal
                        else 0.0
                    ),
                )

    return outcome


def next_command(
    db: Session,
    device_id: UUID,
) -> Command | None:

    return (
        db.query(Command)
        .filter(
            Command.device_id == device_id,
            Command.state == "issued",
        )
        .order_by(Command.issued_at.asc())
        .first()
    )


def stop_task(db: Session, task_id: UUID) -> dict:

    task = (
        db.query(Task)
        .filter(Task.id == str(task_id))
        .first()
    )

    if not task:
        return {
            "ok": False,
            "error": "task not found",
        }

    task.state = "verified"

    for cmd in task.commands:
        if cmd.state in (
            "issued",
            "acked",
            "executing",
        ):
            cmd.state = "done"

    db.commit()

    return {
        "ok": True,
        "task_id": str(task.id),
        "status": "stopped",
    }


def emergency_stop(
    db: Session,
    device_id: UUID,
) -> dict:

    device = (
        db.query(Device)
        .filter(Device.id == str(device_id))
        .first()
    )

    if not device:
        return {
            "ok": False,
            "error": "device not found",
        }

    device.state = "fault"
    db.commit()

    return {
        "ok": True,
        "device_id": str(device.id),
        "command": "ESTOP",
    }
