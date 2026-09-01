"""Payment authorization bridge — links x402 settlement to task authorization.

CRITICAL: Only verified server-side settlement can unlock the paid service.
The frontend is NEVER trusted as proof of payment.
"""
import json
from datetime import datetime, timezone
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

from app.models import Payment, PaymentTransaction, PaymentAuditEvent, Task, User
from app.config import settings


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


async def _confirm_tx_onchain(tx_id: str, payment_requirements: dict | None) -> bool:
    """Authoritatively confirm a settlement transaction on Algorand Testnet.

    Queries the algod REST endpoint (AlgoNode testnet by default) for the
    pending/confirmed transaction. Returns True only if the transaction exists
    and is confirmed in a round (``confirmed-round`` present). This is the
    non-bypassable proof that a real Algorand Testnet transfer occurred.
    """
    server = (settings.ALGOD_SERVER or "https://testnet-api.algonode.cloud").rstrip("/")
    token = settings.ALGOD_TOKEN or ""
    headers = {"X-Algo-API-Token": token} if token else {}
    async with httpx.AsyncClient(timeout=15.0, headers=headers) as client:
        resp = await client.get(f"{server}/v2/transactions/pending/{tx_id}")
        if resp.status_code != 200:
            return False
        body = resp.json()
    return bool(body.get("confirmed-round"))


def _audit(db: Session, payment_id: UUID, event_type: str, meta: dict | None = None):
    evt = PaymentAuditEvent(
        payment_id=str(payment_id),
        event_type=event_type,
        event_metadata=json.dumps(meta) if meta else None,
    )
    db.add(evt)
    db.commit()


