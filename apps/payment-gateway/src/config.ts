/**
 * UrjaSetu x402 Payment Gateway configuration.
 * x402 + Algorand Testnet + GoPlausible Facilitator.
 *
 * Uses REAL x402 packages: @x402/core, @x402/avm, @x402/express.
 * The gateway acts as BOTH resource server AND facilitator (GoPlausible facilitation),
 * since the public x402.org facilitator does not support Algorand (AVM).
 */
import {
  ALGORAND_TESTNET_CAIP2,
  ALGORAND_TESTNET_GENESIS_HASH,
  USDC_TESTNET_ASA_ID,
  USDC_DECIMALS,
  ALGORAND_MIN_TX_FEE,
} from "@x402/avm";
import { convertToTokenAmount } from "@x402/avm";

export const config = {
  port: Number(process.env.PAYMENT_GATEWAY_PORT) || 3001,

  // x402 protocol
  x402Version: Number(process.env.X402_VERSION) || 2,
  scheme: process.env.X402_SCHEME || "exact",

  // Algorand AVM â€” use the correct CAIP-2 identifier
  // GoPlausible provides the Algorand AVM facilitator.
  network: "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=" as `${string}:`,
  testnetGenesisHash: ALGORAND_TESTNET_GENESIS_HASH,
  asset: process.env.PAYMENT_ASSET || "USDC",
  paymentAssetId: Number(process.env.PAYMENT_ASSET_ID) || USDC_TESTNET_ASA_ID, // 10458941
  assetDecimals: USDC_DECIMALS, // 6

  // Algod (testnet via AlgoNode â€” no API key required)
  algodServer: process.env.ALGOD_SERVER || "https://testnet-api.algonode.cloud",
  algodPort: Number(process.env.ALGOD_PORT) || 443,
  algodToken: process.env.ALGOD_TOKEN || "",

  // Self-facilitator â€” facilitator's Algorand testnet private key (base64 seed)
  // Used for gasless fee payment (feePayer) on behalf of the client.
  facilitatorPrivateKey: process.env.FACILITATOR_PRIVATE_KEY || "",

  // Receiver â€” where USDC payments are sent
  receiverAddress: process.env.RECEIVER_ALGORAND_ADDRESS || "",

  // Facilitator used by the resource server for verify/settle.
  // The external GoPlausible facilitator (https://facilitator.goplausible.xyz)
  // is used because it DOES support x402 v2 / exact / Algorand Testnet AVM
  // (verified live: GET /supported returns the canonical
  //  algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=
  //  with a funded fee-payer ZMFK2...). The local self-facilitator routes
  // (/facilitator/*, fee-payer JO424...) are kept as a fallback but are NOT
  // used by the resource server unless FACILITATOR_URL is overridden to point
  // at the local endpoint (http://127.0.0.1:3001).
  facilitatorUrl: process.env.FACILITATOR_URL || "https://facilitator.goplausible.xyz",

  // Backend callback
  apiUrl: process.env.API_URL || "http://localhost:8000",

  // Pricing
  optimizationPrice: Number(process.env.OPTIMIZATION_PRICE) || 0.01, // USD
  optimizationPriceAtomic: convertToTokenAmount(
    String(Number(process.env.OPTIMIZATION_PRICE) || 0.01),
    USDC_DECIMALS,
  ), // in micro-USDC

  // Test/demo mode
  testMode: (process.env.PAYMENT_TEST_MODE || "false") === "true",

  // Min transaction fee
  minTxnrFee: ALGORAND_MIN_TX_FEE,
};

export const ALGORAND_TESTNET = config.network;
export const ALGORAND_MAINNET = "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k";

/** Explorer URL builder for Algorand transactions. */
export function explorerUrl(txId: string, network: string = config.network): string {
  const net = network.includes("testnet") || network.includes("SGO1GKSzy") ? "testnet" : "mainnet";
  return `https://lora.algokit.io/${net}/transaction/${txId}`;
}









