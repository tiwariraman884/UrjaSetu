import { useEffect, useState } from "react";
import api from "../api/client";
import Card from "../components/Card";
import StatusBadge from "../components/StatusBadge";
import type { Device, DeviceStatus } from "../types";

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [statuses, setStatuses] = useState<Record<string, DeviceStatus>>({});

  const load = async () => {
    const r = await api.get<Device[]>("/devices/");
    setDevices(r.data);

    const pairs = await Promise.all(
      r.data.map(async device => {
        try {
          const s = await api.get<DeviceStatus>(
            `/devices/${device.id}/status`
          );
          return [device.id, s.data] as const;
        } catch {
          return null;
        }
      })
    );

    const next: Record<string, DeviceStatus> = {};

    for (const pair of pairs) {
      if (pair) next[pair[0]] = pair[1];
    }

    setStatuses(next);
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <h1>Devices</h1>

      {devices.length === 0 && (
        <Card>
          <p>No devices registered. Use Setup to register one.</p>
        </Card>
      )}

      {devices.map(device => {
        const status = statuses[device.id];

        return (
          <Card
            key={device.id}
            title={device.name}
            style={{ marginBottom: 12 }}
          >
            <div
              className="flex gap-sm"
              style={{
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div>
                <p style={{ marginBottom: 4 }}>
                  <strong>Hardware:</strong> {device.hardware_id}
                </p>

                <p style={{ marginBottom: 4 }}>
                  <strong>Type:</strong> {device.type} ·{" "}
                  <strong>Firmware:</strong> {device.firmware}
                </p>

                <p style={{ marginBottom: 0 }}>
                  <strong>Rated Power:</strong>{" "}
                  {device.rated_power_w} W
                </p>
              </div>

              <div style={{ textAlign: "right" }}>
                <StatusBadge
                  status={
                    status?.state === "online"
                      ? "online"
                      : "fault"
                  }
                  label={status?.state?.toUpperCase() || "UNKNOWN"}
                />

                <div
                  className="text-xs"
                  style={{ marginTop: 6 }}
                >
                  {status?.is_fresh
                    ? "● Telemetry Fresh"
                    : "⚠ Telemetry Stale"}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                paddingTop: 12,
                borderTop: "1px solid var(--border-subtle)",
                fontSize: 12,
              }}
            >
              <span className="text-muted">Last seen: </span>
              {status?.last_seen
                ? new Date(status.last_seen).toLocaleString()
                : "never"}

              {status?.freshness_age_s != null && (
                <span className="text-muted">
                  {" "}· Age {status.freshness_age_s.toFixed(1)}s
                </span>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
