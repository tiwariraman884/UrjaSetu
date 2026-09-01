"""Savings receipt generation with provenance and transaction linkage."""
import hashlib
from uuid import UUID

from sqlalchemy.orm import Session

from app.models import SavingsReceipt, Task, Outcome, Command, Device
from app.core import formulas


def generate_receipt(
    db: Session,
    task_id: UUID,
    baseline_cost: float = 0.0,
    optimized_cost: float = 0.0,
    incremental_benefit: float = 0.0,
) -> SavingsReceipt:
    """Generate a verified savings receipt from task outcome + payment.

    Idempotent: if a receipt already exists for this task it is returned as-is
    (no duplicate is created). Provenance is strictly tied to the actual
    outcome verification state — only ``verification_state == "verified"``
    yields ``MEASURED``; everything else is ``ESTIMATED`` (or ``SIMULATED``
    when explicitly requested via generate_demo_receipt). A settled payment is
    linked only when one genuinely exists; no payment is fabricated.
    """
    task = db.query(Task).filter(Task.id == str(task_id)).first()
    if not task:
        raise ValueError("task not found")

    # Idempotency: never create a second receipt for the same task.
    existing = (
        db.query(SavingsReceipt)
        .filter(SavingsReceipt.task_id == str(task_id))
        .first()
    )
    if existing:
        return existing

    # get outcome via latest command
    cmd = (
        db.query(Command)
        .filter(Command.task_id == str(task_id))
        .order_by(Command.issued_at.desc())
        .first()
    )
    outcome = cmd.outcome if cmd else None
    energy_wh = outcome.energy_wh if outcome else 0.0

    # carbon (load device explicitly — Task has no `device` relationship)
    device = (
        db.query(Device).filter(Device.id == task.device_id).first()
    )
    site = device.site if device else None
    cea = site.cea_carbon_factor if site else 0.82
    carbon = formulas.indicative_carbon_kg(energy_wh / 1000.0, cea)

    # linked payment — ONLY a genuinely settled payment is linked.
    payment = None
    for p in task.payments:
        if p.status == "settled":
            payment = p
            break

    # Provenance is bound to the ACTUAL physical verification result.
    # Only a verified outcome may be called MEASURED.
    provenance = "MEASURED" if (outcome and outcome.verification_state == "verified") else "ESTIMATED"

    # signature over task + energy + benefit + payment
    sig_input = f"{task_id}:{energy_wh}:{incremental_benefit}:{payment.id if payment else 'none'}"
    signature = hashlib.sha256(sig_input.encode()).hexdigest()

    receipt = SavingsReceipt(
        task_id=str(task_id),
        baseline_method="naive_slot",
        baseline_cost=baseline_cost,
        optimized_cost=optimized_cost,
        incremental_benefit=incremental_benefit,
        energy_wh=energy_wh,
        indicative_carbon_kg=carbon,
        provenance=provenance,
        payment_id=payment.id if payment else None,
        signature=signature,
    )
    db.add(receipt)
    task.state = "verified"
    db.commit()
    db.refresh(receipt)
    return receipt


def generate_demo_receipt(
    db: Session,
    task_id: UUID,
    baseline_cost: float = 0.0,
    optimized_cost: float = 0.0,
    incremental_benefit: float = 0.0,
    energy_wh: float | None = None,
) -> SavingsReceipt:
    """Generate a clearly-labelled DEMO / SIMULATED receipt.

    This is used ONLY when the real flow cannot complete because x402 payment
    settlement is blocked (e.g. missing Testnet USDC). It MUST NOT:
      - claim physical verification (provenance = SIMULATED, never MEASURED)
      - link a fake payment (payment_id stays None unless a real settled
        payment exists)
      - fabricate a blockchain transaction id
    It is idempotent: an existing receipt for the task is returned as-is.
    """
    task = db.query(Task).filter(Task.id == str(task_id)).first()
    if not task:
        raise ValueError("task not found")

    existing = (
        db.query(SavingsReceipt)
        .filter(SavingsReceipt.task_id == str(task_id))
        .first()
    )
    if existing:
        return existing

    # Use the approved proposal figures when available so the demo receipt
    # reflects the actual optimization plan rather than a hardcoded number.
    approved_proposal = None
    for prop in task.proposals:
        for dec in prop.decisions:
            if dec.approve_or_skip == "approve":
                approved_proposal = prop
                break
        if approved_proposal:
            break

    if energy_wh is None:
        # Estimate from the approved proposal / task target energy.
        energy_wh = float(task.target_energy_wh or 0.0)
    if baseline_cost == 0.0 and approved_proposal:
        baseline_cost = float(approved_proposal.baseline_cost)
    if optimized_cost == 0.0 and approved_proposal:
        optimized_cost = float(approved_proposal.planned_cost)
    if incremental_benefit == 0.0 and approved_proposal:
        incremental_benefit = float(approved_proposal.incremental_benefit)

    device = (
        db.query(Device).filter(Device.id == task.device_id).first()
    )
    site = device.site if device else None
    cea = site.cea_carbon_factor if site else 0.82
    carbon = formulas.indicative_carbon_kg(energy_wh / 1000.0, cea)

    # Link a payment ONLY if a genuinely settled one exists.
    payment = None
    for p in task.payments:
        if p.status == "settled":
            payment = p
            break

    sig_input = f"demo:{task_id}:{energy_wh}:{incremental_benefit}:{payment.id if payment else 'none'}"
    signature = hashlib.sha256(sig_input.encode()).hexdigest()

    receipt = SavingsReceipt(
        task_id=str(task_id),
        baseline_method="simulated_demo",
        baseline_cost=baseline_cost,
        optimized_cost=optimized_cost,
        incremental_benefit=incremental_benefit,
        energy_wh=energy_wh,
        indicative_carbon_kg=carbon,
        provenance="SIMULATED",
        payment_id=payment.id if payment else None,
        signature=signature,
    )
    db.add(receipt)
    db.commit()
    db.refresh(receipt)
    return receipt


def list_receipts(db: Session, limit: int = 100):
    return db.query(SavingsReceipt).order_by(SavingsReceipt.created_at.desc()).limit(limit).all()


def get_receipt(db: Session, receipt_id: UUID) -> SavingsReceipt | None:
    return db.query(SavingsReceipt).filter(SavingsReceipt.id == str(receipt_id)).first()


def get_for_task(db: Session, task_id: UUID) -> SavingsReceipt | None:
    return db.query(SavingsReceipt).filter(SavingsReceipt.task_id == str(task_id)).first()
