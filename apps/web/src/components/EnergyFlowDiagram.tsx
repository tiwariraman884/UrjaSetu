import { useMemo } from "react";
import type { Overview } from "../types";

/**
 * Live Energy Flow — real-time SVG visualization for the UrjaSetu dashboard.
 *
 * Renders an animated node-and-flow graph driven solely by the live `Overview`
 * telemetry. No values are fabricated: every number shown comes from the
 * backend, and every flow particle sized/speed by the actual power reading.
 *
 * Topology:
 *   SOURCE (generation)  ──►  HUB (UrjaSetu)  ──►  LOAD (consumption)
 *                              ▲  │
 *                       IMPORT │  │ EXPORT
 *                              │  ▼
 *                            GRID
 */

interface EnergyFlowDiagramProps {
  data: Overview;
}

const W = 760;
const H = 360;

// Node anchor points (cx, cy).
const NODES = {
  source: { x: 120, y: 200 },
  hub: { x: 380, y: 200 },
  load: { x: 640, y: 200 },
  grid: { x: 380, y: 320 },
} as const;

const fmtW = (w: number) => (w >= 1000 ? `${(w / 1000).toFixed(2)} kW` : `${w.toFixed(0)} W`);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * Build a list of particles for a single flow lane.
 * `magnitude` is the actual power in watts; `max` is the scale reference used
 * to normalize density/speed. Returns particle offsets (0..1) along the path.
 */
function particlesFor(magnitude: number, max: number, seed: number) {
  if (magnitude <= 0 || max <= 0) return [] as { offset: number; size: number }[];
  const intensity = clamp(magnitude / max, 0, 1);
  const count = Math.max(2, Math.round(2 + intensity * 6)); // 2..8 particles
  const size = 2 + intensity * 3; // 2..5 px radius
  const out: { offset: number; size: number }[] = [];
  for (let i = 0; i < count; i++) {
    out.push({ offset: ((i + seed) / count) % 1, size });
  }
  return out;
}

