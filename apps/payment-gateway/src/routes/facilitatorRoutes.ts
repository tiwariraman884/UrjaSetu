/**
 * x402 Facilitator HTTP endpoints (self-facilitation).
 *
 * These endpoints are called by the `HTTPFacilitatorClient` (v2 protocol body:
 * `{ x402Version, paymentPayload, paymentRequirements }`), and also accept the
 * legacy `{ paymentHeader, paymentRequirements }` body used by the FastAPI
 * backend (`payment_service.py`).
 *
 * Backed by the REAL in-process `x402Facilitator`:
 * - POST /verify    → verifies the signed AVM payment group (simulation, amount,
 *                     receiver, asset, fee-payer checks)
 * - POST /settle    → submits the atomic transaction group to Algorand Testnet
 *                     and returns the REAL transaction ID
 * - GET  /supported → advertises supported payment kinds / fee-payer signers
 */
import { Router, Request, Response } from "express";
import type { PaymentPayload, PaymentRequirements } from "@x402/core/types";
import { createFacilitator } from "../x402/facilitator";

const router = Router();

interface VerifyBody {
  x402Version?: number;
  paymentPayload?: PaymentPayload;
  paymentHeader?: string;
  paymentRequirements: PaymentRequirements;
}

/**
 * Decode a legacy payment header (base64 JSON v2 PaymentPayload, or raw JSON).
 */
function decodePaymentHeader(header: string): PaymentPayload {
  try {
    const decoded = Buffer.from(header, "base64").toString("utf-8");
    if (decoded.trim().startsWith("{")) {
      return JSON.parse(decoded) as PaymentPayload;
    }
  } catch {
    // not base64 – fall through to raw JSON
  }
  return JSON.parse(header) as PaymentPayload;
}

/**
 * Normalize the facilitator request body into the v2 `{ paymentPayload,
 * paymentRequirements }` shape used by `x402Facilitator.verify/settle`.
 */
function normalizeRequestBody(body: VerifyBody): { paymentPayload: PaymentPayload; paymentRequirements: PaymentRequirements } {
  if (body.paymentPayload) {
    return { paymentPayload: body.paymentPayload, paymentRequirements: body.paymentRequirements };
  }
  if (body.paymentHeader) {
    return { paymentPayload: decodePaymentHeader(body.paymentHeader), paymentRequirements: body.paymentRequirements };
  }
  throw new Error("missing paymentPayload or paymentHeader");
}

/**
 * POST /verify
 *
 * Verifies a payment payload (signatures, amount, receiver, asset, network,
 * fee-payer safety, on-chain simulation). Returns 200 on success and 400 with
 * `{ isValid: false, invalidReason, invalidMessage }` on verification failure
 * (matching the official facilitator HTTP contract consumed by the SDK).
 */
router.post("/verify", async (req: Request, res: Response) => {
  const requestId = (req as any).requestId || "unknown";
  try {
    const { paymentPayload, paymentRequirements } = normalizeRequestBody(req.body || {});

    const facilitator = createFacilitator();
    const result = await facilitator.verify(paymentPayload, paymentRequirements);

    console.log(`[facilitator] verify requestId=${requestId} valid=${result.isValid}`);
    if (result.isValid) {
      return res.json(result); // { isValid: true, payer?, extensions?, extra? }
    }
    // Backward-compatible alias for the legacy GoPlausible-style consumer.
    return res.status(400).json({
      ...result,
      error: result.invalidMessage || result.invalidReason || "verification failed",
    });
  } catch (err: any) {
    console.error(`[facilitator] verify error requestId=${requestId}:`, err?.message || err);
    return res.status(500).json({
      isValid: false,
      invalidReason: "facilitator_verify_error",
      invalidMessage: err?.message || "facilitator verify error",
      error: err?.message || "facilitator verify error",
    });
  }
});

/**
 * POST /settle
 *
 * Settles a verified payment by submitting the atomic transaction group to
 * Algorand Testnet. Returns the REAL transaction ID. Returns 400 with
 * `{ success: false, errorReason, errorMessage }` on settlement failure.
 */
router.post("/settle", async (req: Request, res: Response) => {
  const requestId = (req as any).requestId || "unknown";
  try {
    const { paymentPayload, paymentRequirements } = normalizeRequestBody(req.body || {});

    const facilitator = createFacilitator();
    const result = await facilitator.settle(paymentPayload, paymentRequirements);

    console.log(
      `[facilitator] settle requestId=${requestId} success=${result.success} tx=${result.transaction || "none"}`,
    );
    if (result.success) {
      // Backward-compatible alias for the legacy GoPlausible-style consumer.
      return res.json({ ...result, transactionIdentifier: result.transaction });
    }
    return res.status(400).json({
      ...result,
      transactionIdentifier: result.transaction || undefined,
      error: result.errorMessage || result.errorReason || "settlement failed",
    });
  } catch (err: any) {
    console.error(`[facilitator] settle error requestId=${requestId}:`, err?.message || err);
    return res.status(500).json({
      success: false,
      errorReason: "facilitator_settle_error",
      errorMessage: err?.message || "facilitator settle error",
      error: err?.message || "facilitator settle error",
      transaction: "",
      transactionIdentifier: undefined,
      network: undefined,
    });
  }
});

/**
 * GET /supported
 *
 * Advertises the payment kinds, extensions, and signers (fee-payers) supported
 * by this facilitator — consumed by `HTTPFacilitatorClient.getSupported()`.
 */
router.get("/supported", (_req: Request, res: Response) => {
  try {
    const facilitator = createFacilitator();
    res.json(facilitator.getSupported());
  } catch (err: any) {
    console.error("[facilitator] supported error:", err?.message || err);
    res.status(500).json({ error: err?.message || "facilitator supported error" });
  }
});

export default router;