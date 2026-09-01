import { useEffect, useMemo, useState } from "react";
import Card from "./Card";
import type { Overview } from "../types";

interface EnergyPoint {
  timestamp: string;
  source: number;
  load: number;
  importPower: number;
  exportPower: number;
}

interface EnergyFlowChartProps {
  overview: Overview | null;
}

const MAX_POINTS = 30;

export default function EnergyFlowChart({
  overview,
}: EnergyFlowChartProps) {
  const [history, setHistory] = useState<EnergyPoint[]>([]);

  useEffect(() => {
    if (!overview) return;

    const point: EnergyPoint = {
      timestamp: new Date().toISOString(),
      source: Number(overview.source_power_w || 0),
      load: Number(overview.load_power_w || 0),
      importPower: Number(overview.import_power_w || 0),
      exportPower: Number(overview.export_power_w || 0),
    };

    setHistory((previous) => {
      const next = [...previous, point];
      return next.slice(-MAX_POINTS);
    });
  }, [
    overview?.source_power_w,
    overview?.load_power_w,
    overview?.import_power_w,
    overview?.export_power_w,
  ]);

  const chart = useMemo(() => {
    const width = 1000;
    const height = 330;

    const paddingLeft = 64;
    const paddingRight = 24;
    const paddingTop = 32;
    const paddingBottom = 48;

    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;

    const values = history.flatMap((p) => [
      p.source,
      p.load,
    ]);

    const maxValue = Math.max(
      1,
      ...values,
      overview?.source_power_w || 0,
      overview?.load_power_w || 0,
    );

    const niceMax =
      Math.ceil(maxValue / 5) * 5 || 5;

    const x = (index: number) => {
      if (history.length <= 1) return paddingLeft;

      return (
        paddingLeft +
        (index / (history.length - 1)) * plotWidth
      );
    };

    const y = (value: number) =>
      paddingTop +
      plotHeight -
      (value / niceMax) * plotHeight;

    const sourcePoints = history
      .map((p, i) => `${x(i)},${y(p.source)}`)
      .join(" ");

    const loadPoints = history
      .map((p, i) => `${x(i)},${y(p.load)}`)
      .join(" ");

    const sourceArea =
      history.length > 0
        ? [
            `${x(0)},${paddingTop + plotHeight}`,
            ...history.map(
              (p, i) => `${x(i)},${y(p.source)}`,
            ),
            `${x(history.length - 1)},${
              paddingTop + plotHeight
            }`,
          ].join(" ")
        : "";

    return {
      width,
      height,
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
      plotWidth,
      plotHeight,
      niceMax,
      x,
      y,
      sourcePoints,
      loadPoints,
      sourceArea,
    };
  }, [history, overview]);

  const source = overview?.source_power_w ?? 0;
  const load = overview?.load_power_w ?? 0;
  const importPower = overview?.import_power_w ?? 0;
  const exportPower = overview?.export_power_w ?? 0;

  const provenance =
    overview?.telemetry_fresh ? "LIVE" : "STALE";

  const netFlow = source - load;

  return (
    <Card
      title="Energy Flow Pulse"
      style={{
        marginBottom: 16,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          marginBottom: 4,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            Live Energy Flow
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 12,
              color: "var(--text-secondary)",
            }}
          >
            Real-time generation & consumption
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 16,
            alignItems: "center",
            fontSize: 12,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "#12e6c5",
                boxShadow: "0 0 8px rgba(18,230,197,.6)",
              }}
            />
            Source Power
          </span>

          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "#3b82f6",
                boxShadow: "0 0 8px rgba(59,130,246,.45)",
              }}
            />
            Load Power
          </span>

          <span
            style={{
              color:
                provenance === "LIVE"
                  ? "#12e6c5"
                  : "#f59e0b",
              fontWeight: 700,
            }}
          >
            ● {provenance}
          </span>
        </div>
      </div>

      <div
        style={{
          width: "100%",
          overflowX: "auto",
          marginTop: 12,
        }}
      >
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          width="100%"
          role="img"
          aria-label="Live source and load power graph"
          style={{
            minWidth: 680,
            display: "block",
          }}
        >
          <defs>
            <linearGradient
              id="sourceFill"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="#12e6c5"
                stopOpacity="0.22"
              />
              <stop
                offset="100%"
                stopColor="#12e6c5"
                stopOpacity="0.02"
              />
            </linearGradient>
          </defs>

          {/* Horizontal grid */}
          {[0, 1, 2, 3, 4].map((step) => {
            const value =
              (chart.niceMax / 4) * step;

            const gy = chart.y(value);

            return (
              <g key={step}>
                <line
                  x1={chart.paddingLeft}
                  x2={
                    chart.width -
                    chart.paddingRight
                  }
                  y1={gy}
                  y2={gy}
                  stroke="rgba(148,163,184,.20)"
                  strokeDasharray="5 6"
                />

                <text
                  x={chart.paddingLeft - 12}
                  y={gy + 4}
                  textAnchor="end"
                  fill="#7183a3"
                  fontSize="11"
                >
                  {value.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Axis label */}
          <text
            x={18}
            y={chart.paddingTop}
            fill="#64748b"
            fontSize="10"
          >
            W
          </text>

          {/* Source area */}
          {chart.sourceArea && (
            <polygon
              points={chart.sourceArea}
              fill="url(#sourceFill)"
            />
          )}

          {/* Source line */}
          {history.length > 0 && (
            <polyline
              points={chart.sourcePoints}
              fill="none"
              stroke="#12e6c5"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Load line */}
          {history.length > 0 && (
            <polyline
              points={chart.loadPoints}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Source points */}
          {history.map((point, index) => (
            <circle
              key={`s-${point.timestamp}-${index}`}
              cx={chart.x(index)}
              cy={chart.y(point.source)}
              r="4"
              fill="#0b1220"
              stroke="#12e6c5"
              strokeWidth="2"
            />
          ))}

          {/* Load points */}
          {history.map((point, index) => (
            <circle
              key={`l-${point.timestamp}-${index}`}
              cx={chart.x(index)}
              cy={chart.y(point.load)}
              r="3.5"
              fill="#0b1220"
              stroke="#3b82f6"
              strokeWidth="2"
            />
          ))}

          {/* Current value guide */}
          {history.length > 0 && (
            <>
              <line
                x1={chart.x(history.length - 1)}
                x2={chart.x(history.length - 1)}
                y1={chart.paddingTop}
                y2={
                  chart.paddingTop +
                  chart.plotHeight
                }
                stroke="rgba(255,255,255,.12)"
                strokeDasharray="3 5"
              />

              <text
                x={chart.x(history.length - 1)}
                y={chart.paddingTop - 8}
                textAnchor="end"
                fill="#94a3b8"
                fontSize="10"
              >
                NOW
              </text>
            </>
          )}

          {/* X axis labels */}
          {history.map((point, index) => {
            if (
              index !== 0 &&
              index !== history.length - 1 &&
              index % 6 !== 0
            ) {
              return null;
            }

            return (
              <text
                key={`x-${point.timestamp}-${index}`}
                x={chart.x(index)}
                y={
                  chart.height -
                  chart.paddingBottom +
                  24
                }
                textAnchor="middle"
                fill="#7183a3"
                fontSize="10"
              >
                {new Date(
                  point.timestamp,
                ).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Summary strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit,minmax(130px,1fr))",
          gap: 1,
          marginTop: 4,
          borderTop: "1px solid var(--border)",
        }}
      >
        {[
          ["SOURCE", `${source.toFixed(1)} W`],
          ["LOAD", `${load.toFixed(1)} W`],
          ["NET FLOW", `${netFlow.toFixed(1)} W`],
          ["GRID IMPORT", `${importPower.toFixed(1)} W`],
          ["GRID EXPORT", `${exportPower.toFixed(1)} W`],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              padding: "12px 10px 2px",
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: "var(--text-muted)",
                letterSpacing: "0.1em",
              }}
            >
              {label}
            </div>

            <strong
              style={{
                display: "block",
                marginTop: 4,
                fontSize: 14,
              }}
            >
              {value}
            </strong>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 10,
          fontSize: 10,
          color: "var(--text-muted)",
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span>
          Telemetry streaming · 3s update
        </span>

        <span>
          Source: {overview?.telemetry_fresh ? "LIVE API" : "STALE"}
        </span>
      </div>
    </Card>
  );
}
