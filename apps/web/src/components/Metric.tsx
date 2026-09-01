/** Metric display — big value with unit, label, and provenance. */
interface MetricProps {
  label: string;
  value: string | number;
  unit?: string;
  provenance?: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}

const provColors: Record<string, string> = {
  MEASURED:  "prov-measured",
  DERIVED:   "prov-derived",
  ESTIMATED: "prov-estimated",
  SIMULATED: "prov-simulated",
  FORECAST:  "prov-forecast",
};

export default function Metric({ label, value, unit, provenance, color, size = "md" }: MetricProps) {
  const fontSize = size === "lg" ? "2.4rem" : size === "sm" ? "1.2rem" : "1.8rem";
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span className="metric-value" style={{ fontSize, color: color || "var(--text-primary)" }}>
          {value}
        </span>
        {unit && <span className="metric-unit">{unit}</span>}
      </div>
      <div className="metric-label">{label}</div>
      {provenance && (
        <span className={`metric-prov ${provColors[provenance] || ""}`}>{provenance}</span>
      )}
    </div>
  );
}
