import { Link } from "react-router-dom";
import Card from "../components/Card";
import Metric from "../components/Metric";
import StatusBadge from "../components/StatusBadge";
import EnergyFlowDiagram from "../components/EnergyFlowDiagram";
import { useOverview } from "../hooks/useApi";
import EnergyFlowChart from "../components/EnergyFlowChart";

export default function Dashboard() {
  const { data, loading } = useOverview(3000);

  if (loading && !data) {
    return <p>Loading live energy system...</p>;
  }

  if (!data) {
    return (
      <div>
        <h1>UrjaSetu</h1>
        <div className="alert alert-error">
          Unable to load live telemetry.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        className="flex gap-md"
        style={{
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ marginBottom: 2 }}>UrjaSetu</h1>
          <p style={{ marginBottom: 0 }}>
            Intelligent energy orchestration for Bharat
          </p>
        </div>

        <div
          className="flex gap-sm"
          style={{ marginLeft: "auto", flexWrap: "wrap" }}
        >
          <StatusBadge
            status={data.device_online ? "online" : "fault"}
            label={data.device_online ? "Device Online" : "Device Offline"}
          />

          <StatusBadge
            status={data.telemetry_fresh ? "online" : "stale"}
            label={data.telemetry_fresh ? "Telemetry Fresh" : "Telemetry Stale"}
          />

          <span className="badge badge-ok">
            ● {data.optimization_opportunity ? "Automation Ready" : "Monitoring"}
          </span>
        </div>
      </div>

      <div
        className={
          data.device_online && data.telemetry_fresh
            ? "alert alert-success"
            : "alert alert-stale"
        }
        style={{ marginBottom: 16 }}
      >
        <span style={{ fontSize: "1.1rem" }}>
          {data.device_online && data.telemetry_fresh ? "✓" : "⚠"}
        </span>

        <div>
          <strong>
            {data.device_online && data.telemetry_fresh
              ? "ENERGY SYSTEM OPERATIONAL"
              : "EXECUTION SAFETY HOLD"}
          </strong>

          <div style={{ marginTop: 2 }}>
            {data.device_online && data.telemetry_fresh
              ? "Live telemetry is available and automation may be considered."
              : "Device or telemetry state is unsafe for automatic execution."}
          </div>
        </div>
      </div>

      <Card title="Live Energy Flow" style={{ marginBottom: 16 }}>
        <EnergyFlowDiagram data={data} />
      </Card>

      <div className="grid-auto-sm" style={{ marginBottom: 16 }}>
        <Card>
          <Metric
            label="Energy Today"
            value={data.today_energy_wh.toFixed(1)}
            unit="Wh"
            provenance="MEASURED"
            color="var(--accent)"
          />
        </Card>

        <Card>
          <Metric
            label="Carbon Avoided"
            value={data.indicative_carbon_kg.toFixed(3)}
            unit="kgCO₂"
            provenance="ESTIMATED"
            color="var(--green)"
          />
        </Card>

        <Card>
          <Metric
            label="Energy Saved"
            value={data.recent_savings_wh.toFixed(1)}
            unit="Wh"
            provenance="MEASURED"
            color="var(--green)"
          />
        </Card>
      </div>

      <div className="grid-2" style={{ marginBottom: 16 }}>
        <Card title="Optimization Opportunity" accent="success">
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 8,
              }}
            >
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: data.optimization_opportunity
                    ? "var(--green)"
                    : "var(--yellow)",
                  boxShadow: data.optimization_opportunity
                    ? "0 0 12px var(--green)"
                    : "none",
                }}
              />

              <strong>
                {data.optimization_opportunity
                  ? "Source energy opportunity detected"
                  : "No immediate optimization window"}
              </strong>
            </div>

            <p>
              Shift flexible loads into favorable source-energy windows
              while protecting critical loads.
            </p>

            <Link to="/tasks/new" className="btn btn-primary btn-sm">
              Create Optimization Task →
            </Link>
          </div>
        </Card>

        <Card title="Safety & Automation Gate">
          <div style={{ display: "grid", gap: 10 }}>
            <div className="flex" style={{ justifyContent: "space-between" }}>
              <span className="text-muted">Telemetry</span>
              <strong className={data.telemetry_fresh ? "text-green" : ""}>
                {data.telemetry_fresh ? "● Fresh" : "⚠ Stale"}
              </strong>
            </div>

            <div className="flex" style={{ justifyContent: "space-between" }}>
              <span className="text-muted">Device</span>
              <strong className={data.device_online ? "text-green" : ""}>
                {data.device_online ? "● Online" : "⚠ Offline"}
              </strong>
            </div>

            <div className="flex" style={{ justifyContent: "space-between" }}>
              <span className="text-muted">Safety Interlock</span>
              <strong className="text-green">● Active</strong>
            </div>

            <div className="flex" style={{ justifyContent: "space-between" }}>
              <span className="text-muted">Payment Override</span>
              <strong>● Blocked</strong>
            </div>

            <div
              style={{
                padding: 10,
                borderRadius: 8,
                background: "var(--bg-panel)",
                border: "1px solid var(--border)",
              }}
            >
              <strong>
                {data.device_online && data.telemetry_fresh
                  ? "✓ System eligible for task evaluation"
                  : "🔒 Automatic execution locked"}
              </strong>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Quick Actions">
        <div className="flex gap-sm" style={{ flexWrap: "wrap" }}>
          <Link to="/tasks/new" className="btn btn-primary">
            + New Task
          </Link>

          <Link to="/tasks" className="btn btn-ghost">
            View Tasks
          </Link>

          <Link to="/devices" className="btn btn-ghost">
            Devices
          </Link>

          <Link to="/analytics" className="btn btn-ghost">
            Analytics
          </Link>

          <Link to="/alerts" className="btn btn-ghost">
            Safety Alerts
          </Link>

          <Link to="/audit" className="btn btn-ghost">
            Audit Trail
          </Link>
        </div>
      </Card>

      <div
        style={{
          marginTop: 14,
          textAlign: "center",
          fontSize: "0.7rem",
          color: "var(--text-muted)",
        }}
      >
        LIVE PROTOTYPE · Telemetry refreshed every 3 seconds
      </div>
    </div>
  );
}
