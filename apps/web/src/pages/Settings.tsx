import Card from "../components/Card";

export default function Settings() {
  return (
    <div style={{ maxWidth: 600 }}><h1>Settings</h1>
      <Card title="Demo Mode"><p>Demo mode is active. Telemetry is SIMULATED.</p></Card>
      <Card title="Safety"><p>Low-voltage DC bench rig (5-12V). NOT for household mains.</p><p>Manual physical cutoff always available.</p><p>Automation blocked when data is stale.</p></Card>
      <Card title="Payment Configuration"><p>x402 v2 | exact scheme | algorand:testnet</p><p>Facilitator: GoPlausible</p><p>Asset: USDC</p></Card>
    </div>
  );
}
