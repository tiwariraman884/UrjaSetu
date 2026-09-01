Now switch from implementation mode to REAL INTEGRATION VERIFICATION mode.

The UrjaSetu x402 + Algorand integration has been implemented.

Your job is to make the REAL Algorand Testnet x402 flow work end-to-end.

DO NOT simulate success.

Verify:

1. Algorand Testnet configuration
2. x402 AVM configuration
3. GoPlausible facilitator configuration
4. payment asset configuration
5. payee/receiver configuration
6. wallet/payment signing
7. HTTP 402 response
8. x402 payment payload
9. facilitator verification
10. facilitator settlement
11. Algorand Testnet transaction
12. real transaction ID
13. backend persistence
14. payment status transition
15. task authorization
16. frontend transaction proof

Use the existing repository implementation.

First inspect .env / .env.example and identify missing configuration.

If required variables are missing, create/update .env.example and clearly list the exact values needed.

Do NOT invent secrets.

Do NOT create fake transaction IDs.

Do NOT mock GoPlausible in the production path.

Do NOT replace the Algorand Testnet flow with a local simulation.

After configuration is available, execute the real flow:

REQUEST OPTIMIZATION
? RECEIVE HTTP 402
? SIGN PAYMENT
? SEND x402 PAYMENT
? GOPLAUSIBLE VERIFY
? GOPLAUSIBLE SETTLE
? ALGORAND TESTNET
? RECEIVE REAL TX ID
? STORE TX
? MARK PAYMENT SETTLED
? AUTHORIZE TASK

Then verify the transaction using the appropriate Algorand Testnet explorer/indexer mechanism.

Confirm that the transaction ID shown in the UI is the exact transaction ID returned by the settlement flow.

Test replay protection.

Test wrong network/asset/amount.

Test failure behavior.

Finally provide a concise verification report:

X402 HTTP 402: PASS/FAIL
Wallet signing: PASS/FAIL
GoPlausible verification: PASS/FAIL
GoPlausible settlement: PASS/FAIL
Algorand Testnet transaction: PASS/FAIL
Real transaction ID: PASS/FAIL
Database persistence: PASS/FAIL
Task authorization: PASS/FAIL
Frontend proof: PASS/FAIL
Replay protection: PASS/FAIL

If anything fails, fix it before finishing.
