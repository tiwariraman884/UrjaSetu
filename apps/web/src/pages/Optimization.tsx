import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useOverview } from "../hooks/useApi";
import Card from "../components/Card";
import Metric from "../components/Metric";
import StatusBadge from "../components/StatusBadge";

export default function Optimization() {
  const { data, loading, error } = useOverview(5000);

  const analysis = useMemo(() => {
    if (!data) return null;

    const source = Number(
      (data as any).source_power_w ??
      (data as any).generation_w ??
      (data as any).solar_power_w ??
      0
    );

    const load = Number(
      (data as any).load_power_w ??
      (data as any).consumption_w ??
      (data as any).load_w ??
      0
    );

    const grid = load - source;
    const availableSolar = Math.max(source - load, 0);
    const opportunity = availableSolar > 5 && data.telemetry_fresh;

    const pumpPowerW = 50;
    const runtimeMin = 30;
    const taskKwh = (pumpPowerW * runtimeMin) / 60000;

    const importRate = 8;
    const exportValue = 3;

    const estimatedBenefit =
      opportunity
        ? taskKwh * Math.max(importRate - exportValue, 0)
        : 0;

    const carbonFactor = 0.7;
    const avoidedImportKg =
      opportunity
        ? taskKwh * carbonFactor
        : 0;

    return {
      source,
      load,
      grid,
      availableSolar,
      opportunity,
      taskKwh,
      estimatedBenefit,
      avoidedImportKg,
      importRate,
      exportValue,
    };
  }, [data]);

  if (loading && !data) {
    return (
      <div>
        <h1>Optimization Center</h1>
        <div className="grid-3">
          {[1,2,3].map(i => (
            <div key={i} className="card">
              <div className="skeleton" style={{height:80}} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1>Optimization Center</h1>
        <div className="alert alert-error">
          ⚠ Backend unavailable: {error}
        </div>
      </div>
    );
  }

  if (!data || !analysis) {
    return <div><h1>Optimization Center</h1><p>No telemetry available.</p></div>;
  }

  return (
    <div>
      <div
        className="flex gap-md"
        style={{
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap"
        }}
      >
        <div>
          <h1 style={{marginBottom: 4}}>Optimization Center</h1>
          <p className="text-muted">
            Transparent rules-first energy optimization
          </p>
        </div>

        <div className="flex gap-sm" style={{marginLeft:"auto"}}>
          <StatusBadge
            status={data.telemetry_fresh ? "good" : "stale"}
            label={data.telemetry_fresh ? "Fresh telemetry" : "Telemetry stale"}
          />
          <StatusBadge
            status={data.device_online ? "online" : "offline"}
            label={data.device_online ? "Device online" : "Device offline"}
          />
        </div>
      </div>

      {!data.telemetry_fresh && (
        <div className="alert alert-warn" style={{marginBottom:16}}>
          ⏱ <strong>Optimization HOLD:</strong>&nbsp;
          telemetry is stale. Automatic execution remains blocked.
        </div>
      )}

      <div className="grid-3" style={{marginBottom:16}}>
        <Metric
          label="SOURCE POWER"
          value={`${analysis.source.toFixed(1)} W`}
        />
        <Metric
          label="LOAD POWER"
          value={`${analysis.load.toFixed(1)} W`}
        />
        <Metric
          label="GRID BALANCE"
          value={`${analysis.grid.toFixed(1)} W`}
        />
      </div>

      <div className="grid-2" style={{marginBottom:16}}>
        <Card
          title="Optimization Decision"
          accent={analysis.opportunity ? "success" : "default"}
        >
          {analysis.opportunity ? (
            <>
              <div
                style={{
                  padding:16,
                  borderRadius:8,
                  background:"var(--bg-input)",
                  border:"1px solid var(--border)",
                  marginBottom:16
                }}
              >
                <div className="text-xs text-muted">
                  RECOMMENDATION
                </div>

                <h2 style={{margin:"6px 0"}}>
                  Run flexible load now
                </h2>

                <p className="text-muted">
                  Available source energy is higher than current load.
                  A flexible task can use this surplus instead of shifting
                  consumption to grid-import periods.
                </p>
              </div>

              <div className="grid-2">
                <div>
                  <span className="text-muted text-xs">
                    AVAILABLE SOURCE
                  </span>
                  <br/>
                  <strong>{analysis.availableSolar.toFixed(1)} W</strong>
                </div>

                <div>
                  <span className="text-muted text-xs">
                    DEMO TASK
                  </span>
                  <br/>
                  <strong>30 min / 50 W</strong>
                </div>

                <div>
                  <span className="text-muted text-xs">
                    ENERGY
                  </span>
                  <br/>
                  <strong>{analysis.taskKwh.toFixed(3)} kWh</strong>
                </div>

                <div>
                  <span className="text-muted text-xs">
                    EST. BENEFIT
                  </span>
                  <br/>
                  <strong className="text-green">
                    ₹{analysis.estimatedBenefit.toFixed(2)}
                  </strong>
                </div>
              </div>

              <div className="flex gap-sm" style={{marginTop:16}}>
                <Link
                  to="/tasks/new"
                  className="btn btn-primary"
                  style={{flex:1}}
                >
                  Create Optimized Task →
                </Link>

                <Link
                  to="/analytics"
                  className="btn btn-ghost"
                >
                  Analytics
                </Link>
              </div>
            </>
          ) : (
            <>
              <StatusBadge status="stale" label="ADVICE ONLY" />
              <p style={{marginTop:12}}>
                No safe optimization opportunity is currently detected.
              </p>
              <p className="text-muted">
                UrjaSetu will not force a positive saving when the measured
                conditions do not support one.
              </p>
            </>
          )}
        </Card>

        <Card title="Why this recommendation?" accent="success">
          <div style={{display:"grid",gap:12}}>
            {[
              ["1", "Fresh telemetry", data.telemetry_fresh ? "PASS" : "HOLD"],
              ["2", "Source available", analysis.availableSolar > 5 ? "PASS" : "NO GAIN"],
              ["3", "Flexible task", "30 min pump"],
              ["4", "Safety boundary", "User approval required"],
              ["5", "Execution proof", "Sensor feedback"],
            ].map(([n,label,value]) => (
              <div
                key={n}
                className="flex"
                style={{
                  alignItems:"center",
                  gap:12,
                  padding:"10px 0",
                  borderBottom:"1px solid var(--border)"
                }}
              >
                <strong
                  style={{
                    width:28,
                    height:28,
                    display:"grid",
                    placeItems:"center",
                    borderRadius:"50%",
                    background:"var(--bg-input)"
                  }}
                >
                  {n}
                </strong>

                <div style={{flex:1}}>
                  <div className="text-xs text-muted">{label}</div>
                  <strong>{value}</strong>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Savings Simulation" style={{marginBottom:16}}>
        <div className="grid-3">
          <div>
            <span className="text-muted text-xs">TASK ENERGY</span>
            <br/>
            <strong>{analysis.taskKwh.toFixed(3)} kWh</strong>
          </div>

          <div>
            <span className="text-muted text-xs">IMPORT VALUE</span>
            <br/>
            <strong>₹{analysis.importRate}/kWh</strong>
          </div>

          <div>
            <span className="text-muted text-xs">EXPORT VALUE</span>
            <br/>
            <strong>₹{analysis.exportValue}/kWh</strong>
          </div>

          <div>
            <span className="text-muted text-xs">INCREMENTAL BENEFIT</span>
            <br/>
            <strong className="text-green">
              ₹{analysis.estimatedBenefit.toFixed(2)}
            </strong>
          </div>

          <div>
            <span className="text-muted text-xs">INDICATIVE CO₂</span>
            <br/>
            <strong>{analysis.avoidedImportKg.toFixed(3)} kgCO₂</strong>
          </div>

          <div>
            <span className="text-muted text-xs">DATA PROVENANCE</span>
            <br/>
            <strong>{data.telemetry_fresh ? "MEASURED" : "HOLD"}</strong>
          </div>
        </div>

        <div
          className="alert alert-warn"
          style={{marginTop:16}}
        >
          <span>ⓘ</span>
          <span>
            Savings shown here are scenario estimates. Final Savings Receipt
            must use the completed task's actual measured outcome.
          </span>
        </div>
      </Card>

      <Card title="Optimization Pipeline">
        <div className="grid-3">
          <div>
            <strong>01 · READ</strong>
            <p className="text-muted text-xs">
              Validate fresh source/load telemetry
            </p>
          </div>

          <div>
            <strong>02 · PLAN</strong>
            <p className="text-muted text-xs">
              Compare task timing and net cost
            </p>
          </div>

          <div>
            <strong>03 · PROVE</strong>
            <p className="text-muted text-xs">
              Execute only after approval and verify with sensors
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