export default function EnergyFlowDiagram({ data }: EnergyFlowDiagramProps) {
  const live = data.device_online && data.telemetry_fresh;

  const o = useMemo(() => {
    const source = Math.max(0, data.source_power_w ?? 0);
    const load = Math.max(0, data.load_power_w ?? 0);
    const imp = Math.max(0, data.import_power_w ?? 0);
    const exp = Math.max(0, data.export_power_w ?? 0);
    const maxFlow = Math.max(source, load, imp, exp, 1);
    const netGrid = (data.import_power_w ?? 0) - (data.export_power_w ?? 0);

    return {
      source, load, imp, exp, maxFlow, netGrid,
      sourceP: particlesFor(source, maxFlow, 0.13),
      loadP: particlesFor(load, maxFlow, 0.41),
      impP: particlesFor(imp, maxFlow, 0.67),
      expP: particlesFor(exp, maxFlow, 0.29),
    };
  }, [data]);

  // Animation durations: faster when power is higher (visually "busier").
  const dur = (w: number) => {
    if (w <= 0) return 0;
    const i = clamp(w / o.maxFlow, 0, 1);
    return (3.2 - i * 1.8).toFixed(2); // 3.2s slow → 1.4s fast
  };

  const accent = "var(--accent)";
  const green = "var(--green)";
  const yellow = "var(--yellow)";
  const blue = "var(--blue)";
  const muted = "var(--text-muted)";
  const dim = live ? 1 : 0.35;

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Live energy flow diagram"
        style={{ width: "100%", minWidth: 640, height: "auto", display: "block" }}
      >
        <defs>
          <radialGradient id="g-source" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={yellow} stopOpacity="0.55" />
            <stop offset="100%" stopColor={yellow} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="g-hub" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={accent} stopOpacity="0.45" />
            <stop offset="100%" stopColor={accent} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="g-load" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={blue} stopOpacity="0.40" />
            <stop offset="100%" stopColor={blue} stopOpacity="0" />
          </radialGradient>
          <radialGradient id="g-grid" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={green} stopOpacity="0.35" />
            <stop offset="100%" stopColor={green} stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── Flow lanes ── */}
        <FlowLane id="lane-src"
          d={`M ${NODES.source.x + 46} ${NODES.source.y} L ${NODES.hub.x - 46} ${NODES.hub.y}`}
          color={yellow} active={live && o.source > 0} duration={dur(o.source)}
          particles={o.sourceP} opacity={dim} />

        <FlowLane id="lane-load"
          d={`M ${NODES.hub.x + 46} ${NODES.hub.y} L ${NODES.load.x - 46} ${NODES.load.y}`}
          color={blue} active={live && o.load > 0} duration={dur(o.load)}
          particles={o.loadP} opacity={dim} />

        <FlowLane id="lane-imp"
          d={`M ${NODES.grid.x} ${NODES.grid.y - 46} L ${NODES.hub.x} ${NODES.hub.y + 46}`}
          color={green} active={live && o.imp > 0} duration={dur(o.imp)}
          particles={o.impP} opacity={dim} />

        <FlowLane id="lane-exp"
          d={`M ${NODES.hub.x} ${NODES.hub.y + 46} L ${NODES.grid.x} ${NODES.grid.y - 46}`}
          color={accent} active={live && o.exp > 0} duration={dur(o.exp)}
          particles={o.expP} opacity={dim} />

        {/* ── Nodes ── */}
        <Node cx={NODES.source.x} cy={NODES.source.y} glow="url(#g-source)"
          ringColor={yellow} label="SOURCE" sub="Generation"
          value={fmtW(o.source)} valueColor={yellow} dim={dim}
          icon={<SourceIcon />} />

        <Node cx={NODES.hub.x} cy={NODES.hub.y} glow="url(#g-hub)"
          ringColor={accent} label="URJASETU" sub={live ? "Orchestrating" : "Standby"}
          value={live ? "LIVE" : "HOLD"} valueColor={live ? accent : muted}
          dim={dim} pulse={live} icon={<HubIcon active={live} />} />

        <Node cx={NODES.load.x} cy={NODES.load.y} glow="url(#g-load)"
          ringColor={blue} label="LOAD" sub="Consumption"
          value={fmtW(o.load)} valueColor={blue} dim={dim}
          icon={<LoadIcon />} />

        <Node cx={NODES.grid.x} cy={NODES.grid.y} glow="url(#g-grid)"
          ringColor={green} label="GRID" sub={o.netGrid >= 0 ? "Importing" : "Exporting"}
          value={o.netGrid >= 0 ? fmtW(o.imp) : fmtW(o.exp)}
          valueColor={o.netGrid >= 0 ? green : accent} dim={dim}
          icon={<GridIcon />} />

        {/* Net-grid direction label */}
        {live && (o.imp > 0 || o.exp > 0) ? (
          <text x={NODES.grid.x + 64} y={(NODES.hub.y + NODES.grid.y) / 2 + 4}
            fontSize="11" fontFamily="var(--font-mono)" fill={muted}
            textAnchor="start">
            {o.netGrid >= 0 ? "↑ import" : "↓ export"}
          </text>
        ) : null}

        {/* Provenance footnote */}
        <text x={W - 12} y={H - 10} fontSize="9.5" fontFamily="var(--font-mono)"
          fill={muted} textAnchor="end" letterSpacing="0.08em">
          {live ? "● LIVE TELEMETRY" : "⚠ AWAITING FRESH DATA"}
        </text>
      </svg>
    </div>
  );
}

/* ───────── Sub-components ───────── */

interface FlowLaneProps {
  id: string; d: string; color: string; active: boolean;
  duration: string | number;
  particles: { offset: number; size: number }[];
  opacity: number;
}

