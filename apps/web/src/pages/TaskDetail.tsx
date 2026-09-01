import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { apiError } from "../api/client";
import Card from "../components/Card";
import StatusBadge from "../components/StatusBadge";
import type { Task, PlanResponse } from "../types";

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();

  const [task, setTask] = useState<Task | null>(null);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [planning, setPlanning] = useState(false);
  const [deciding, setDeciding] = useState(false);

  useEffect(() => {
    if (!id) return;

    api
      .get<Task>(`/tasks/${id}`)
      .then(r => setTask(r.data))
      .catch(e => setErr(apiError(e)));
  }, [id]);

  const findBestTime = async () => {
    if (!id) return;

    setPlanning(true);
    setErr(null);

    try {
      const r = await api.post<PlanResponse>(
        `/tasks/${id}/plan`,
        {}
      );

      setPlan(r.data);
    } catch (e) {
      setErr(apiError(e));
    } finally {
      setPlanning(false);
    }
  };

  const approveProposal = async (
    proposalId: string,
    selectedSlot: string
  ) => {
    if (!task) return;

    setDeciding(true);
    setErr(null);

    try {
      await api.post(`/proposals/${proposalId}/decision`, {
        approve_or_skip: "approve",
        selected_slot: selectedSlot,
      });

      setTask({
        ...task,
        state: "approved",
      });
    } catch (e) {
      setErr(apiError(e));
    } finally {
      setDeciding(false);
    }
  };

  const skipProposal = async (proposalId: string) => {
    setDeciding(true);
    setErr(null);

    try {
      await api.post(`/proposals/${proposalId}/decision`, {
        approve_or_skip: "skip",
      });

      setPlan(prev =>
        prev
          ? {
              ...prev,
              proposals: prev.proposals.filter(
                p => p.id !== proposalId
              ),
            }
          : prev
      );
    } catch (e) {
      setErr(apiError(e));
    } finally {
      setDeciding(false);
    }
  };

  if (!task) {
    return <p>Loading task...</p>;
  }

  const suggestedProposal =
    plan?.proposals.find(p => p.recommendation === "SUGGESTED") || null;

  const planningState: boolean = task.state === "created" || task.state === "planned";
  const optimizationReady =
    !!plan && plan.telemetry_fresh && !!suggestedProposal;

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
          <h1 style={{ marginBottom: 3 }}>{task.name}</h1>
          <p className="text-muted" style={{ marginBottom: 0 }}>
            Task-focused energy optimization
          </p>
        </div>

        <StatusBadge status={task.state} />
      </div>

      {/* TASK CONSTRAINTS */}
      <Card title="Task Configuration" style={{ marginBottom: 16 }}>
        <div className="grid-3">
          <div>
            <span className="text-muted text-xs">RUNTIME</span>
            <br />
            <strong>{task.runtime_min} min</strong>
          </div>

          <div>
            <span className="text-muted text-xs">
              TARGET ENERGY
            </span>
            <br />
            <strong>{task.target_energy_wh.toFixed(1)} Wh</strong>
          </div>

          <div>
            <span className="text-muted text-xs">PRIORITY</span>
            <br />
            <strong>{task.priority}</strong>
          </div>

          <div>
            <span className="text-muted text-xs">
              PREFERENCE
            </span>
            <br />
            <strong>{task.preference}</strong>
          </div>

          <div>
            <span className="text-muted text-xs">
              EARLIEST START
            </span>
            <br />
            <strong style={{ fontSize: 12 }}>
              {task.earliest_start
                ? new Date(task.earliest_start).toLocaleString()
                : "—"}
            </strong>
          </div>

          <div>
            <span className="text-muted text-xs">DEADLINE</span>
            <br />
            <strong style={{ fontSize: 12 }}>
              {task.deadline
                ? new Date(task.deadline).toLocaleString()
                : "—"}
            </strong>
          </div>
        </div>
      </Card>

      {/* OPTIMIZATION ENGINE */}
      {!plan && planningState && (
        <Card
          title="Smart Scheduling Engine"
          accent="success"
          style={{ marginBottom: 16 }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(160px,1fr))",
              gap: 10,
              marginBottom: 14,
            }}
          >
            {[
              ["Solar availability", "INPUT"],
              ["Grid dependency", "INPUT"],
              ["Deadline", "CONSTRAINT"],
              ["Runtime", "CONSTRAINT"],
              ["User preference", "CONSTRAINT"],
              ["Critical load protection", "SAFETY"],
            ].map(([label, value]) => (
              <div
                key={label}
                style={{
                  padding: 10,
                  borderRadius: 8,
                  background: "var(--bg-panel)",
                  border: "1px solid var(--border)",
                }}
              >
                <div className="text-xs text-muted">
                  {label}
                </div>
                <strong style={{ fontSize: 12 }}>
                  {value}
                </strong>
              </div>
            ))}
          </div>

          <p className="text-muted">
            Calculate the best execution window using current
            telemetry, source-energy availability, task constraints
            and user preference.
          </p>

          <button
            onClick={findBestTime}
            disabled={planning}
            className="btn btn-primary w-full"
          >
            {planning ? (
              <>
                <span className="spinner" />
                &nbsp;Calculating best slot...
              </>
            ) : (
              "Run Smart Optimization →"
            )}
          </button>

          {err && (
            <div className="alert alert-error mt-md">
              <span>⚠</span>
              <span>{err}</span>
            </div>
          )}
        </Card>
      )}

      {/* OPTIMIZATION RESULT */}
      {plan && (
        <Card
          title="Optimization Result"
          provenance={
            plan.telemetry_fresh ? "FRESH" : "STALE"
          }
          style={{ marginBottom: 16 }}
        >
          <div
            className={
              plan.telemetry_fresh
                ? "alert alert-success"
                : "alert alert-stale"
            }
            style={{ marginBottom: 14 }}
          >
            <span>
              {plan.telemetry_fresh ? "✓" : "⚠"}
            </span>

            <div>
              <strong>
                {plan.telemetry_fresh
                  ? "OPTIMIZATION ELIGIBLE"
                  : "OPTIMIZATION ON HOLD"}
              </strong>

              <div
                style={{
                  marginTop: 3,
                  fontSize: 12,
                }}
              >
                {plan.telemetry_fresh
                  ? "Telemetry is fresh and the scheduler can evaluate an execution slot."
                  : "Telemetry is stale, so automatic execution remains blocked."}
              </div>
            </div>
          </div>

          <p
            style={{
              color: "var(--text-secondary)",
              marginBottom: 16,
            }}
          >
            {plan.explanation}
          </p>

          {plan.proposals.length === 0 && (
            <div
              style={{
                padding: 16,
                borderRadius: 8,
                background: "var(--bg-panel)",
                textAlign: "center",
              }}
            >
              <strong>No viable proposal found.</strong>
              <p
                className="text-muted"
                style={{ fontSize: 12 }}
              >
                Try again when better source-energy conditions
                are available.
              </p>
            </div>
          )}

          {plan.proposals.map(p => {
            const suggested =
              p.recommendation === "SUGGESTED";

            return (
              <div
                key={p.id}
                style={{
                  border:
                    suggested
                      ? "1px solid var(--accent)"
                      : "1px solid var(--border)",
                  background: "var(--bg-input)",
                  borderRadius: 10,
                  padding: 16,
                  marginBottom: 12,
                  boxShadow: suggested
                    ? "var(--shadow-glow)"
                    : "none",
                }}
              >
                <div
                  className="flex"
                  style={{
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div className="text-xs text-muted">
                      CANDIDATE EXECUTION WINDOW
                    </div>

                    <strong
                      style={{
                        fontSize: "1.08rem",
                      }}
                    >
                      {new Date(
                        p.candidate_slot
                      ).toLocaleString()}
                    </strong>
                  </div>

                  <StatusBadge
                    status={
                      suggested
                        ? "verified"
                        : "skipped"
                    }
                    label={
                      suggested
                        ? "RECOMMENDED"
                        : "ALTERNATIVE"
                    }
                  />
                </div>

                <div
                  className="grid-3 mb-md"
                  style={{ textAlign: "center" }}
                >
                  <div>
                    <div className="text-xs text-muted">
                      BASELINE COST
                    </div>
                    <strong>
                      ${p.baseline_cost.toFixed(4)}
                    </strong>
                  </div>

                  <div>
                    <div className="text-xs text-muted">
                      OPTIMIZED COST
                    </div>
                    <strong className="text-green">
                      ${p.planned_cost.toFixed(4)}
                    </strong>
                  </div>

                  <div>
                    <div className="text-xs text-muted">
                      EST. BENEFIT
                    </div>
                    <strong className="text-accent">
                      +${p.incremental_benefit.toFixed(4)}
                    </strong>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit,minmax(140px,1fr))",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <div
                    style={{
                      padding: 9,
                      background: "var(--bg-panel)",
                      borderRadius: 7,
                    }}
                  >
                    <div className="text-xs text-muted">
                      CONFIDENCE
                    </div>
                    <strong>{p.confidence}</strong>
                  </div>

                  <div
                    style={{
                      padding: 9,
                      background: "var(--bg-panel)",
                      borderRadius: 7,
                    }}
                  >
                    <div className="text-xs text-muted">
                      STATUS
                    </div>
                    <strong>
                      {suggested
                        ? "ELIGIBLE"
                        : "ALTERNATIVE"}
                    </strong>
                  </div>
                </div>

                {p.assumptions && (
                  <div
                    className="text-xs text-muted font-mono"
                    style={{
                      padding: 10,
                      background: "var(--bg-panel)",
                      borderRadius: 7,
                      marginBottom: 12,
                    }}
                  >
                    {p.assumptions}
                  </div>
                )}

                {suggested &&
                  planningState && (
                    <div className="flex gap-sm">
                      <button
                        onClick={() =>
                          approveProposal(
                            p.id,
                            p.candidate_slot
                          )
                        }
                        disabled={
                          deciding ||
                          !plan.telemetry_fresh
                        }
                        className="btn btn-success"
                        style={{ flex: 1 }}
                      >
                        {deciding
                          ? "Saving decision..."
                          : "Approve Schedule ✓"}
                      </button>

                      <button
                        onClick={() =>
                          skipProposal(p.id)
                        }
                        disabled={deciding}
                        className="btn btn-ghost"
                        style={{ flex: 1 }}
                      >
                        Skip
                      </button>
                    </div>
                  )}
              </div>
            );
          })}
        </Card>
      )}

      {/* APPROVAL COMPLETE */}
      {task.state === "approved" && (
        <Card
          title="Schedule Approved"
          accent="success"
          style={{ marginBottom: 16 }}
        >
          <div className="alert alert-success">
            <span>✓</span>
            <div>
              <strong>User authorization recorded</strong>
              <div
                style={{
                  marginTop: 3,
                  fontSize: 12,
                }}
              >
                The selected schedule can now proceed to
                the payment authorization layer.
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit,minmax(150px,1fr))",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <div
              style={{
                padding: 10,
                background: "var(--bg-panel)",
                borderRadius: 8,
              }}
            >
              <div className="text-xs text-muted">
                USER APPROVAL
              </div>
              <strong>RECORDED</strong>
            </div>

            <div
              style={{
                padding: 10,
                background: "var(--bg-panel)",
                borderRadius: 8,
              }}
            >
              <div className="text-xs text-muted">
                EXECUTION
              </div>
              <strong>LOCKED</strong>
            </div>

            <div
              style={{
                padding: 10,
                background: "var(--bg-panel)",
                borderRadius: 8,
              }}
            >
              <div className="text-xs text-muted">
                PAYMENT
              </div>
              <strong>REQUIRED</strong>
            </div>
          </div>

          <Link
            to={`/payment/${task.id}`}
            className="btn btn-primary w-full"
          >
            Proceed to x402 Payment →
          </Link>
        </Card>
      )}

      {/* ACTIVE EXECUTION */}
      {(task.state === "authorized" ||
        task.state === "executing" ||
        task.state === "verified") && (
        <Card
          title="Execution Active"
          accent="success"
        >
          <div className="alert alert-success">
            <span>✓</span>
            <div>
              <strong>Task authorized</strong>
              <div
                style={{
                  marginTop: 3,
                  fontSize: 12,
                }}
              >
                The task has passed the authorization layer and
                can be monitored by the execution engine.
              </div>
            </div>
          </div>

          <Link
            to={`/execution/${task.id}`}
            className="btn btn-ghost w-full"
          >
            Open Execution Monitor ↗
          </Link>
        </Card>
      )}

      {err && (
        <div
          className="alert alert-error"
          style={{ marginTop: 12 }}
        >
          <span>⚠</span>
          <span>{err}</span>
        </div>
      )}

      {optimizationReady && planningState && (
        <div
          style={{
            marginTop: 10,
            textAlign: "center",
            fontSize: 11,
            color: "var(--text-muted)",
          }}
        >
          Recommendation generated from current telemetry.
          Final execution requires explicit user approval.
        </div>
      )}
    </div>
  );
}


