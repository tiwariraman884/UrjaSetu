/** Reusable Card component with optional title and provenance tag. */
interface CardProps {
  title?: string;
  provenance?: string;
  accent?: "default" | "success" | "warn" | "danger";
  children: React.ReactNode;
  style?: React.CSSProperties;
}

const accentClass: Record<string, string> = {
  default: "",
  success: " card-success",
  warn:    " card-warn",
  danger:  " card-danger",
};

const provColors: Record<string, string> = {
  MEASURED:    "prov-measured",
  DERIVED:     "prov-derived",
  ESTIMATED:   "prov-estimated",
  SIMULATED:   "prov-simulated",
  FORECAST:    "prov-forecast",
  FRESH:       "prov-measured",
  STALE:       "prov-simulated",
  SETTLED:     "prov-measured",
  LIVE:        "prov-derived",
};

export default function Card({ title, provenance, accent = "default", children, style }: CardProps) {
  return (
    <div className={`card${accentClass[accent] || ""}`} style={style}>
      {title && (
        <div className="card-title">
          {title}
          {provenance && (
            <span className={`metric-prov ${provColors[provenance] || "prov-estimated"}`}>
              {provenance}
            </span>
          )}
        </div>
      )}
      {children}
    </div>
  );
}
