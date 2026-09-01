/** UrjaSetu shared types. */

export type Provenance = "MEASURED" | "ESTIMATED" | "FORECAST" | "SIMULATED" | "ILLUSTRATIVE";

export interface User { id: string; email: string; is_active: boolean; role: string; created_at: string; }
export interface Token { access_token: string; token_type: string; }

export interface Site {
  id: string; user_id: string; name: string; timezone: string;
  demo_mode: boolean; import_value_per_kwh: number; export_value_per_kwh: number;
  cea_carbon_factor: number; freshness_threshold_s: number; created_at: string;
}

export interface Device {
  id: string; site_id: string; name: string; hardware_id: string; type: string;
  firmware: string; rated_power_w: number; state: string; last_seen: string | null;
  created_at: string;
}

export interface DeviceStatus {
  device_id: string; state: string; last_seen: string | null;
  is_fresh: boolean; freshness_age_s: number | null;
}

export interface ChannelReading { voltage_v: number; current_a: number; power_w: number; label: string; }

export interface Telemetry {
  id: string; device_id: string; timestamp: string; sequence: number;
  source_voltage_v: number | null; source_current_a: number | null; source_power_w: number | null;
  load_voltage_v: number | null; load_current_a: number | null; load_power_w: number | null;
  grid_power_w: number | null; import_power_w: number | null; export_power_w: number | null;
  quality: string; provenance: string; ingested_at: string;
}

export interface TelemetryIn {
  device_id: string; timestamp: string; sequence: number;
  source: ChannelReading; load: ChannelReading;
  mode: string; faults: string | null; provenance: string;
}

export interface Task {
  id: string; user_id: string; device_id: string; name: string;
  runtime_min: number; earliest_start: string | null; deadline: string | null;
  priority: number; preference: string; target_energy_wh: number;
  state: string; created_at: string;
}

export interface Proposal {
  id: string; task_id: string; candidate_slot: string;
  baseline_cost: number; planned_cost: number; incremental_benefit: number;
  assumptions: string | null; confidence: string; recommendation: string;
  expires_at: string | null; created_at: string;
}

export interface PlanResponse {
  task_id: string; proposals: Proposal[]; telemetry_fresh: boolean; explanation: string;
}

export interface Decision {
  id: string; proposal_id: string; actor: string; approve_or_skip: string;
  selected_slot: string | null; decided_at: string;
}

export interface Command {
  id: string; task_id: string; device_id: string; action: string;
  issued_at: string; expires_at: string;
  expected_power_min_w: number; expected_power_max_w: number; state: string;
}

export interface Outcome {
  id: string; command_id: string; observed_start: string | null; observed_stop: string | null;
  runtime_s: number; energy_wh: number; observed_power_w: number;
  verification_state: string; reason: string | null;
}

export interface SavingsReceipt {
  id: string; task_id: string; baseline_method: string;
  baseline_cost: number; optimized_cost: number; incremental_benefit: number;
  energy_wh: number; indicative_carbon_kg: number; provenance: string;
  payment_id: string | null; signature: string | null; created_at: string;
}

export interface Payment {
  id: string; task_id: string; user_id: string; x402_version: number;
  scheme: string; network: string; asset: string; amount: number;
  payer_address: string | null; receiver_address: string | null;
  facilitator: string; resource: string | null; status: string;
  failure_reason: string | null; created_at: string;
  verified_at: string | null; settled_at: string | null;
}

export interface PaymentTransaction {
  id: string; payment_id: string; network: string; asset: string; amount: number;
  sender: string | null; receiver: string | null; tx_id: string | null;
  explorer_url: string | null; settlement_status: string; confirmed_at: string | null;
}

export interface Overview {
  system_healthy: boolean; device_online: boolean; telemetry_fresh: boolean;
  source_power_w: number; load_power_w: number; import_power_w: number; export_power_w: number;
  today_energy_wh: number; indicative_carbon_kg: number;
  active_task: string | null; optimization_opportunity: boolean;
  recent_savings_wh: number; payment_required: boolean;
}

export interface HistoryEvent { time: string; type: string; entity: string; detail: string; }

export interface PaymentRequirement {
  x402_version: number; scheme: string; network: string; asset: string;
  amount: number; receiver_address: string; resource: string; facilitator: string;
}

export interface OptimizeResponse {
  paymentId: string; taskId: string; paymentStatus: string; transactionId?: string;
  network: string; asset: string; amount: number;
  authorizationStatus: "authorized" | "denied";
  optimizationResult?: { recommendation: string; benefit: number; slot: string };
}
