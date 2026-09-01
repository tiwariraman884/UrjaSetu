import { useCallback, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useWallet } from "@txnlab/use-wallet-react";
import { x402Client } from "@x402/core/client";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import type { ClientAvmSigner } from "@x402/avm";
import Card from "../components/Card";
import type { OptimizeResponse } from "../types";

/**
 * x402 + Algorand Testnet payment flow (REAL — no fake success).
 *
 * State machine:
 *   IDLE -> CONNECTING_WALLET -> PAYMENT_REQUIRED -> SIGNING -> VERIFYING
 *        -> SETTLING -> SETTLED | FAILED
 *
 * The connected Pera/TxnLab wallet is used directly as the @x402/avm
 * ClientAvmSigner (it exposes `address` + `signTransactions`). No private
 * keys ever live in the browser. `wrapFetchWithPayment` performs the
 * standard x402 v2 flow: 402 -> create payment payload -> sign via wallet ->
 * retry with Payment-Signature header -> facilitator verify/settle ->
 * real Algorand Testnet transaction.
 */

const ALGORAND_TESTNET = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=";
const GATEWAY_BASE =
  import.meta.env.VITE_PAYMENT_GATEWAY_URL || "http://127.0.0.1:3001";

type PayState =
  | "IDLE"
  | "CONNECTING_WALLET"
  | "PAYMENT_REQUIRED"
  | "SIGNING"
  | "VERIFYING"
  | "SETTLING"
  | "SETTLED"
  | "FAILED";

/** Decode a 402 PAYMENT-REQUIRED (base64 JSON) header, if present. */
function decodePaymentRequired(headers: Headers): any | null {
  const h = headers.get("payment-required") || headers.get("PAYMENT-REQUIRED");
  if (!h) return null;
  try {
    return JSON.parse(atob(h));
  } catch {
    return null;
  }
}

/** Extract a human-readable failure reason from a gateway 402 response. */
function extractFailureReason(
  status: number,
  body: any,
  headers: Headers,
): string {
  if (body?.error?.message) return body.error.message;
  if (body?.error?.code) return body.error.code;
  const pr = decodePaymentRequired(headers);
  if (pr?.error) return String(pr.error);
  if (status === 402) return "Payment required (HTTP 402)";
  return `HTTP ${status}`;
}

