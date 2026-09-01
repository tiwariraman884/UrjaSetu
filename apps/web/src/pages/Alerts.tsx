import { useOverview } from "../hooks/useApi";
import Card from "../components/Card";
import StatusBadge from "../components/StatusBadge";

interface Alert {
  severity: "critical" | "warning" | "info";
  type: string;
  message: string;
  action: string;
}

export default function Alerts() {
  const { data } = useOverview(3000);

  if (!data) return <p>Loading system safety...</p>;

  const alerts: Alert[] = [];

  if (!data.device_online) {
    alerts.push({
      severity: "critical",
      type: "DEVICE OFFLINE",
      message: "Execution hardware is offline.",
      action: "Check device power and network connectivity.",
    });
  }

  if (!data.telemetry_fresh) {
    alerts.push({
      severity: "warning",
      type: "STALE TELEMETRY",
      message: "Latest telemetry is outside the freshness threshold.",
      action: "Restore sensor connectivity before execution.",
    });
  }

  if (data.payment_required) {
    alerts.push({
      severity: "info",
      type: "PAYMENT REQUIRED",
      message: "x402 authorization is required for paid execution.",
      action: "Complete the payment unlock flow.",
    });
  }

  if (data.optimization_opportunity) {
    alerts.push({
      severity: "info",
      type: "OPTIMIZATION OPPORTUNITY",
      message: "Flexible load scheduling can reduce grid dependency.",
      action: "Create an optimization task.",
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      severity: "info",
      type: "ALL CLEAR",
      message: "No active safety alerts.",
      action: "",
    });
  }

  return (
    <div>
      <h1>Safety Alerts</h1>

      <Card title="System Safety State" style={{ marginBottom: 16 }}>
        <div className="grid-3">
          <div>
            <span className="text-muted text-xs">DEVICE</span>
            <br />
            <strong className={data.device_online ? "text-green" : ""}>
              {data.device_online ? "ONLINE" : "OFFLINE"}
            </strong>
          </div>

          <div>
            <span className="text-muted text-xs">TELEMETRY</span>
            <br />
            <strong className={data.telemetry_fresh ? "text-green" : ""}>
              {data.telemetry_fresh ? "FRESH" : "STALE"}
            </strong>
          </div>

          <div>
            <span className="text-muted text-xs">AUTOMATION</span>
            <br />
            <strong>
              {data.device_online && data.telemetry_fresh
                ? "READY"
                : "LOCKED"}
            </strong>
          </div>
        </div>
      </Card>

      {alerts.map((alert, index) => (
        <Card
          key={`${alert.type}-${index}`}
          title={alert.type}
          style={{ marginBottom: 12 }}
        >
          <p>
            <StatusBadge
              status={
                alert.severity === "critical"
                  ? "fault"
                  : alert.severity === "warning"
                  ? "stale"
                  : "good"
              }
              label={alert.severity.toUpperCase()}
            />
          </p>

          <p style={{ marginTop: 8 }}>{alert.message}</p>

          {alert.action && (
            <div
              style={{
                padding: 10,
                background: "var(--bg-panel)",
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              <strong>Recommended:</strong> {alert.action}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
