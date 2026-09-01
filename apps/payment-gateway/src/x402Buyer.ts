import "dotenv/config";

import { x402Client, x402HTTPClient } from "@x402/core/client";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import { toClientAvmSigner } from "@x402/avm";

const GATEWAY_URL =
  process.env.PAYMENT_GATEWAY_URL || "http://127.0.0.1:3001";

const TASK_ID =
  process.env.X402_TASK_ID ||
  "f8823310-6ef1-4287-aac8-68d8c37b0c4d";

const PRIVATE_KEY = process.env.PAYER_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  throw new Error(
    "PAYER_PRIVATE_KEY is missing from apps/payment-gateway/.env"
  );
}

async function main() {
  const signer = toClientAvmSigner(PRIVATE_KEY!);

  console.log("\n=== X402 BUYER ===");
  console.log("Gateway:", GATEWAY_URL);
  console.log("Task:", TASK_ID);
  console.log("Payer:", signer.address);

  const client = new x402Client();

  client.register(
    "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=",
    new ExactAvmScheme(signer, {
      algodUrl: "https://testnet-api.algonode.cloud",
    })
  );

  const httpClient = new x402HTTPClient(client);

  console.log("\n=== REQUESTING PAYMENT CHALLENGE ===");

  const initial = await fetch(
    `${GATEWAY_URL}/api/payment/optimize`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        taskId: TASK_ID,
      }),
    }
  );

  console.log("Initial HTTP status:", initial.status);

  if (initial.status !== 402) {
    const body = await initial.text();
    console.log("Unexpected response:", body);
    throw new Error(
      `Expected HTTP 402, received ${initial.status}`
    );
  }

  const paymentRequired =
    httpClient.getPaymentRequiredResponse(
      (name) => initial.headers.get(name),
      undefined
    );

  console.log("\n=== 402 REQUIREMENTS RECEIVED ===");
  console.log(JSON.stringify(paymentRequired, null, 2));

  console.log("\n=== CREATING SIGNED PAYMENT ===");

  const paymentPayload =
    await httpClient.createPaymentPayload(paymentRequired);

  console.log("Payment payload created.");

  const paymentHeaders =
    httpClient.encodePaymentSignatureHeader(
      paymentPayload
    );

  console.log(
    "Generated payment header:",
    Object.keys(paymentHeaders).join(", ")
  );

  console.log("\n=== RETRYING WITH SIGNED PAYMENT ===");

  const paid = await fetch(
    `${GATEWAY_URL}/api/payment/optimize`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...paymentHeaders,
      },
      body: JSON.stringify({
        taskId: TASK_ID,
      }),
    }
  );

  console.log("Paid HTTP status:", paid.status);

  const resultText = await paid.text();

  console.log("\n=== GATEWAY RESPONSE ===");
  console.log(resultText);

  if (!paid.ok) {
    throw new Error(
      `Payment flow failed with HTTP ${paid.status}`
    );
  }

  let result: any = {};

  try {
    result = JSON.parse(resultText);
  } catch {
    // keep raw response
  }

  console.log("\n=== FINAL RESULT ===");
  console.log("Payment:", result.paymentStatus);
  console.log("Authorization:", result.authorizationStatus);
  console.log("Transaction:", result.transactionId);

  if (result.transactionId) {
    console.log(
      "\nLoRA:",
      `https://lora.algokit.io/testnet/transaction/${result.transactionId}`
    );
  }
}

main().catch((error) => {
  console.error("\n❌ X402 BUYER FAILED");
  console.error(error?.message || error);
  process.exit(1);
});


