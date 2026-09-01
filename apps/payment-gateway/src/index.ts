/**
 * UrjaSetu x402 Payment Gateway - Express server.
 *
 * x402 + Algorand Testnet via GoPlausible Facilitator.
 *
 * Flow:
 * 1. Client requests POST /api/payment/optimize without payment => HTTP 402 + Payment-Required
 * 2. Client connects Algorand wallet, signs an x402 payment payload
 * 3. Client retries with X-Payment / Payment-Signature header
 * 4. Gateway verifies via GoPlausible Facilitator
 * 5. Gateway settles via the in-process facilitator (/facilitator/settle) â€” real Algorand Testnet tx
 * 6. Returns transaction ID + authorizes task
 */
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { config } from "./config";
import paymentRoutes from "./routes/paymentRoutes";
import facilitatorRoutes from "./routes/facilitatorRoutes";

const app = express();

app.use(cors());
app.use(express.json());

// Request ID middleware
app.use((req, _res, next) => {
  (req as any).requestId = req.headers["x-request-id"] || crypto.randomUUID();
  next();
});

// Normalize X-Payment -> Payment-Signature for x402 SDK compatibility
// (the SDK's HTTP adapter extracts only the Payment-Signature header).
app.use((req, _res, next) => {
  if (!req.header("payment-signature") && req.header("x-payment")) {
    (req.headers as Record<string, string | string[]>)["payment-signature"] = req.header("x-payment")!;
  }
  next();
});

// Health
app.get("/health", (_req, res) => {
  const selfHosted = config.facilitatorUrl.includes("127.0.0.1") || config.facilitatorUrl.includes("localhost");
  res.json({
    status: "ok",
    service: "urjasetu-payment-gateway",
    version: "0.2.0",
    x402: true,
    network: config.network,
    facilitator: config.facilitatorUrl,
    selfFacilitated: selfHosted,
    testMode: config.testMode,
  });
});

// Self-facilitator HTTP endpoints (consumed by HTTPFacilitatorClient)
app.use("/facilitator", facilitatorRoutes);

// Payment routes (x402-protected)
app.use("/api/payment", paymentRoutes);

app.listen(config.port, () => {
  console.log(`[payment-gateway] x402 gateway on :${config.port} (network=${config.network})`);
});

export default app;

