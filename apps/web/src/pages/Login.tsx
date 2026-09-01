import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { apiError } from "../api/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async () => {
    setErr(null); setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const r = await api.post(path, { email, password });
      if (mode === "register") {
        const r2 = await api.post("/auth/login", { email, password });
        localStorage.setItem("urjasetu_token", r2.data.access_token);
      } else {
        localStorage.setItem("urjasetu_token", r.data.access_token);
      }
      nav("/dashboard");
    } catch (e) { setErr(apiError(e)); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 400, margin: "60px auto" }}>
      <h1>UrjaSetu Login</h1>
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <button onClick={() => setMode("login")} style={{ fontWeight: mode==="login"?"700":"400", background: mode==="login"?"#2dd4bf":"#1e293b", color: mode==="login"?"#062018":"#94a3b8", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>Login</button>
        <button onClick={() => setMode("register")} style={{ fontWeight: mode==="register"?"700":"400", background: mode==="register"?"#2dd4bf":"#1e293b", color: mode==="register"?"#062018":"#94a3b8", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}>Register</button>
      </div>
      <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: "100%", padding: 10, marginBottom: 8, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e5e7eb" }} />
      <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: "100%", padding: 10, marginBottom: 12, background: "#1e293b", border: "1px solid #334155", borderRadius: 8, color: "#e5e7eb" }} />
      <button onClick={submit} disabled={loading || !email || !password} style={{ width: "100%", padding: 10, background: "#2dd4bf", color: "#062018", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
        {loading ? "Please wait..." : mode === "login" ? "Login" : "Register"}
      </button>
      {err && <p style={{ color: "#ef444", marginTop: 12 }}>{err}</p>}
    </div>
  );
}
