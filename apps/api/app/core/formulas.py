"""Energy & cost optimization formulas for the UrjaSetu bench rig.

All SI units: Volts (V), Amperes (A), Watts (W), Watt-hours (Wh).

grid_power_w(t) = load_power_w(t) - source_power_w(t)
import_power_w(t) = max(grid_power_w(t), 0)
export_power_w(t) = max(-grid_power_w(t), 0)
net_cost = sum(import_kwh * import_value) - sum(export_kwh * export_value)
incremental_benefit = baseline_same_work_net_cost - optimized_same_work_net_cost
indicative_import_carbon = imported_kwh * configured_CEA_factor
"""
from datetime import datetime, timedelta, timezone


def _as_naive_utc(dt: datetime) -> datetime:
    """Normalize to naive UTC for consistent comparisons."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt
    return dt.astimezone(timezone.utc).replace(tzinfo=None)


def instantaneous_power(voltage: float, current: float) -> float:
    """P = V * I"""
    return voltage * current


def grid_power(load_power_w: float, source_power_w: float) -> float:
    """grid_power = load - source (positive = importing from grid)."""
    return load_power_w - source_power_w


def import_power(load_power_w: float, source_power_w: float) -> float:
    return max(grid_power(load_power_w, source_power_w), 0.0)


def export_power(load_power_w: float, source_power_w: float) -> float:
    return max(-grid_power(load_power_w, source_power_w), 0.0)


def energy_watt_hours(power_w: float, hours: float) -> float:
    """E (Wh) = P (W) * t (h)"""
    return power_w * hours


def energy_wh_from_seconds(power_w: float, seconds: float) -> float:
    return power_w * (seconds / 3600.0)


def estimate_cost(energy_wh: float, price_per_kwh: float) -> float:
    """Cost from energy and tariff (price per kWh)."""
    return (energy_wh / 1000.0) * price_per_kwh


def net_cost(import_kwh: float, export_kwh: float,
             import_value: float, export_value: float) -> float:
    """net_cost = import_cost - export_value"""
    return (import_kwh * import_value) - (export_kwh * export_value)


def incremental_benefit(baseline_cost: float, optimized_cost: float) -> float:
    """Benefit = baseline - optimized. >0 means saving."""
    return baseline_cost - optimized_cost


def savings_wh(baseline_wh: float, optimized_wh: float) -> float:
    return max(0.0, baseline_wh - optimized_wh)


def savings_value(savings_wh: float, price_per_kwh: float) -> float:
    return (savings_wh / 1000.0) * price_per_kwh


def indicative_carbon_kg(imported_kwh: float, cea_factor: float) -> float:
    """Indicative carbon from imported energy (CEA factor kgCO2/kWh)."""
    return imported_kwh * cea_factor


def efficiency_pct(output_wh: float, input_wh: float) -> float:
    if input_wh <= 0:
        return 0.0
    return (output_wh / input_wh) * 100.0


def estimate_run_seconds(target_energy_wh: float, power_w: float) -> float:
    if power_w <= 0:
        return 0.0
    return (target_energy_wh / power_w) * 3600.0


def is_telemetry_fresh(timestamp: datetime, now: datetime, threshold_s: int) -> bool:
    """Check if telemetry is within freshness threshold."""
    age = (now - timestamp).total_seconds()
    return age <= threshold_s


def candidate_slots(earliest: datetime, deadline: datetime,
                    runtime_min: int, step_min: int = 15) -> list:
    """Generate candidate start times from earliest to (deadline - runtime).

    All datetimes are normalized to a consistent representation before any
    comparison to avoid ``TypeError: can't compare offset-naive and
    offset-aware datetimes`` when mixing SQLite (naive) and API/_utcnow
    (possibly aware) values.
    """
    if earliest is None or deadline is None or runtime_min <= 0:
        return []
    earliest = _as_naive_utc(earliest)
    deadline = _as_naive_utc(deadline)
    latest_start = deadline - timedelta(minutes=runtime_min)
    if latest_start < earliest:
        return []
    slots = []
    current = earliest
    step = timedelta(minutes=step_min)
    while current <= latest_start:
        slots.append(current)
        current += step
    return slots
