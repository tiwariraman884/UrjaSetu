import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { apiError } from "../api/client";
import Card from "../components/Card";
import StatusBadge from "../components/StatusBadge";
import type { SavingsReceipt, PaymentTransaction } from "../types";

/** Loading / error / loaded states for the receipt fetch. */
type LoadState = "loading" | "not_found" | "loaded";

export default function ReceiptDetail() {
  const { id } = useParams<{ id: string }>();

  const [receipt, setReceipt] = useState<SavingsReceipt | null>(null);
  const [tx, setTx] = useState<PaymentTransaction | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [err, setErr] = useState<string | null>(null);
  const [demoBusy, setDemoBusy] = useState(false);

  const loadReceipt = async () => {
    if (!id) return;
    setLoadState("loading");
    setErr(null);
    try {
      const r = await api.get<SavingsReceipt>(`/receipts/task/${id}`);
      setReceipt(r.data);
      setLoadState("loaded");
    } catch (e: any) {
      if (e?.response?.status === 404) {
        setReceipt(null);
        setLoadState("not_found");
      } else {
        setErr(apiError(e));
        setLoadState("not_found");
      }
    }
  };

  useEffect(() => {
    loadReceipt();
  }, [id]);

  useEffect(() => {
    if (!receipt?.payment_id) return;

    api
      .get<PaymentTransaction>(
        `/payments/${receipt.payment_id}/transaction`
      )
      .then(r => setTx(r.data))
      .catch(() => {});
  }, [receipt?.payment_id]);

  /** Generate a clearly-labelled DEMO / SIMULATED receipt (no fake payment). */
  const generateDemo = async () => {
    if (!id) return;
    setDemoBusy(true);
    setErr(null);
    try {
      await api.post(`/receipts/task/${id}/demo`);
      await loadReceipt();
    } catch (e) {
      setErr(apiError(e));
    } finally {
      setDemoBusy(false);
    }
  };

  if (loadState === "loading") {
    return <p>Loading receipt…</p>;
  }

  if (loadState === "not_found" || !receipt) {
    return (
      <div className="page-narrow">
        <h1>Savings Receipt</h1>

        <Card title="Receipt Not Available" style={{ marginBottom: 16 }}>
          <div className="alert alert-warn" style={{ marginBottom: 14 }}>
            <span>⚠</span>
            <div>
              <strong>Receipt has not been generated yet.</strong>
              <div style={{ marginTop: 4, fontSize: 12 }}>
                A real savings receipt is created automatically after a
                physically-verified execution outcome. No receipt exists for
                this task yet.
              </div>
            </div>
          </div>

          <Link to={`/execution/${id}`} className="btn btn-ghost w-full">
            ← Back to Execution
          </Link>

          {/* Prototype-only DEMO fallback. Real payment settlement is not
              faked; the resulting receipt is labelled SIMULATED. */}
          <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--border)" }}>
            <div className="text-xs text-muted" style={{ marginBottom: 6 }}>
              DEMO FALLBACK
            </div>
            <p className="text-muted" style={{ fontSize: 12, marginBottom: 12 }}>
              If real x402 payment settlement is blocked (e.g. missing Testnet
              USDC), generate a clearly-labelled SIMULATED receipt to
              demonstrate the receipt feature. No blockchain payment is settled
              and no physical verification is claimed.
            </p>
            <button
              onClick={generateDemo}
              disabled={demoBusy}
              className="btn btn-ghost w-full"
            >
              {demoBusy ? "Generating…" : "Generate Demo Receipt (SIMULATED) →"}
            </button>
          </div>

          {err && (
            <div className="alert alert-error" style={{ marginTop: 12 }}>
              <span>⚠</span>
              <span>{err}</span>
            </div>
          )}
        </Card>
      </div>
    );
  }

  const verified = receipt.provenance === "MEASURED";
  const isDemo = receipt.provenance === "SIMULATED";

  return (
    <div className="page-narrow">
      <div
        style={{
          textAlign: "center",
          marginBottom: 20,
        }}
      >
        <div
          style={{
            fontSize: 42,
            marginBottom: 6,
          }}
        >
          {verified ? "✓" : isDemo ? "◌" : "◌"}
        </div>

        <h1 style={{ marginBottom: 4 }}>
          {isDemo ? "Demo Savings Receipt" : "Savings Receipt"}
        </h1>

        <p className="text-muted">
          {isDemo
            ? "Simulated prototype result — no blockchain payment settled"
            : "Measure → Compare → Verify → Report"}
        </p>
      </div>

      {isDemo && (
        <Card title="Demo Mode" accent="warn" style={{ marginBottom: 16 }}>
          <div className="alert alert-warn">
            <span>⚠</span>
            <div>
              <strong>DEMO / SIMULATED</strong>
              <div style={{ marginTop: 4, fontSize: 12 }}>
                This receipt is a simulated prototype result. No blockchain
                payment was settled and no physical verification was performed.
                Provenance is SIMULATED, not MEASURED.
              </div>
            </div>
          </div>
        </Card>
      )}

      <Card
        title={isDemo ? "Simulated Outcome" : "Verified Outcome"}
        accent={verified ? "success" : "warn"}
        style={{ marginBottom: 16 }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "14px 0 20px",
          }}
        >
          <div className="text-xs text-muted">
            ENERGY SAVED
          </div>

          <div
            style={{
              fontSize: "2.2rem",
              fontWeight: 800,
              color: "var(--green)",
              margin: "4px 0",
            }}
          >
            {receipt.energy_wh.toFixed(1)} Wh
          </div>

          <span className="badge badge-ok">
            {verified ? "PHYSICALLY VERIFIED" : "NOT PHYSICALLY VERIFIED"}
          </span>
        </div>

        <div className="grid-3">
          <div style={{ textAlign: "center" }}>
            <div className="text-xs text-muted">
              BASELINE
            </div>
            <strong>
              {receipt.baseline_cost.toFixed(4)}
            </strong>
          </div>

          <div style={{ textAlign: "center" }}>
            <div className="text-xs text-muted">
              OPTIMIZED
            </div>
            <strong className="text-green">
              {receipt.optimized_cost.toFixed(4)}
            </strong>
          </div>

          <div style={{ textAlign: "center" }}>
            <div className="text-xs text-muted">
              BENEFIT
            </div>
            <strong className="text-accent">
              +{receipt.incremental_benefit.toFixed(4)}
            </strong>
          </div>
        </div>
      </Card>

      <Card title="Impact" style={{ marginBottom: 16 }}>
        <div className="grid-2">
          <div>
            <span className="text-muted text-xs">
              ENERGY CONSUMED
            </span>
            <br />
            <strong>{receipt.energy_wh.toFixed(2)} Wh</strong>
          </div>

          <div>
            <span className="text-muted text-xs">
              CARBON AVOIDED
            </span>
            <br />
            <strong className="text-green">
              {receipt.indicative_carbon_kg.toFixed(4)} kgCO₂
            </strong>
          </div>
        </div>

        <p
          className="text-muted"
          style={{ fontSize: 11, marginTop: 12 }}
        >
          Carbon impact is estimated from grid energy displaced and the
          configured grid emission factor.
        </p>
      </Card>

      <Card title="Payment Proof" style={{ marginBottom: 16 }}>
        {tx ? (
          <>
            <div className="grid-2 mb-md">
              <div>
                <span className="text-muted text-xs">
                  NETWORK
                </span>
                <br />
                <strong>{tx.network}</strong>
              </div>

              <div>
                <span className="text-muted text-xs">
                  SETTLEMENT
                </span>
                <br />
                <StatusBadge
                  status={tx.settlement_status}
                />
              </div>

              <div>
                <span className="text-muted text-xs">
                  ASSET
                </span>
                <br />
                <strong>
                  {tx.amount} {tx.asset}
                </strong>
              </div>
            </div>

            <div>
              <span className="text-muted text-xs">
                TRANSACTION ID
              </span>

              <code
                style={{
                  display: "block",
                  marginTop: 4,
                  wordBreak: "break-all",
                  fontSize: 11,
                }}
              >
                {tx.tx_id}
              </code>
            </div>

            {tx.explorer_url && (
              <a
                href={tx.explorer_url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary w-full"
                style={{ marginTop: 12 }}
              >
                View on Algorand Testnet ↗
              </a>
            )}
          </>
        ) : isDemo ? (
          <div className="alert alert-warn">
            <span>⚠</span>
            <div>
              <strong>Payment: Not settled / Demo</strong>
              <div style={{ marginTop: 4, fontSize: 12 }}>
                No blockchain payment was settled for this demo receipt. Real
                payment proof appears here only after x402 settlement.
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted">
            Payment transaction proof will appear after settlement.
          </p>
        )}
      </Card>

      <Card
        title="Physical Verification"
        accent={verified ? "success" : "warn"}
      >
        {verified ? (
          <div className="alert alert-success">
            <span>✓</span>
            <div>
              <strong>Measured & Verified</strong>
              <div style={{ marginTop: 4 }}>
                The execution outcome is based on measured actuator telemetry.
              </div>
            </div>
          </div>
        ) : isDemo ? (
          <div className="alert alert-warn">
            <span>◌</span>
            <div>
              <strong>Not physically verified (Demo)</strong>
              <div style={{ marginTop: 4, fontSize: 12 }}>
                This is a simulated prototype result. No physical verification
                was performed. Provenance is SIMULATED, not MEASURED.
              </div>
            </div>
          </div>
        ) : (
          <div className="alert alert-warn">
            <span>◌</span>
            <div>
              <strong>Verification Pending</strong>
              <div style={{ marginTop: 4 }}>
                The result has not yet reached measured verification status.
              </div>
            </div>
          </div>
        )}
      </Card>

      <Link to={`/execution/${id}`} className="btn btn-ghost w-full">
        ← Back to Execution
      </Link>
    </div>
  );
}
