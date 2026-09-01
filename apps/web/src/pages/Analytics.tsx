import { useOverview } from "../hooks/useApi";
import Card from "../components/Card";
import Metric from "../components/Metric";

export default function Analytics() {
  const { data, loading } = useOverview(3000);

  if (loading && !data) return <p>Loading live analytics...</p>;
  if (!data) return <p>No telemetry available.</p>;

  const forecast = [
    { hour: "08:00", value: Math.max(10, data.source_power_w - 8) },
    { hour: "09:00", value: data.source_power_w + 6 },
    { hour: "10:00", value: data.source_power_w + 12 },
    { hour: "11:00", value: data.source_power_w + 18 },
    { hour: "12:00", value: data.source_power_w + 10 },
    { hour: "13:00", value: data.source_power_w + 4 },
  ];

  const max = Math.max(...forecast.map(x => x.value), 1);

  return (
    <div>
      <h1>Energy Analytics</h1>

      <div className="grid-auto-sm" style={{ marginBottom: 16 }}>
        <Card>
          <Metric
            label="Source Power"
            value={data.source_power_w.toFixed(1)}
            unit="W"
            provenance="MEASURED"
            color="var(--green)"
          />
        </Card>

        <Card>
          <Metric
            label="Load Power"
            value={data.load_power_w.toFixed(1)}
            unit="W"
            provenance="MEASURED"
            color="var(--yellow)"
          />
        </Card>

        <Card>
          <Metric
            label="Grid Import"
            value={data.import_power_w.toFixed(1)}
            unit="W"
            provenance="DERIVED"
          />
        </Card>

        <Card>
          <Metric
            label="Grid Export"
            value={data.export_power_w.toFixed(1)}
            unit="W"
            provenance="DERIVED"
          />
        </Card>
      </div>

      <Card title="Source Energy Forecast" provenance="FORECAST">
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 12,
            height: 220,
            padding: "20px 10px 10px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {forecast.map(item => (
            <div
              key={item.hour}
              style={{
                flex: 1,
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span
                className="text-xs text-muted"
                style={{ fontSize: 10 }}
              >
                {item.value.toFixed(0)}W
              </span>

              <div
                title={`${item.hour}: ${item.value.toFixed(0)} W`}
                style={{
                  width: "70%",
                  maxWidth: 50,
                  height: `${Math.max(8, (item.value / max) * 160)}px`,
                  background: "var(--accent)",
                  borderRadius: "6px 6px 2px 2px",
                  opacity: 0.9,
                }}
              />

              <span
                className="text-xs text-muted"
                style={{ fontSize: 10 }}
              >
                {item.hour}
              </span>
            </div>
          ))}
        </div>

        <p
          className="text-muted"
          style={{ marginTop: 12, fontSize: 12 }}
        >
          Forecast values are prototype estimates derived from the current
          source-power signal. Replace with historical/model data in pilot
          deployment.
        </p>
      </Card>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <Card title="Carbon Impact">
          <Metric
            label="Indicative Carbon Avoided"
            value={data.indicative_carbon_kg.toFixed(3)}
            unit="kgCO₂"
            provenance="ESTIMATED"
            color="var(--green)"
          />

          <p className="text-muted" style={{ fontSize: 11, marginTop: 10 }}>
            Estimated from grid energy displaced using the configured site
            carbon factor.
          </p>
        </Card>

        <Card title="Savings">
          <Metric
            label="Recent Energy Saved"
            value={data.recent_savings_wh.toFixed(1)}
            unit="Wh"
            provenance="MEASURED"
            color="var(--accent)"
          />

          <p className="text-muted" style={{ fontSize: 11, marginTop: 10 }}>
            Savings become reportable only after execution verification.
          </p>
        </Card>
      </div>
    </div>
  );
}
