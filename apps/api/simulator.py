#!/usr/bin/env python3
"""UrjaSetu Device Simulator — mimics ESP32 + 2x INA219 + low-voltage DC load.

Simulates a protected 5-12V bench rig without hardware:
- Publishes telemetry (source + load channels) to the FastAPI backend
- Polls for commands and acknowledges with observed power
- Supports manual cutoff, fault injection, stale-data simulation

Usage:
  python simulator.py --device-id <uuid> --api http://localhost:8000

IMPORTANT: This is SIMULATED data. Every payload is labeled provenance=SIMULATED.
"""
import argparse
import json
import random
import time
import uuid
from datetime import datetime, timezone
import urllib.request

API = "http://localhost:8000"
DEVICE_ID = None
SEQUENCE = 0
LOAD_ENABLED = False
FAULT = False
ENERGY_WH = 0.0


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def post(url: str, data: dict) -> dict:
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return json.loads(resp.read())


def get(url: str) -> dict | None:
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            return json.loads(resp.read())
    except Exception:
        return None
def get_latest_sequence() -> int:
    try:
        data = get(f"{API}/api/v1/telemetry/{DEVICE_ID}/latest")
        if data and data.get("sequence") is not None:
            return int(data["sequence"])
    except Exception as e:
        print(f"  [seq] ERROR: {e}")
    return 0

def read_source() -> dict:
    """Simulate INA219 source channel (5-12V solar/battery)."""
    v = random.uniform(5.5, 11.5)
    i = random.uniform(0.1, 1.5) if not FAULT else 0.0
    return {"voltage_v": round(v, 3), "current_a": round(i, 3),
            "power_w": round(v * i, 3), "label": "source_panel"}


def read_load() -> dict:
    """Simulate INA219 load channel (pump on 5-12V rail)."""
    if LOAD_ENABLED and not FAULT:
        v = random.uniform(7.0, 11.0)
        i = random.uniform(0.3, 1.8)
    else:
        v = random.uniform(5.0, 6.0)
        i = 0.0
    return {"voltage_v": round(v, 3), "current_a": round(i, 3),
            "power_w": round(v * i, 3), "label": "load_pump"}


def publish_telemetry():
    global SEQUENCE, ENERGY_WH
    SEQUENCE += 1
    source = read_source()
    load = read_load()
    p = load["power_w"]

    if LOAD_ENABLED and not FAULT:
        ENERGY_WH += p * (2.0 / 3600.0)  # 2s interval

    payload = {
        "device_id": DEVICE_ID,
        "timestamp": now_iso(),
        "sequence": SEQUENCE,
        "source": source,
        "load": load,
        "mode": "normal" if not FAULT else "fault",
        "faults": "overcurrent" if FAULT else None,
        "provenance": "SIMULATED",
    }
    try:
        post(f"{API}/api/v1/telemetry/", payload)
        print(f"  [telem] seq={SEQUENCE} src={source['power_w']}W load={load['power_w']}W")
    except Exception as e:
        print(f"  [telem] ERROR: {e}")


def poll_commands():
    global LOAD_ENABLED
    cmd = get(f"{API}/api/v1/commands/next?device_id={DEVICE_ID}")
    if not cmd:
        return
    print(f"  [cmd] received: {cmd['action']} (id={cmd['id'][:8]})")
    if cmd["action"] == "start" and not FAULT:
        LOAD_ENABLED = True
    elif cmd["action"] == "stop":
        LOAD_ENABLED = False
    elif cmd["action"] == "estop":
        LOAD_ENABLED = False
        globals()["FAULT"] = True

    # Ack with observed power
    observed = read_load()["power_w"] if LOAD_ENABLED else 0.0
    try:
        post(f"{API}/api/v1/commands/{cmd['id']}/receipt", {
            "command_id": cmd["id"],
            "device_id": DEVICE_ID,
            "ack": True,
            "observed_power_w": observed,
            "runtime_s": 0.0,
        })
        print(f"  [cmd] acked, observed={observed}W")
    except Exception as e:
        print(f"  [cmd] ack ERROR: {e}")


def main():
    parser = argparse.ArgumentParser(description="UrjaSetu Device Simulator")
    parser.add_argument("--api", default="http://localhost:8000")
    parser.add_argument("--device-id", required=True, help="Device UUID")
    parser.add_argument("--interval", type=float, default=2.0)
    args = parser.parse_args()

    globals()["API"] = args.api
    globals()["DEVICE_ID"] = args.device_id

    # Continue from the last sequence stored by the backend.
    globals()["SEQUENCE"] = get_latest_sequence()

    print(f"  Starting sequence: {SEQUENCE + 1}")

    print(f"=== UrjaSetu Device Simulator ===")
    print(f"  API: {API}")
    print(f"  Device: {DEVICE_ID}")
    print(f"  Interval: {args.interval}s")
    print(f"  Data: SIMULATED (provenance=SIMULATED)")
    print(f"  Safety: 5-12V DC bench rig only, NOT household mains")
    print()

    while True:
        publish_telemetry()
        poll_commands()
        time.sleep(args.interval)


if __name__ == "__main__":
    main()
