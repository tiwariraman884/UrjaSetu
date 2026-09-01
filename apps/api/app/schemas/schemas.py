"""UrjaSetu Pydantic schemas - full PRD coverage."""
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field


class UserCreate(BaseModel):
    email: str
    password: str

class UserOut(BaseModel):
    id: UUID
    email: str
    is_active: bool
    role: str
    created_at: datetime
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class TokenData(BaseModel):
    user_id: str | None = None

class SiteCreate(BaseModel):
    name: str
    timezone: str = "Asia/Kolkata"
    demo_mode: bool = True
    import_value_per_kwh: float = 0.12
    export_value_per_kwh: float = 0.08
    cea_carbon_factor: float = 0.82
    freshness_threshold_s: int = 20

class SiteOut(SiteCreate):
    id: UUID
    user_id: UUID
    created_at: datetime
    class Config:
        from_attributes = True

class DeviceCreate(BaseModel):
    site_id: UUID
    name: str
    hardware_id: str
    type: str = "bench_rig"
    rated_power_w: float = 0.0
    min_power_w: float = 0.0
    max_current_a: float = 2.0
    min_voltage_v: float = 5.0
    max_voltage_v: float = 12.0

class DeviceOut(BaseModel):
    id: UUID
    site_id: UUID
    name: str
    hardware_id: str
    type: str
    firmware: str
    rated_power_w: float
    state: str
    last_seen: datetime | None
    created_at: datetime
    class Config:
        from_attributes = True

class DeviceStatus(BaseModel):
    device_id: UUID
    state: str
    last_seen: datetime | None
    is_fresh: bool
    freshness_age_s: float | None

class ChannelReading(BaseModel):
    voltage_v: float
    current_a: float
    power_w: float
    label: str = ""

class TelemetryIn(BaseModel):
    device_id: UUID
    timestamp: datetime
    sequence: int
    source: ChannelReading
    load: ChannelReading
    mode: str = "normal"
    faults: str | None = None
    provenance: str = "MEASURED"

class TelemetryOut(BaseModel):
    id: UUID
    device_id: UUID
    timestamp: datetime
    sequence: int
    source_voltage_v: float | None
    source_current_a: float | None
    source_power_w: float | None
    load_voltage_v: float | None
    load_current_a: float | None
    load_power_w: float | None
    grid_power_w: float | None
    import_power_w: float | None
    export_power_w: float | None
    quality: str
    provenance: str
    ingested_at: datetime
    class Config:
        from_attributes = True

class TelemetryValidation(BaseModel):
    is_valid: bool
    is_fresh: bool
    quality: str
    errors: list[str] = []

class TaskCreate(BaseModel):
    device_id: UUID
    name: str
    runtime_min: int
    earliest_start: datetime | None = None
    deadline: datetime | None = None
    priority: int = 5
    preference: str = "cost"

class TaskOut(BaseModel):
    id: UUID
    user_id: UUID
    device_id: UUID
    name: str
    runtime_min: int
    earliest_start: datetime | None
    deadline: datetime | None
    priority: int
    preference: str
    target_energy_wh: float
    state: str
    created_at: datetime
    class Config:
        from_attributes = True

class ProposalOut(BaseModel):
    id: UUID
    task_id: UUID
    candidate_slot: str
    baseline_cost: float
    planned_cost: float
    incremental_benefit: float
    assumptions: str | None
    confidence: str
    recommendation: str
    expires_at: datetime | None
    created_at: datetime
    class Config:
        from_attributes = True

class PlanResponse(BaseModel):
    task_id: UUID
    proposals: list[ProposalOut]
    telemetry_fresh: bool
    explanation: str

class DecisionCreate(BaseModel):
    approve_or_skip: str
    selected_slot: str | None = None

class DecisionOut(BaseModel):
    id: UUID
    proposal_id: UUID
    actor: str
    approve_or_skip: str
    selected_slot: str | None
    decided_at: datetime
    class Config:
        from_attributes = True

class CommandOut(BaseModel):
    id: str
    task_id: UUID
    device_id: UUID
    action: str
    issued_at: datetime
    expires_at: datetime
    expected_power_min_w: float
    expected_power_max_w: float
    state: str
    class Config:
        from_attributes = True

class CommandReceipt(BaseModel):
    command_id: str
    device_id: UUID
    ack: bool
    observed_power_w: float = 0.0
    runtime_s: float = 0.0

class OutcomeOut(BaseModel):
    id: UUID
    command_id: str
    observed_start: datetime | None
    observed_stop: datetime | None
    runtime_s: float
    energy_wh: float
    observed_power_w: float
    verification_state: str
    reason: str | None
    class Config:
        from_attributes = True

class SavingsReceiptOut(BaseModel):
    id: UUID
    task_id: UUID
    baseline_method: str
    baseline_cost: float
    optimized_cost: float
    incremental_benefit: float
    energy_wh: float
    indicative_carbon_kg: float
    provenance: str
    payment_id: UUID | None
    signature: str | None
    created_at: datetime
    class Config:
        from_attributes = True

class PaymentRequirement(BaseModel):
    x402_version: int = 2
    scheme: str = "exact"
    network: str = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="
    asset: str = "USDC"
    amount: float
    receiver_address: str
    resource: str
    facilitator: str = "goplausible"

class PaymentOut(BaseModel):
    id: UUID
    task_id: UUID
    user_id: UUID
    x402_version: int
    scheme: str
    network: str
    asset: str
    amount: float
    payer_address: str | None
    receiver_address: str | None
    facilitator: str
    resource: str | None
    status: str
    failure_reason: str | None
    created_at: datetime
    verified_at: datetime | None
    settled_at: datetime | None
    class Config:
        from_attributes = True

class PaymentVerifyRequest(BaseModel):
    payment_id: UUID
    x_payment_header: str
    payment_requirements: dict
    tx_id: str | None = None
    task_id: str | None = None

class PaymentTransactionOut(BaseModel):
    id: UUID
    payment_id: UUID
    network: str
    asset: str
    amount: float
    sender: str | None
    receiver: str | None
    tx_id: str | None
    explorer_url: str | None
    settlement_status: str
    confirmed_at: datetime | None
    class Config:
        from_attributes = True

class Overview(BaseModel):
    system_healthy: bool
    device_online: bool
    telemetry_fresh: bool
    source_power_w: float
    load_power_w: float
    import_power_w: float
    export_power_w: float
    today_energy_wh: float
    indicative_carbon_kg: float
    active_task: str | None
    optimization_opportunity: bool
    recent_savings_wh: float
    payment_required: bool

class HealthOut(BaseModel):
    status: str
    service: str
    version: str

class ReadyOut(BaseModel):
    ready: bool
    database: bool
    payment_gateway: bool
    facilitator: bool