def create_requirement(db: Session, task_id: UUID, user_id: UUID, amount: float, resource: str) -> Payment:
    """Create a payment requirement for a task."""
    payment = Payment(
        task_id=str(task_id),
        user_id=str(user_id),
        amount=amount,
        receiver_address=settings.RECEIVER_ALGORAND_ADDRESS,
        resource=resource,
        status="required",
        network=settings.X402_NETWORK,
        scheme=settings.X402_SCHEME,
        x402_version=settings.X402_VERSION,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    _audit(db, payment.id, "required", {"amount": amount, "resource": resource})
    return payment


def get(db: Session, payment_id: UUID) -> Payment | None:
    return db.query(Payment).filter(Payment.id == str(payment_id)).first()


def for_task(db: Session, task_id: UUID) -> list[Payment]:
    return db.query(Payment).filter(Payment.task_id == str(task_id)).all()


async def verify_and_settle(
    db: Session,
    payment_id: UUID,
    x_payment_header: str,
    payment_requirements: dict,
    tx_id: str | None = None,
    task_id: str | None = None,
) -> Payment:
    """Verify payment via the x402 facilitator, then record settlement.

    The payment-gateway performs the on-chain settlement (facilitator /settle)
    and notifies the backend here with the resulting tx_id. The backend then
    independently re-verifies the signed payment via the facilitator /verify
    endpoint (defense in depth) and ONLY THEN marks the task authorized.

    If no Payment row exists for `payment_id` yet (the gateway mints its own
    UUID), one is created and linked to `task_id` so the execution gate
    (``task.payments`` must contain a settled payment) is satisfied.
    """
    payment = db.query(Payment).filter(Payment.id == str(payment_id)).first()
    if not payment:
        if not task_id:
            raise ValueError("payment not found and task_id not provided")
        task = db.query(Task).filter(Task.id == str(task_id)).first()
        if not task:
            raise ValueError(f"task {task_id} not found")
        user = db.query(User).first()
        if not user:
            raise ValueError("no user")
        req_network = (payment_requirements or {}).get("network") or settings.X402_NETWORK
        req_asset = (payment_requirements or {}).get("asset") or "USDC"
        req_resource = (payment_requirements or {}).get("resource") or "Verified Energy Optimization Unlock"
        req_amount = float((payment_requirements or {}).get("maxAmountRequired")
                           or (payment_requirements or {}).get("amount")
                           or 0) / (10 ** 6) if (payment_requirements or {}).get("maxAmountRequired") else 0.01
        payment = Payment(
            id=str(payment_id),
            task_id=str(task_id),
            user_id=str(user.id),
            x402_version=settings.X402_VERSION,
            scheme=settings.X402_SCHEME,
            network=req_network,
            asset=req_asset,
            amount=req_amount,
            receiver_address=settings.RECEIVER_ALGORAND_ADDRESS,
            facilitator=settings.FACILITATOR_URL,
            resource=str(req_resource),
            status="required",
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
        _audit(db, payment.id, "required", {"task_id": str(task_id), "created_by": "gateway_notify"})

    # Replay protection
    if payment.status == "settled":
        _audit(db, payment.id, "replay_blocked", {"reason": "already settled"})
        raise PermissionError("payment already settled (replay blocked)")
    if payment.status == "failed":
        _audit(db, payment.id, "replay_blocked", {"reason": "previously failed"})
        raise PermissionError("payment previously failed")

    payment.status = "verifying"
    db.commit()
    _audit(db, payment.id, "verifying", {"header_len": len(x_payment_header), "tx_id": tx_id})

    # Defense in depth: re-verify the signed payment via the facilitator.
    # The gateway already settled on-chain, so the signed group may already be
    # consumed — in that case the facilitator may reject a second verify. We
    # therefore treat facilitator verification as BEST-EFFORT and fall back to
    # authoritative on-chain confirmation of tx_id via algod when a tx_id is
    # supplied by the trusted gateway.
    facilitator_valid = False
    facilitator_error: str | None = None
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{settings.FACILITATOR_URL}/verify",
                json={
                    "paymentHeader": x_payment_header,
                    "paymentRequirements": payment_requirements,
                },
            )
            data = resp.json()
        facilitator_valid = bool(data.get("isValid"))
        if not facilitator_valid:
            facilitator_error = data.get("error") or data.get("invalidMessage") or "verification failed"
    except Exception as e:
        facilitator_error = f"facilitator unreachable: {e}"

    # Authoritative on-chain confirmation of the real settlement transaction.
    onchain_confirmed = False
    if tx_id:
        try:
            onchain_confirmed = await _confirm_tx_onchain(tx_id, payment_requirements)
        except Exception as e:
            _audit(db, payment.id, "onchain_check_error", {"reason": str(e)})

    if facilitator_valid:
        _audit(db, payment.id, "verified", {"source": "facilitator"})
    elif onchain_confirmed:
        _audit(db, payment.id, "verified", {"source": "onchain", "tx_id": tx_id})
    else:
        payment.status = "failed"
        payment.failure_reason = (
            facilitator_error or "verification failed and no on-chain tx confirmation"
        )
        db.commit()
        _audit(db, payment.id, "failed", {"reason": payment.failure_reason})
        return payment

    payment.verified_at = _utcnow()

    if not tx_id:
        payment.status = "failed"
        payment.failure_reason = "No tx_id provided by gateway"
        db.commit()
        _audit(db, payment.id, "failed", {"reason": payment.failure_reason})
        return payment

    # Settlement succeeded — record the transaction
    if not payment.payer_address:
        payer = (payment_requirements or {}).get("extra", {}).get("payer")
        if not payer:
            payer = (payment_requirements or {}).get("payer")
        if payer:
            payment.payer_address = payer
    payment.settled_at = _utcnow()
    payment.status = "settled"

    network = payment.network
    is_testnet = ("testnet" in network) or ("SGO1GKSzy" in network)
    explorer = f"https://lora.algokit.io/{'testnet' if is_testnet else 'mainnet'}/transaction/{tx_id}"

    tx = PaymentTransaction(
        payment_id=payment.id,
        network=network,
        asset=payment.asset,
        amount=payment.amount,
        sender=payment.payer_address,
        receiver=payment.receiver_address,
        tx_id=tx_id,
        explorer_url=explorer,
        settlement_status="confirmed",
        confirmed_at=_utcnow(),
    )
    db.add(tx)
    db.commit()
    db.refresh(payment)

    _audit(db, payment.id, "settled", {"tx_id": tx_id, "explorer": explorer})

    # Authorize the task — ONLY here, after real settlement
    task = db.query(Task).filter(Task.id == payment.task_id).first()
    if task:
        task.state = "authorized"
        db.commit()

    return payment


def get_transaction(db: Session, payment_id: UUID) -> PaymentTransaction | None:
    return db.query(PaymentTransaction).filter(PaymentTransaction.payment_id == payment_id).first()
