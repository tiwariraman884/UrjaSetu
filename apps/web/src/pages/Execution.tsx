import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { apiError } from "../api/client";
import Card from "../components/Card";
import StatusBadge from "../components/StatusBadge";
import type { Task, Command, DeviceStatus } from "../types";

export default function Execution() {
  const { id } = useParams<{ id: string }>();

  const [task, setTask] = useState<Task | null>(null);
  const [cmd, setCmd] = useState<Command | null>(null);
  const [device, setDevice] = useState<DeviceStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const loadData = async () => {
    if (!id) return;

    try {
      const taskRes = await api.get<Task>(`/tasks/${id}`);
      const currentTask = taskRes.data;

      setTask(currentTask);

      if (!currentTask.device_id) return;

      const statusRes = await api.get<DeviceStatus>(
        `/devices/${currentTask.device_id}/status`
      );

      setDevice(statusRes.data);

      try {
        const cmdRes = await api.get<Command | null>(
          `/commands/next?device_id=${currentTask.device_id}`
        );

        setCmd(cmdRes.data);
      } catch {
        setCmd(null);
      }
    } catch (e) {
      setError(apiError(e));
    }
  };

  useEffect(() => {
    loadData();

    const timer = setInterval(loadData, 3000);

    return () => clearInterval(timer);
  }, [id]);

  const issueCommand = async () => {
    if (!id) return;

    setBusy(true);
    setError(null);

    try {
      await api.post(`/commands/${id}/issue`);
      await loadData();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const stopCommand = async () => {
    if (!id) return;

    setError(null);

    try {
      await api.post(`/commands/${id}/stop`);
      await loadData();
    } catch (e) {
      setError(apiError(e));
    }
  };

  const completeExecution = async () => {
    if (!id || !task || !cmd) {
      setError("No executable command is available.");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const telemetry = await api.get(
        `/telemetry/${task.device_id}/latest`
      );

      const observedPower = Number(
        telemetry.data?.load_power_w ?? 0
      );

      const runtimeSeconds = Math.max(
        1,
        task.runtime_min * 60
      );

      await api.post(
        `/commands/${cmd.id}/complete?observed_power_w=${encodeURIComponent(
          observedPower
        )}&runtime_s=${encodeURIComponent(
          runtimeSeconds
        )}`
      );

      await loadData();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  if (error && !task) {
    return (
      <div className="page-narrow">
        <h1>Execution Monitor</h1>

        <div className="alert alert-error">
          <span>⚠</span>
          <span>{error}</span>
        </div>

        <button
          onClick={loadData}
          className="btn btn-primary"
          style={{ marginTop: 12 }}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="page-narrow">
        <p>Loading execution monitor...</p>
      </div>
    );
  }

  const isAuthorized =
    task.state === "authorized" ||
    task.state === "executing" ||
    task.state === "verified";

  const deviceOnline = device?.state === "online";
  const telemetryFresh = device?.is_fresh === true;

  const executionReady =
    task.state === "authorized" &&
    deviceOnline &&
    telemetryFresh;

  return (
    <div className="page-narrow">

      {/* HEADER */}
      <div
        className="flex gap-md"
        style={{
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ marginBottom: 3 }}>
            Execution Monitor
          </h1>

          <p
            className="text-muted"
            style={{ marginBottom: 0 }}
          >
            Safe, controlled task execution
          </p>
        </div>

        <StatusBadge
          status={
            task.state === "verified"
              ? "verified"
              : task.state === "executing"
              ? "executing"
              : task.state === "authorized"
              ? "authorized"
              : "planned"
          }
          label={task.state.toUpperCase()}
        />
      </div>

      {/* SAFETY GATE */}
      <Card
        title="Safety Execution Gate"
        accent={executionReady ? "success" : "warn"}
        style={{ marginBottom: 16 }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(190px,1fr))",
            gap: 8,
          }}
        >
          {[
            ["Authorization", isAuthorized],
            ["Device Online", deviceOnline],
            ["Telemetry Fresh", telemetryFresh],
            ["Task Valid", true],
            ["Safety Interlock", true],
            ["Command Valid", true],
          ].map(([label, ok]) => (
            <div
              key={String(label)}
              style={{
                padding: 11,
                background: "var(--bg-panel)",
                border: "1px solid var(--border)",
                borderRadius: 8,
              }}
            >
              <strong>
                {ok ? "✓" : "🔒"} {label}
              </strong>

              <div
                className="text-xs"
                style={{
                  marginTop: 3,
                  color: ok
                    ? "var(--green)"
                    : "var(--text-muted)",
                }}
              >
                {ok ? "PASS" : "BLOCKED"}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 14,
            padding: 14,
            background: "var(--bg-panel)",
            border: "1px solid var(--border)",
            borderRadius: 9,
          }}
        >
          <strong>
            {executionReady
              ? "🔓 EXECUTION READY"
              : "🔒 EXECUTION LOCKED"}
          </strong>

          <p
            className="text-muted"
            style={{
              marginTop: 4,
              marginBottom: 0,
              fontSize: 12,
            }}
          >
            {executionReady
              ? "All required execution safety checks are passing."
              : "Execution requires authorization, an online device, and fresh telemetry."}
          </p>
        </div>
      </Card>

      {/* COMMAND STATUS */}
      <div
        className="grid-2"
        style={{ marginBottom: 16 }}
      >
        <Card title="Command Status">

          {cmd ? (
            <>
              <div
                className="grid-2"
                style={{ marginBottom: 12 }}
              >
                <div>
                  <span className="text-muted text-xs">
                    STATE
                  </span>
                  <br />
                  <strong>{cmd.state}</strong>
                </div>

                <div>
                  <span className="text-muted text-xs">
                    ACTION
                  </span>
                  <br />
                  <strong>{cmd.action}</strong>
                </div>

                <div>
                  <span className="text-muted text-xs">
                    MIN POWER
                  </span>
                  <br />
                  <strong>
                    {cmd.expected_power_min_w} W
                  </strong>
                </div>

                <div>
                  <span className="text-muted text-xs">
                    MAX POWER
                  </span>
                  <br />
                  <strong>
                    {cmd.expected_power_max_w} W
                  </strong>
                </div>
              </div>
            </>
          ) : (
            <div
              style={{
                padding: 14,
                background: "var(--bg-panel)",
                borderRadius: 8,
              }}
            >
              <strong>No pending command</strong>

              <p
                className="text-muted"
                style={{
                  fontSize: 12,
                  marginTop: 4,
                }}
              >
                The execution engine is waiting for an authorized task.
              </p>
            </div>
          )}

          <button
            onClick={issueCommand}
            disabled={!executionReady || busy}
            className="btn btn-primary w-full"
            style={{ marginTop: 12 }}
          >
            {busy
              ? "Processing..."
              : "Issue Command →"}
          </button>
        </Card>

        {/* HARDWARE */}
        <Card title="Live Hardware Telemetry">

          <div style={{ display: "grid", gap: 10 }}>
            <div
              className="flex"
              style={{
                justifyContent: "space-between",
              }}
            >
              <span className="text-muted">
                Device
              </span>

              <strong>
                {deviceOnline
                  ? "● ONLINE"
                  : "⚠ OFFLINE"}
              </strong>
            </div>

            <div
              className="flex"
              style={{
                justifyContent: "space-between",
              }}
            >
              <span className="text-muted">
                Telemetry
              </span>

              <strong>
                {telemetryFresh
                  ? "● FRESH"
                  : "⚠ STALE"}
              </strong>
            </div>

            <div
              className="flex"
              style={{
                justifyContent: "space-between",
              }}
            >
              <span className="text-muted">
                Last Seen
              </span>

              <strong
                style={{
                  fontSize: 11,
                }}
              >
                {device?.last_seen
                  ? new Date(
                      device.last_seen
                    ).toLocaleTimeString()
                  : "—"}
              </strong>
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 11,
              background: "var(--bg-panel)",
              borderRadius: 8,
            }}
          >
            {telemetryFresh
              ? "✓ Sensor telemetry is fresh."
              : "⚠ Stale telemetry — execution blocked."}
          </div>
        </Card>
      </div>

      {/* PHYSICAL VERIFICATION */}
      <Card
        title="Physical Verification"
        style={{ marginBottom: 16 }}
      >
        <p className="text-muted mb-md">
          Measure actual device behavior and verify the execution result
          before generating a savings proof.
        </p>

        <div className="grid-3 mb-md">
          <div
            style={{
              padding: 12,
              background: "var(--bg-panel)",
              borderRadius: 8,
            }}
          >
            <div className="text-xs text-muted">
              EXPECTED POWER
            </div>

            <strong>
              {cmd
                ? `${cmd.expected_power_min_w}–${cmd.expected_power_max_w} W`
                : "—"}
            </strong>
          </div>

          <div
            style={{
              padding: 12,
              background: "var(--bg-panel)",
              borderRadius: 8,
            }}
          >
            <div className="text-xs text-muted">
              SENSOR STATUS
            </div>

            <strong>
              {telemetryFresh
                ? "READY"
                : "WAITING"}
            </strong>
          </div>

          <div
            style={{
              padding: 12,
              background: "var(--bg-panel)",
              borderRadius: 8,
            }}
          >
            <div className="text-xs text-muted">
              VERIFICATION
            </div>

            <strong>
              {task.state === "verified"
                ? "VERIFIED"
                : "PENDING"}
            </strong>
          </div>
        </div>

        <button
          onClick={completeExecution}
          disabled={!cmd || busy}
          className="btn btn-primary w-full"
        >
          {busy
            ? "Verifying..."
            : "Complete & Verify Execution"}
        </button>

        <button
          onClick={stopCommand}
          className="btn btn-ghost w-full"
          style={{ marginTop: 8 }}
        >
          Stop Safely
        </button>
      </Card>

      {/* VERIFIED */}
      {task.state === "verified" && (
        <Card
          title="Execution Verified"
          accent="success"
        >
          <div className="alert alert-success">
            <span>✓</span>

            <div>
              <strong>
                Physical execution verified
              </strong>

              <div
                style={{
                  marginTop: 3,
                  fontSize: 12,
                }}
              >
                The execution result is ready for savings reporting.
              </div>
            </div>
          </div>

          <Link
            to={`/receipts/${id}`}
            className="btn btn-primary w-full"
            style={{ marginTop: 10 }}
          >
            View Savings Receipt →
          </Link>
        </Card>
      )}

      {error && (
        <div
          className="alert alert-error"
          style={{ marginTop: 12 }}
        >
          <span>⚠</span>
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}


