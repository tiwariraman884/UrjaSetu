"""Optimizer and energy formula tests."""
from app.core import formulas
from datetime import datetime, timezone, timedelta


def test_instantaneous_power():
    assert formulas.instantaneous_power(12.0, 2.0) == 24.0


def test_grid_power():
    assert formulas.grid_power(10.0, 6.0) == 4.0  # importing 4W


def test_import_export_power():
    assert formulas.import_power(10.0, 6.0) == 4.0
    assert formulas.export_power(6.0, 10.0) == 4.0


def test_energy_watt_hours():
    assert formulas.energy_watt_hours(100.0, 2.0) == 200.0


def test_estimate_cost():
    assert round(formulas.estimate_cost(1000.0, 0.12), 4) == 0.12


def test_incremental_benefit():
    assert abs(formulas.incremental_benefit(0.12, 0.08) - 0.04) < 1e-9


def test_savings_wh():
    assert formulas.savings_wh(150.0, 100.0) == 50.0
    assert formulas.savings_wh(80.0, 100.0) == 0.0


def test_indicative_carbon():
    assert formulas.indicative_carbon_kg(1.0, 0.82) == 0.82


def test_estimate_run_seconds():
    assert formulas.estimate_run_seconds(100.0, 50.0) == 7200.0


def test_candidate_slots():
    e = datetime(2025, 1, 1, 10, 0, tzinfo=timezone.utc)
    d = datetime(2025, 1, 1, 12, 0, tzinfo=timezone.utc)
    slots = formulas.candidate_slots(e, d, 30, step_min=30)
    assert len(slots) > 0
    assert slots[0] == e


def test_telemetry_freshness():
    now = datetime.now(timezone.utc)
    fresh = now - timedelta(seconds=10)
    stale = now - timedelta(seconds=60)
    assert formulas.is_telemetry_fresh(fresh, now, 20) == True
    assert formulas.is_telemetry_fresh(stale, now, 20) == False
