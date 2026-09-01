import { useEffect, useState } from "react";
import api from "../api/client";
import Card from "../components/Card";
import StatusBadge from "../components/StatusBadge";
import type { HistoryEvent } from "../types";

function eventStatus(type: string) {
  const t = type.toLowerCase();

  if (
    t.includes("verify") ||
    t.includes("settle") ||
    t.includes("approve") ||
    t.includes("complete")
  ) {
    return "good";
  }

  if (
    t.includes("fail") ||
    t.includes("error") ||
    t.includes("block")
  ) {
    return "fault";
  }

  return "online";
}

export default function Audit() {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await api.get<HistoryEvent[]>("/history/");
      setEvents(r.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div>
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
          <h1 style={{ marginBottom: 3 }}>Audit Trail</h1>
          <p className="text-muted" style={{ marginBottom: 0 }}>
            End-to-end record of decisions, payments, execution and verification
          </p>
        </div>

        <span className="badge badge-ok">
          ● LIVE
        </span>
      </div>

      <Card title="System Lifecycle">
        {loading && events.length === 0 ? (
          <p>Loading audit events...</p>
        ) : events.length === 0 ? (
          <div
            style={{
              padding: 18,
              textAlign: "center",
              color: "var(--text-muted)",
            }}
          >
            No audit events recorded yet.
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            {events.map((event, index) => {
              const status = eventStatus(event.type);

              return (
                <div
                  key={`${event.time}-${index}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "18px 150px minmax(120px,180px) 1fr auto",
                    gap: 12,
                    alignItems: "start",
                    padding: "12px 0",
                    borderBottom:
                      index === events.length - 1
                        ? "none"
                        : "1px solid var(--border-subtle)",
                  }}
                >
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      marginTop: 5,
                      borderRadius: "50%",
                      background:
                        status === "good"
                          ? "var(--green)"
                          : status === "fault"
                          ? "var(--red)"
                          : "var(--accent)",
                      boxShadow:
                        status === "good"
                          ? "0 0 10px var(--green)"
                          : "none",
                    }}
                  />

                  <span
                    className="text-muted"
                    style={{
                      fontSize: 11,
                      lineHeight: 1.4,
                    }}
                  >
                    {new Date(event.time).toLocaleString()}
                  </span>

                  <StatusBadge
                    status={status}
                    label={event.type}
                  />

                  <span
                    style={{
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    {event.detail}
                  </span>

                  <code
                    style={{
                      fontSize: 10,
                      color: "var(--text-muted)",
                    }}
                  >
                    {event.entity?.slice(0, 8) || "—"}
                  </code>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div
        style={{
          marginTop: 12,
          textAlign: "center",
          fontSize: 11,
          color: "var(--text-muted)",
        }}
      >
        Every material action is recorded for transparent verification.
      </div>
    </div>
  );
}
