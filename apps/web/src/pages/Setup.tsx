import { useState } from "react";
import api, { apiError } from "../api/client";
import Card from "../components/Card";

export default function Setup() {
  const [hwId, setHwId] = useState("esp32-bench-01");
  const [name, setName] = useState("Bench Rig Pump");
  const [siteId, setSiteId] = useState("");
  const [power, setPower] = useState(10);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const register = async () => {
    setErr(null); setMsg(null);
    try {
      const r = await api.post("/devices/register", { site_id: siteId, name, hardware_id: hwId, rated_power_w: Number(power) });
      setMsg(`Registered: ${r.data.id}`);
    } catch (e) { setErr(apiError(e)); }
  };

  return (
    <div style={{ maxWidth: 600 }}><h1>Setup</h1>
      <Card title="Register Device">
        <label style={{ display: "block", marginBottom: 8 }}>Site ID (UUID) - create a user first, then a site<input value={siteId} onChange={e => setSiteId(e.target.value)} style={inp} /></label>
        <label style={{ display: "block", marginBottom: 8 }}>Device Name<input value={name} onChange={e => setName(e.target.value)} style={inp} /></label>
        <label style={{ display: "block", marginBottom: 8 }}>Hardware ID<input value={hwId} onChange={e => setHwId(e.target.value)} style={inp} /></label>
        <label style={{ display: "block", marginBottom: 8 }}>Rated Power (W)<input type="number" value={power} onChange={e => setPower(Number(e.target.value))} style={inp} /></label>
        <button onClick={register} style={btn}>Register</button>
        {msg && <p style={{ color: "#2dd4bf" }}>{msg}</p>}
        {err && <p style={{ color: "#ef444" }}>{err}</p>}
      </Card>
      <Card title="Configuration Health">
        <p>Demo Mode: Active</p><p>Algorand Testnet: Configured</p><p>Facilitator: GoPlausible</p>
      </Card>
    </div>
  );
}
const inp = { width: "100%", padding: 8, background: "#1e293b", border: "1px solid #334155", borderRadius: 6, color: "#e5e7eb", marginTop: 4 } as const;
const btn = { padding: "10px 20px", background: "#2dd4bf", color: "#062018", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" } as const;