export default function Payment() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const {
    wallets,
    activeAddress,
    activeWallet,
    signTransactions,
  } = useWallet();

  const [state, setState] = useState<PayState>("IDLE");
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const availableWallets = useMemo(
    () => wallets.filter((w) => w.id !== "kmd" || w.isConnected),
    [wallets],
  );

  /** Build an x402 client bound to the connected wallet (ClientAvmSigner). */
  const buildPaymentClient = useCallback((): x402Client | null => {
    if (!activeWallet || !activeAddress) return null;
    // The connected wallet signs via the useWallet() hook's signTransactions.
    // Adapt it to the @x402/avm ClientAvmSigner interface ({ address,
    // signTransactions }). No private key leaves the wallet.
    const signer: ClientAvmSigner = {
      address: activeAddress,
      signTransactions: (
        txns: Uint8Array[],
        indexesToSign?: number[],
      ) => signTransactions(txns, indexesToSign) as Promise<(Uint8Array | null)[]>,
    };
    const client = new x402Client();
    client.register(
      ALGORAND_TESTNET,
      new ExactAvmScheme(signer, {
        algodUrl: "https://testnet-api.algonode.cloud",
      }),
    );
    return client;
  }, [activeWallet, activeAddress, signTransactions]);

  const connectWallet = async (walletId: string) => {
    setErr(null);
    setState("CONNECTING_WALLET");
    const w = wallets.find((x) => x.id === walletId);
    if (!w) {
      setErr(`Wallet ${walletId} not available.`);
      setState("FAILED");
      return;
    }
    try {
      await w.connect();
      setState("IDLE");
    } catch (e: any) {
      setErr(e?.message || "Wallet connection failed");
      setState("FAILED");
    }
  };

  /** Run the full x402 flow against /api/payment/optimize using the wallet. */
  const runPaymentFlow = async () => {
    setErr(null);
    setResult(null);
    setTxId(null);
    setBusy(true);

    const client = buildPaymentClient();
    if (!client) {
      setErr("Connect an Algorand wallet first.");
      setState("FAILED");
      setBusy(false);
      return;
    }

    setState("PAYMENT_REQUIRED");

    // wrapFetchWithPayment: 402 -> create payload -> sign (wallet) -> retry.
    // The wallet signing prompt happens during the signed retry.
    const fetchWithPay = wrapFetchWithPayment(globalThis.fetch, client);

    try {
      const resp = await fetchWithPay(`${GATEWAY_BASE}/api/payment/optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: id }),
      });

      const raw = await resp.text();
      let body: any = {};
      try {
        body = JSON.parse(raw);
      } catch {
        /* keep raw */
      }

      if (resp.ok && body.paymentStatus === "settled") {
        setState("VERIFYING");
        setState("SETTLING");
        setTxId(body.transactionId || null);
        setResult(body);
        setState("SETTLED");
        return;
      }

      // Failure: surface the REAL reason from the gateway/facilitator.
      const reason = extractFailureReason(resp.status, body, resp.headers);
      setErr(reason);
      setState("FAILED");
    } catch (e: any) {
      // wrapFetchWithPayment throws when signing or verification fails.
      const reason =
        e?.message || e?.cause?.message || "x402 payment flow failed";
      setErr(reason);
      setState("FAILED");
    } finally {
      setBusy(false);
    }
  };


  const stepState = (s: PayState): "done" | "active" | "" => {
    const order: PayState[] = [
      "CONNECTING_WALLET",
      "PAYMENT_REQUIRED",
      "SIGNING",
      "VERIFYING",
      "SETTLING",
      "SETTLED",
    ];
    const cur = order.indexOf(state);
    const tgt = order.indexOf(s);
    if (state === "SETTLED" && s === "SETTLED") return "done";
    if (cur > tgt) return "done";
    if (cur === tgt) return "active";
    return "";
  };

  const connected = !!activeAddress;

  return (
    <div className="page-narrow">
      <h1>Payment Unlock</h1>

      <Card
        title="Verified Energy Optimization"
        style={{ marginBottom: 16 }}
      >
        <p style={{ marginBottom: 14 }}>
          Unlock verified optimization for task{" "}
          <code>{id?.slice(0, 8)}</code>
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 8,
          }}
        >
          <div className="card">
            <div className="text-xs text-muted">AMOUNT</div>
            <strong className="text-accent">0.01 USDC</strong>
          </div>

          <div className="card">
            <div className="text-xs text-muted">NETWORK</div>
            <strong>Algorand Testnet</strong>
          </div>

          <div className="card">
            <div className="text-xs text-muted">PROTOCOL</div>
            <strong>x402 v2 / exact</strong>
          </div>

          <div className="card">
            <div className="text-xs text-muted">FACILITATOR</div>
            <strong>GoPlausible</strong>
          </div>
        </div>
      </Card>

      <Card title="Payment Flow" style={{ marginBottom: 16 }}>
        <div className="pay-timeline">
          <div className={`pay-step ${stepState("CONNECTING_WALLET")}`}>
            <span className="pay-step-icon">
              {stepState("CONNECTING_WALLET") === "done" ? "✅" : "👛"}
            </span>
            <div style={{ flex: 1 }}>
              <div className="pay-step-label">Connect Pera Wallet</div>
              <div className="pay-step-sub">
                {connected ? (
                  <code>{activeAddress?.slice(0, 8)}…</code>
                ) : (
                  "Algorand Testnet wallet"
                )}
              </div>
            </div>
          </div>

          <div className={`pay-step ${stepState("PAYMENT_REQUIRED")}`}>
            <span className="pay-step-icon">{"✍️"}</span>
            <div style={{ flex: 1 }}>
              <div className="pay-step-label">HTTP 402 Challenge</div>
              <div className="pay-step-sub">x402 payment requirement</div>
            </div>
          </div>

          <div className={`pay-step ${stepState("SIGNING")}`}>
            <span className="pay-step-icon">{"✍️"}</span>
            <div style={{ flex: 1 }}>
              <div className="pay-step-label">Sign Payment</div>
              <div className="pay-step-sub">Algorand AVM exact payload</div>
            </div>
          </div>

          <div className={`pay-step ${stepState("VERIFYING")}`}>
            <span className="pay-step-icon">{"🔍"}</span>
            <div style={{ flex: 1 }}>
              <div className="pay-step-label">Verifying</div>
              <div className="pay-step-sub">Facilitator on-chain simulation</div>
            </div>
          </div>

          <div className={`pay-step ${stepState("SETTLING")}`}>
            <span className="pay-step-icon">{"⛓"}</span>
            <div style={{ flex: 1 }}>
              <div className="pay-step-label">Settling</div>
              <div className="pay-step-sub">Algorand Testnet transaction</div>
            </div>
          </div>

          <div className={`pay-step ${stepState("SETTLED")}`}>
            <span className="pay-step-icon">
              {state === "SETTLED" ? "✅" : "○"}
            </span>
            <div style={{ flex: 1 }}>
              <div className="pay-step-label">Payment Confirmed</div>
              <div className="pay-step-sub">Task authorized after settlement</div>
            </div>
          </div>
        </div>
      </Card>

      {state !== "SETTLED" && (
        <Card title="x402 Payment Gate">
          <div className="alert alert-info">
            <span>🔐</span>
            <div>
              <strong>Payment authorization is required.</strong>
              <div style={{ marginTop: 4 }}>
                The execution engine remains locked until the x402 payment is
                verified and settled on Algorand Testnet.
              </div>
            </div>
          </div>

          <div
            className="text-xs text-muted"
            style={{ marginTop: 14, marginBottom: 6 }}
          >
            REAL PAYMENT
          </div>

          {!connected && (
            <div style={{ marginBottom: 16 }}>
              {availableWallets.length === 0 ? (
                <div className="alert alert-error">
                  <span>⚠</span>
                  <span>
                    No Algorand wallet adapter is registered. Install/connect
                    a Pera Wallet adapter to sign payments in the browser.
                  </span>
                </div>
              ) : (
                <>
                  {availableWallets.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => connectWallet(w.id)}
                      disabled={busy}
                      className="btn btn-ghost w-full"
                      style={{ marginBottom: 8 }}
                    >
                      Connect {w.metadata?.name || w.id}
                    </button>
                  ))}
                </>
              )}
            </div>
          )}

          {connected && (
            <button
              onClick={runPaymentFlow}
              disabled={busy}
              className="btn btn-primary w-full"
              style={{ marginBottom: 16 }}
            >
              {busy
                ? state === "SIGNING"
                  ? "Sign in wallet…"
                  : state === "VERIFYING"
                  ? "Verifying…"
                  : state === "SETTLING"
                  ? "Settling…"
                  : "Processing…"
                : "Pay 0.01 USDC & Unlock →"}
            </button>
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
        </Card>
      )}

      {/* ALGORAND TESTNET PROOF — inspection / navigation aid only.
          This never claims payment success. It links to the real public
          Algorand Testnet LoRa explorer, preferring a real transaction id
          (txId / result.transactionId) when one exists from a settled payment. */}
      <Card title="Algorand Testnet Proof" style={{ marginBottom: 16 }}>
        <p className="text-muted" style={{ marginBottom: 14 }}>
          Open the Algorand Testnet explorer to inspect real transactions and
          network state.
        </p>

        {(() => {
          const realTx = txId || result?.transactionId || null;
          const loraUrl = realTx
            ? `https://lora.algokit.io/testnet/transaction/${realTx}`
            : "https://lora.algokit.io/testnet";
          const label = realTx
            ? "View Transaction on LoRa ↗"
            : "Open LoRa Testnet ↗";
          return (
            <>
              {realTx && (
                <div style={{ marginBottom: 10 }}>
                  <div className="text-xs text-muted">TRANSACTION ID</div>
                  <code
                    style={{
                      display: "block",
                      marginTop: 5,
                      wordBreak: "break-all",
                    }}
                  >
                    {realTx}
                  </code>
                </div>
              )}
              <a
                href={loraUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost w-full"
              >
                {label}
              </a>
            </>
          );
        })()}
      </Card>

      {/* DEMO MODE — navigation only. Does NOT settle payment, does NOT
          authorize the task, does NOT bypass backend execution checks.
          The execution page will still show EXECUTION LOCKED until a real
          payment has settled. */}
      <Card title="Demo Mode" style={{ marginBottom: 16 }}>
        <div className="alert alert-stale" style={{ marginBottom: 14 }}>
          <span>⚠</span>
          <div>
            <strong>DEMO MODE — payment is not settled.</strong>
            <div style={{ marginTop: 4, fontSize: 12 }}>
              Demo navigation does not represent a completed payment. Execution
              remains LOCKED unless a real x402 payment has settled.
            </div>
          </div>
        </div>

        <button
          onClick={() => nav(`/execution/${id}`)}
          className="btn btn-ghost w-full"
        >
          Continue in Prototype Demo →
        </button>
      </Card>

      {state === "SETTLED" && result && (
        <Card title="Payment Verified" accent="success">
          <div className="alert alert-success">
            <span>✓</span>
            <span>✓ Payment Verified — settled on Algorand Testnet.</span>
          </div>
          <div className="alert alert-success" style={{ marginTop: 8 }}>
            <span>✓</span>
            <span>✓ Payment Settled — task is now authorized.</span>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="text-xs text-muted">TRANSACTION ID</div>
            <code
              style={{
                display: "block",
                marginTop: 5,
                wordBreak: "break-all",
              }}
            >
              {txId || result.transactionId || "—"}
            </code>
          </div>

          {(txId || result.transactionId) && (
            <a
              href={`https://lora.algokit.io/testnet/transaction/${
                txId || result.transactionId
              }`}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost w-full"
              style={{ marginTop: 14 }}
            >
              ↗ View on Algorand Testnet
            </a>
          )}

          <button
            onClick={() => nav(`/execution/${id}`)}
            className="btn btn-primary w-full"
            style={{ marginTop: 12 }}
          >
            Proceed to Execution →
          </button>
        </Card>
      )}
    </div>
  );
}
