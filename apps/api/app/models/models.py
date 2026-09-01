"""UrjaSetu SQLAlchemy models - full PRD schema.

Entities: User, Site, Device, Telemetry, Task, Proposal, Decision,
Command, Outcome, SavingsReceipt, Payment, PaymentTransaction, PaymentAuditEvent.
"""
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, Float, DateTime, ForeignKey, Boolean, Integer,
    Text, Index, UniqueConstraint,
)
from sqlalchemy import String as _PgUUID  # portable: use String for both SQLite and PostgreSQL
from sqlalchemy.orm import relationship

from app.database import Base


def _uid() -> str:
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"
    id = Column(_PgUUID, primary_key=True, default=_uid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String, default="user")
    created_at = Column(DateTime, default=datetime.utcnow)

    sites = relationship("Site", back_populates="user", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="user", cascade="all, delete-orphan")


class Site(Base):
    __tablename__ = "sites"
    id = Column(_PgUUID, primary_key=True, default=_uid)
    user_id = Column(_PgUUID, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    timezone = Column(String, default="Asia/Kolkata")
    tariff_profile_id = Column(String, nullable=True)
    demo_mode = Column(Boolean, default=True)
    import_value_per_kwh = Column(Float, default=0.12)
    export_value_per_kwh = Column(Float, default=0.08)
    cea_carbon_factor = Column(Float, default=0.82)
    freshness_threshold_s = Column(Integer, default=20)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sites")
    devices = relationship("Device", back_populates="site", cascade="all, delete-orphan")


class Device(Base):
    __tablename__ = "devices"
    id = Column(_PgUUID, primary_key=True, default=_uid)
    site_id = Column(_PgUUID, ForeignKey("sites.id"), nullable=False)
    name = Column(String, nullable=False)
    type = Column(String, default="bench_rig")
    hardware_id = Column(String, unique=True, index=True, nullable=False)
    firmware = Column(String, default="0.1.0")
    credential_ref = Column(String, nullable=True)
    rated_power_w = Column(Float, default=0.0)
    min_power_w = Column(Float, default=0.0)
    max_current_a = Column(Float, default=2.0)
    min_voltage_v = Column(Float, default=5.0)
    max_voltage_v = Column(Float, default=12.0)
    last_seen = Column(DateTime, nullable=True)
    state = Column(String, default="offline")
    created_at = Column(DateTime, default=datetime.utcnow)

    site = relationship("Site", back_populates="devices")
    telemetry = relationship("Telemetry", back_populates="device", cascade="all, delete-orphan")
    commands = relationship("Command", back_populates="device", cascade="all, delete-orphan")


class Telemetry(Base):
    __tablename__ = "telemetry"
    id = Column(_PgUUID, primary_key=True, default=_uid)
    device_id = Column(_PgUUID, ForeignKey("devices.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    sequence = Column(Integer, nullable=False)
    source_voltage_v = Column(Float, nullable=True)
    source_current_a = Column(Float, nullable=True)
    source_power_w = Column(Float, nullable=True)
    source_label = Column(String, nullable=True)
    load_voltage_v = Column(Float, nullable=True)
    load_current_a = Column(Float, nullable=True)
    load_power_w = Column(Float, nullable=True)
    load_label = Column(String, nullable=True)
    grid_power_w = Column(Float, nullable=True)
    import_power_w = Column(Float, nullable=True)
    export_power_w = Column(Float, nullable=True)
    mode = Column(String, default="normal")
    faults = Column(String, nullable=True)
    provenance = Column(String, default="MEASURED")
    quality = Column(String, default="good")
    ingested_at = Column(DateTime, default=datetime.utcnow)

    device = relationship("Device", back_populates="telemetry")

    __table_args__ = (
        Index("ix_telemetry_device_seq", "device_id", "sequence"),
        Index("ix_telemetry_device_ts", "device_id", "timestamp"),
        UniqueConstraint("device_id", "sequence", name="uq_telemetry_device_seq"),
    )


class Task(Base):
    __tablename__ = "tasks"
    id = Column(_PgUUID, primary_key=True, default=_uid)
    user_id = Column(_PgUUID, ForeignKey("users.id"), nullable=False)
    device_id = Column(_PgUUID, ForeignKey("devices.id"), nullable=False)
    name = Column(String, nullable=False)
    runtime_min = Column(Integer, nullable=False)
    earliest_start = Column(DateTime, nullable=True)
    deadline = Column(DateTime, nullable=True)
    priority = Column(Integer, default=5)
    preference = Column(String, default="cost")
    target_energy_wh = Column(Float, default=0.0)
    state = Column(String, default="created")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="tasks")
    proposals = relationship("Proposal", back_populates="task", cascade="all, delete-orphan")
    commands = relationship("Command", back_populates="task", cascade="all, delete-orphan")
    receipt = relationship("SavingsReceipt", back_populates="task", uselist=False)
    payments = relationship("Payment", back_populates="task", cascade="all, delete-orphan")


class Proposal(Base):
    __tablename__ = "proposals"
    id = Column(_PgUUID, primary_key=True, default=_uid)
    task_id = Column(_PgUUID, ForeignKey("tasks.id"), nullable=False)
    candidate_slot = Column(String, nullable=False)
    baseline_cost = Column(Float, default=0.0)
    planned_cost = Column(Float, default=0.0)
    incremental_benefit = Column(Float, default=0.0)
    assumptions = Column(Text, nullable=True)
    confidence = Column(String, default="medium")
    recommendation = Column(String, default="SUGGESTED")
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="proposals")
    decisions = relationship("Decision", back_populates="proposal", cascade="all, delete-orphan")


class Decision(Base):
    __tablename__ = "decisions"
    id = Column(_PgUUID, primary_key=True, default=_uid)
    proposal_id = Column(_PgUUID, ForeignKey("proposals.id"), nullable=False)
    actor = Column(String, nullable=False)
    approve_or_skip = Column(String, nullable=False)
    selected_slot = Column(String, nullable=True)
    decided_at = Column(DateTime, default=datetime.utcnow)

    proposal = relationship("Proposal", back_populates="decisions")


class Command(Base):
    __tablename__ = "commands"
    id = Column(String, primary_key=True, default=_uid)
    task_id = Column(_PgUUID, ForeignKey("tasks.id"), nullable=False)
    device_id = Column(_PgUUID, ForeignKey("devices.id"), nullable=False)
    action = Column(String, nullable=False)
    issued_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    expected_power_min_w = Column(Float, default=0.0)
    expected_power_max_w = Column(Float, default=0.0)
    state = Column(String, default="issued")
    idempotency_key = Column(String, unique=True, index=True, nullable=False)

    task = relationship("Task", back_populates="commands")
    device = relationship("Device", back_populates="commands")
    outcome = relationship("Outcome", back_populates="command", uselist=False)


class Outcome(Base):
    __tablename__ = "outcomes"
    id = Column(_PgUUID, primary_key=True, default=_uid)
    command_id = Column(String, ForeignKey("commands.id"), nullable=False)
    observed_start = Column(DateTime, nullable=True)
    observed_stop = Column(DateTime, nullable=True)
    runtime_s = Column(Float, default=0.0)
    energy_wh = Column(Float, default=0.0)
    observed_power_w = Column(Float, default=0.0)
    verification_state = Column(String, default="pending")
    reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    command = relationship("Command", back_populates="outcome")


class SavingsReceipt(Base):
    __tablename__ = "savings_receipts"
    id = Column(_PgUUID, primary_key=True, default=_uid)
    task_id = Column(_PgUUID, ForeignKey("tasks.id"), unique=True, nullable=False)
    baseline_method = Column(String, default="naive_slot")
    baseline_cost = Column(Float, default=0.0)
    optimized_cost = Column(Float, default=0.0)
    incremental_benefit = Column(Float, default=0.0)
    energy_wh = Column(Float, default=0.0)
    indicative_carbon_kg = Column(Float, default=0.0)
    provenance = Column(String, default="MEASURED")
    payment_id = Column(_PgUUID, ForeignKey("payments.id"), nullable=True)
    signature = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    task = relationship("Task", back_populates="receipt")
    payment = relationship("Payment", foreign_keys=[payment_id])


class Payment(Base):
    __tablename__ = "payments"
    id = Column(_PgUUID, primary_key=True, default=_uid)
    task_id = Column(_PgUUID, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(_PgUUID, ForeignKey("users.id"), nullable=False)
    x402_version = Column(Integer, default=2)
    scheme = Column(String, default="exact")
    network = Column(String, default="algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=")
    asset = Column(String, default="USDC")
    amount = Column(Float, nullable=False)
    payer_address = Column(String, nullable=True)
    receiver_address = Column(String, nullable=True)
    facilitator = Column(String, default="goplausible")
    resource = Column(String, nullable=True)
    status = Column(String, default="required")
    failure_reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    verified_at = Column(DateTime, nullable=True)
    settled_at = Column(DateTime, nullable=True)

    task = relationship("Task", back_populates="payments")
    transactions = relationship("PaymentTransaction", back_populates="payment", cascade="all, delete-orphan")
    audit_events = relationship("PaymentAuditEvent", back_populates="payment", cascade="all, delete-orphan")


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"
    id = Column(_PgUUID, primary_key=True, default=_uid)
    payment_id = Column(_PgUUID, ForeignKey("payments.id"), nullable=False)
    network = Column(String, default="algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=")
    asset = Column(String, default="USDC")
    amount = Column(Float, nullable=False)
    sender = Column(String, nullable=True)
    receiver = Column(String, nullable=True)
    tx_id = Column(String, unique=True, index=True, nullable=True)
    explorer_url = Column(String, nullable=True)
    settlement_status = Column(String, default="pending")
    confirmed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    payment = relationship("Payment", back_populates="transactions")


class PaymentAuditEvent(Base):
    __tablename__ = "payment_audit_events"
    id = Column(_PgUUID, primary_key=True, default=_uid)
    payment_id = Column(_PgUUID, ForeignKey("payments.id"), nullable=False)
    event_type = Column(String, nullable=False)
    event_metadata = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    payment = relationship("Payment", back_populates="audit_events")

    __table_args__ = (Index("ix_audit_payment", "payment_id", "created_at"),)