function FlowLane({ id, d, color, active, duration, particles, opacity }: FlowLaneProps) {
  const durNum = typeof duration === "number" ? duration : parseFloat(duration);
  return (
    <g opacity={opacity}>
      <path d={d} stroke="var(--border)" strokeWidth="2" fill="none"
        strokeDasharray="2 6" strokeLinecap="round" />
      {active ? (
        <path d={d} stroke={color} strokeWidth="2.5" fill="none" strokeOpacity="0.35"
          strokeLinecap="round" />
      ) : null}
      {active && durNum > 0 ? (
        <>
          <path id={`${id}-path`} d={d} fill="none" stroke="none" />
          {particles.map((p, i) => (
            <circle key={i} r={p.size} fill={color}
              style={{ filter: `drop-shadow(0 0 4px ${color})` }}>
              <animateMotion dur={`${durNum}s`} repeatCount="indefinite"
                begin={`${p.offset * durNum}s`}
                keyPoints="0;1" keyTimes="0;1" calcMode="linear">
                <mpath href={`#${id}-path`} />
              </animateMotion>
            </circle>
          ))}
        </>
      ) : null}
    </g>
  );
}

interface NodeProps {
  cx: number; cy: number; glow: string; ringColor: string;
  label: string; sub: string; value: string; valueColor: string;
  dim: number; pulse?: boolean; icon: React.ReactNode;
}

function Node({ cx, cy, glow, ringColor, label, sub, value, valueColor, dim, pulse, icon }: NodeProps) {
  return (
    <g opacity={dim}>
      <circle cx={cx} cy={cy} r="60" fill={glow} />
      <circle cx={cx} cy={cy} r="40" fill="var(--bg-panel)" stroke={ringColor}
        strokeWidth="1.5" strokeOpacity="0.6" />
      {pulse ? (
        <circle cx={cx} cy={cy} r="40" fill="none" stroke={ringColor} strokeWidth="1.5">
          <animate attributeName="r" values="40;52;40" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="stroke-opacity" values="0.7;0;0.7" dur="2.4s" repeatCount="indefinite" />
        </circle>
      ) : null}
      <g transform={`translate(${cx} ${cy})`}>{icon}</g>
      <text x={cx} y={cy - 56} fontSize="10" fontFamily="var(--font-mono)"
        fill="var(--text-muted)" textAnchor="middle" letterSpacing="0.14em">
        {label}
      </text>
      <text x={cx} y={cy - 44} fontSize="9.5" fill="var(--text-secondary)" textAnchor="middle">
        {sub}
      </text>
      <text x={cx} y={cy + 62} fontSize="15" fontFamily="var(--font-mono)"
        fontWeight="700" fill={valueColor} textAnchor="middle">
        {value}
      </text>
    </g>
  );
}

/* ───────── Icons ───────── */

function SourceIcon() {
  return (
    <g stroke="var(--yellow)" strokeWidth="1.6" strokeLinecap="round" fill="none">
      <circle r="9" fill="rgba(245,158,11,0.15)" />
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i * Math.PI) / 4;
        return <line key={i} x1={Math.cos(a) * 13} y1={Math.sin(a) * 13}
          x2={Math.cos(a) * 18} y2={Math.sin(a) * 18} />;
      })}
    </g>
  );
}

function HubIcon({ active }: { active: boolean }) {
  const pts = Array.from({ length: 6 }).map((_, i) => {
    const a = (i * Math.PI) / 3 - Math.PI / 6;
    return `${Math.cos(a) * 14},${Math.sin(a) * 14}`;
  }).join(" ");
  return (
    <g>
      <polygon points={pts} fill="rgba(0,212,170,0.12)"
        stroke="var(--accent)" strokeWidth="1.6" />
      {active ? (
        <circle r="4" fill="var(--accent)">
          <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite" />
        </circle>
      ) : <circle r="4" fill="var(--text-muted)" />}
    </g>
  );
}

function LoadIcon() {
  return (
    <path d="M -3 -12 L 5 -2 L 0 -2 L 3 12 L -5 0 L 0 0 Z"
      fill="rgba(59,130,246,0.18)" stroke="var(--blue)" strokeWidth="1.5"
      strokeLinejoin="round" />
  );
}

function GridIcon() {
  return (
    <g stroke="var(--green)" strokeWidth="1.5" fill="none" strokeLinecap="round">
      <path d="M -10 -10 L 0 12 L 10 -10" />
      <line x1="-7" y1="-2" x2="7" y2="-2" />
      <line x1="-5" y1="4" x2="5" y2="4" />
      <line x1="-12" y1="-10" x2="12" y2="-10" />
    </g>
  );
}
