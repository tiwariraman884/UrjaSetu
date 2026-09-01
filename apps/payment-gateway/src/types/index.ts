/**
 * x402 + Algorand payment types for the payment gateway.
 */

export interface PaymentRequirements {
  scheme: string;          // "exact"
  network: string;         // "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=="
  maxAmountRequired: number;
  resource: string;
  description?: string;
  asset: string;           // "USDC"
  receiverAddress: string;
  assetId?: number;        // Algorand ASA id
  decimals?: number;
}

export interface PaymentPayload {
  /** The signed x402 payment header (base64 or JSON). */
  paymentHeader: string;
  paymentRequirements: PaymentRequirements;
}

export interface VerifyResponse {
  isValid: boolean;
  error?: string;
  transactionIdentifier?: string;  // Algorand tx ID
  payer?: string;
}

export interface SettleResponse {
  success: boolean;
  error?: string;
  transactionIdentifier?: string;
  payer?: string;
  network?: string;
}

export interface PaymentRecord {
  paymentId: string;
  taskId: string;
  status: "required" | "verifying" | "verified" | "settled" | "failed" | "expired";
  amount: number;
  asset: string;
  network: string;
  receiverAddress: string;
  txId?: string;
  explorerUrl?: string;
  createdAt: string;
  settledAt?: string;
  verifiedAt?: string;
  failureReason?: string;
  payerAddress?: string;
}

export interface OptimizeResponse {
  paymentId: string;
  taskId: string;
  paymentStatus: string;
  transactionId?: string;
  network: string;
  asset: string;
  amount: number;
  authorizationStatus: "authorized" | "denied";
  optimizationResult?: {
    recommendation: string;
    benefit: number;
    slot: string;
  };
}

export interface SettlementResult {
  success: boolean;
  transactionId?: string;
  network?: string;
  asset?: string;
  amount?: string;
  payer?: string;
  error?: string;
}


