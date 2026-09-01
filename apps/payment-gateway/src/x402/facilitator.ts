/**
 * x402 Facilitator for Algorand Testnet (AVM Exact scheme) — self-facilitated.
 *
 * The payment gateway runs the facilitator IN-PROCESS and serves the standard
 * facilitator HTTP endpoints (/verify, /settle, /supported) from
 * `src/routes/facilitatorRoutes.ts`. The x402 SDK's `HTTPFacilitatorClient`
 * (used by the resource server) talks to those self-hosted endpoints.
 *
 * Uses REAL x402 packages: @x402/core/facilitator + @x402/avm/exact/facilitator.
 *
 * The facilitator holds an Algorand Testnet account (FACILITATOR_PRIVATE_KEY)
 * used to sign fee-payer transactions on behalf of clients (gasless payments).
 */
import { x402Facilitator } from "@x402/core/facilitator";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { ExactAvmScheme } from "@x402/avm/exact/facilitator";
import { toFacilitatorAvmSigner } from "@x402/avm";
import algosdk from "algosdk";

import { config, ALGORAND_TESTNET } from "../config";

let _facilitator: x402Facilitator | null = null;
let _facilitatorClient: HTTPFacilitatorClient | null = null;
let _facilitatorAddress: string | null = null;

/**
 * Resolve the base64 64-byte Algorand secret key used by the facilitator.
 *
 * When `FACILITATOR_PRIVATE_KEY` is not configured but `PAYMENT_TEST_MODE=true`,
 * a throwaway account is generated at startup so the gateway can still demo the
 * full verify/settle pipeline end-to-end.
 */
function resolveSecretKeyBase64(configured: string): string {
  if (configured) return configured;
  if (config.testMode) {
    console.warn(
      "[payment-gateway] FACILITATOR_PRIVATE_KEY not set; generating a throwaway Testnet fee-payer account (PAYMENT_TEST_MODE=true).",
    );
    const account = algosdk.generateAccount();
    _facilitatorAddress = account.addr;
    return Buffer.from(account.sk).toString("base64");
  }
  throw new Error(
    "FACILITATOR_PRIVATE_KEY is required (or set PAYMENT_TEST_MODE=true to use a throwaway demo account).",
  );
}

/** Address the facilitator uses as fee-payer (null until the facilitator is created). */
export function getFacilitatorAddress(): string | null {
  return _facilitatorAddress;
}

/**
 * Create (singleton) the in-process facilitator with the Algorand AVM exact scheme.
 * The facilitator uses config.facilitatorPrivateKey for gasless fee payment.
 */
export function createFacilitator(): x402Facilitator {
  if (_facilitator) return _facilitator;

  const secretKey = resolveSecretKeyBase64(config.facilitatorPrivateKey);

  // The AVM facilitator scheme uses algokit-utils internally; it connects to
  // AlgoNode Testnet by default (no API key required) or to a custom URL.
  const signer = toFacilitatorAvmSigner(secretKey, {
    testnetUrl: config.algodServer,
    algodToken: config.algodToken || undefined,
  });

  if (!_facilitatorAddress) {
    _facilitatorAddress = signer.getAddresses()[0] ?? null;
  }

  const facilitator = new x402Facilitator();
  facilitator.register(ALGORAND_TESTNET, new ExactAvmScheme(signer));

  _facilitator = facilitator;
  return facilitator;
}

/**
 * Create (singleton) the HTTP facilitator client that talks to the gateway's own
 * facilitator endpoints (self-facilitation). Used by the x402ResourceServer.
 */
export function createFacilitatorClient(): HTTPFacilitatorClient {
  if (_facilitatorClient) return _facilitatorClient;

  _facilitatorClient = new HTTPFacilitatorClient({
    url: config.facilitatorUrl,
    timeoutMs: 30_000,
  });
  return _facilitatorClient;
}

