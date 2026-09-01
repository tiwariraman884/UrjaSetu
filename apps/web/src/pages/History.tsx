import { useEffect, useState } from "react";
import api from "../api/client";
import Card from "../components/Card";
import type { HistoryEvent } from "../types";

export default function History() {
  const [events, setEvents] = useState<HistoryEvent[]>([]);
  useEffect(() => {
    api.get<HistoryEvent[]>("/history/").then(r => setEvents(r.data));
    const id = setInterval(() => api.get<HistoryEvent[]>("/history/").then(r => setEvents(r.data)), 5000);
    return () => clearInterval(id);
  }, []);
  return (
    <div><h1>History</h1>
      <Card>
        {events.length === 0 && <p>No events yet.</p>}
        {events.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: 12, padding: "6px 0", borderBottom: "1px solid #1e293b" }}>
            <span style={{ color: "#64748b", minWidth: 160, fontSize: 12 }}>{new Date(e.time).toLocaleString()}</span>
            <strong style={{ color: "#2dd4bf", minWidth: 120, fontSize: 12 }}>{e.type}</strong>
            <span style={{ fontSize: 13 }}>{e.detail}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
