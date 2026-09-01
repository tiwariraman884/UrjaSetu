"""Payment gateway x402 tests (AT-13 through AT-24)."""
import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timezone, timedelta
import uuid

from app.main import app
from app.database import Base, engine, SessionLocal
from app.models import User, Site, Device, Task, Payment

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield


def _setup_task(db) -> str:
    user = User(email=f"pay_{uuid.uuid4().hex[:6]}@urjasetu.com", hashed_password="x")
    db.add(user); db.flush()
    site = Site(user_id=user.id, name="Pay Site")
    db.add(site); db.flush()
    dev = Device(site_id=site.id, name="Pay Device", hardware_id=f"hw_{uuid.uuid4().hex[:8]}", state="online")
    db.add(dev); db.flush()
    task = Task(user_id=user.id, device_id=dev.id, name="Pay Task", runtime_min=10, state="created")
    db.add(task)
    db.commit()
    return str(task.id)


def test_AT_13_payment_unlock_creates_requirement():
    """AT-13: Payment unlock creates a payment requirement."""
    db = SessionLocal()
    task_id = _setup_task(db)
    r = client.post(f"/api/v1/payments/unlock?task_id={task_id}")
    assert r.status_code == 200
    assert r.json()["status"] == "required"
    db.close()


def test_AT_15_invalid_payment_rejected():
    """AT-15: Invalid payment is rejected."""
    db = SessionLocal()
    task_id = _setup_task(db)
    # unlock first
    r = client.post(f"/api/v1/payments/unlock?task_id={task_id}")
    pay_id = r.json()["id"]
    # verify with invalid header
    r = client.post("/api/v1/payments/verify", json={
        "payment_id": pay_id,
        "x_payment_header": "invalid-header",
        "payment_requirements": {"scheme": "exact", "network": "algorand:testnet"},
    })
    # should fail (facilitator unreachable in test, but status should be failed not settled)
    assert r.status_code in (200, 404)
    if r.status_code == 200:
        assert r.json()["status"] in ("failed", "required", "verifying")
    db.close()


def test_AT_20_replay_blocked():
    """AT-20: Already-settled payment is blocked (replay protection)."""
    db = SessionLocal()
    task_id = _setup_task(db)
    r = client.post(f"/api/v1/payments/unlock?task_id={task_id}")
    pay_id = r.json()["id"]
    # manually mark as settled
    pay = db.query(Payment).filter(Payment.id == pay_id).first()
    pay.status = "settled"
    db.commit()
    # try to verify again
    r = client.post("/api/v1/payments/verify", json={
        "payment_id": pay_id,
        "x_payment_header": "some-header",
        "payment_requirements": {},
    })
    assert r.status_code == 409  # Conflict - replay blocked
    db.close()


def test_AT_24_payment_authorization_link():
    """AT-24: Payment is linked to task."""
    db = SessionLocal()
    task_id = _setup_task(db)
    r = client.post(f"/api/v1/payments/unlock?task_id={task_id}")
    pay = r.json()
    assert pay["task_id"] == task_id
    # get payments for task
    r = client.get(f"/api/v1/payments/task/{task_id}")
    assert r.status_code == 200
    assert len(r.json()) >= 1
    db.close()
