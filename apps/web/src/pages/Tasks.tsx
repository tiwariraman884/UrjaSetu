import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import Card from "../components/Card";
import StatusBadge from "../components/StatusBadge";
import type { Task } from "../types";

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get<Task[]>("/tasks/").then(r => setTasks(r.data)).finally(() => setLoading(false));
    const id = setInterval(() => api.get<Task[]>("/tasks/").then(r => setTasks(r.data)), 5000);
    return () => clearInterval(id);
  }, []);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1>Tasks</h1>
        <Link to="/tasks/new" style={{ background: "#2dd4bf", color: "#062018", padding: "8px 16px", borderRadius: 8, textDecoration: "none", fontWeight: 600 }}>New Task</Link>
      </div>
      <Card>
        {loading && <p>Loading...</p>}
        {!loading && tasks.length === 0 && <p>No tasks yet.</p>}
        {tasks.map(t => (
          <Link key={t.id} to={`/tasks/${t.id}`} style={{ display: "flex", justifyContent: "space-between", textDecoration: "none", color: "inherit", padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
            <span>{t.name} - {t.runtime_min}min</span>
            <StatusBadge status={t.state} />
          </Link>
        ))}
      </Card>
    </div>
  );
}
