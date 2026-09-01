import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import Card from "../components/Card";
import type { SavingsReceipt } from "../types";

export default function Receipts() {
  const [receipts, setReceipts] = useState<SavingsReceipt[]>([]);
  useEffect(() => { api.get<SavingsReceipt[]>("/receipts/").then(r => setReceipts(r.data)); }, []);
  return (
    <div><h1>Savings Receipts</h1>
      {receipts.length === 0 && <Card><p>No receipts yet.</p></Card>}
      {receipts.map(r => (
        <Link key={r.id} to={`/receipts/${r.task_id}`} style={{ textDecoration: "none", color: "inherit" }}>
          <Card title={`Receipt ${r.id.slice(0,8)}`} provenance={r.provenance}>
            <p>Benefit: ${r.incremental_benefit.toFixed(4)} | Energy: {r.energy_wh.toFixed(1)} Wh | Carbon: {r.indicative_carbon_kg.toFixed(3)} kg</p>
          </Card>
        </Link>
      ))}
    </div>
  );
}
