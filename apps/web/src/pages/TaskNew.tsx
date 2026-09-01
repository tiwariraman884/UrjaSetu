import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { apiError } from "../api/client";
import Card from "../components/Card";

export default function TaskNew() {
  const [name, setName] = useState("Pump Task");

  const [deviceId, setDeviceId] = useState(
    "210f743f-cecb-448d-a8a1-194dffa63a4c"
  );

  const [runtime, setRuntime] = useState(30);
  const [deadline, setDeadline] = useState("");
  const [priority, setPriority] = useState(5);
  const [preference, setPreference] = useState("cost");

  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();

  const create = async () => {
    setErr(null);
    setLoading(true);

    try {
      const r = await api.post("/tasks/", {
        device_id: deviceId,
        name,
        runtime_min: runtime,
        deadline: deadline || undefined,
        priority: Number(priority),
        preference,
      });

      nav(`/tasks/${r.data.id}`);
    } catch (e) {
      setErr(apiError(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 600 }}>
      <h1>New Task</h1>

      {/* Login / Register prompt */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          padding: "10px 14px",
          background: "#0f1f35",
          border: "1px solid #1e3a5f",
          borderRadius: 8,
        }}
      >
        <span style={{ color: "#94a3b8", fontSize: 14 }}>
          Need an account to create tasks?
        </span>

        <Link
          to="/login"
          style={{
            color: "#2dd4bf",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Login / Register →
        </Link>
      </div>

      <Card>
        {/* Task Name */}
        <label style={{ display: "block", marginBottom: 8 }}>
          Task Name

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
        </label>

        {/* Device */}
        <label style={{ display: "block", marginBottom: 8 }}>
          Device

          <input
            value={deviceId}
            onChange={(e) => setDeviceId(e.target.value)}
            placeholder="Device UUID"
            style={inputStyle}
          />

          <span
            style={{
              display: "block",
              marginTop: 4,
              fontSize: 12,
              color: "#64748b",
            }}
          >
            Smart Meter 01 · URJA-ESP32-001 · Online
          </span>
        </label>

        {/* Runtime */}
        <label style={{ display: "block", marginBottom: 8 }}>
          Runtime (min)

          <input
            type="number"
            min="1"
            value={runtime}
            onChange={(e) => setRuntime(Number(e.target.value))}
            style={inputStyle}
          />
        </label>

        {/* Deadline */}
        <label style={{ display: "block", marginBottom: 8 }}>
          Deadline

          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            style={inputStyle}
          />
        </label>

        {/* Priority */}
        <label style={{ display: "block", marginBottom: 8 }}>
          Priority (1-10)

          <input
            type="number"
            min="1"
            max="10"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
            style={inputStyle}
          />
        </label>

        {/* Preference */}
        <label style={{ display: "block", marginBottom: 12 }}>
          Preference

          <select
            value={preference}
            onChange={(e) => setPreference(e.target.value)}
            style={inputStyle}
          >
            <option value="cost">Cost (cheapest)</option>
            <option value="earliest">Earliest</option>
            <option value="green">Green (most source energy)</option>
          </select>
        </label>

        {/* Create Task */}
        <button
          onClick={create}
          disabled={loading || !deviceId}
          style={btnStyle}
        >
          {loading ? "Creating..." : "Create Task"}
        </button>

        {/* Error */}
        {err && (
          <p
            style={{
              color: "#ef4444",
              marginTop: 12,
              whiteSpace: "pre-wrap",
            }}
          >
            {err}
          </p>
        )}
      </Card>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: 8,
  background: "#1e293b",
  border: "1px solid #334155",
  borderRadius: 6,
  color: "#e5e7eb",
  marginTop: 4,
};

const btnStyle = {
  padding: "10px 20px",
  background: "#2dd4bf",
  color: "#062018",
  border: "none",
  borderRadius: 8,
  fontWeight: 700,
  cursor: "pointer",
};