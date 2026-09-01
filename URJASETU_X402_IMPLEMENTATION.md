You are the lead engineer for the existing UrjaSetu national hackathon prototype.

IMPORTANT:
We have very limited time before final submission.
Do NOT rebuild the project.
Do NOT redesign unrelated functionality.
Do NOT remove or break any existing energy-management functionality.

Your immediate objective is to implement the MANDATORY x402 + Algorand integration required for the final judging.

FIRST inspect the entire repository:
- package.json
- frontend
- backend
- database
- API routes
- authentication
- telemetry
- task management
- optimization
- actuator/device control
- execution verification
- savings receipt
- environment configuration
- existing AppFlow.md
- existing documentation
- tests

Then implement the following as one cohesive production-quality feature.

==================================================
MANDATORY ARCHITECTURE
==================================================

Existing UrjaSetu:

ESP32 / Meter
? Telemetry
? FastAPI
? Validation
? Optimization
? Task
? Approval
? Command
? Device
? Physical Verification
? Savings Receipt

Extend it to:

Telemetry
? Optimization
? Verified Optimization Request
? HTTP 402 Payment Required
? x402 payment
? Algorand Testnet
? GoPlausible Facilitator
? Payment Verification
? Settlement
? Task Authorization
? User Approval
? Device Command
? Physical Verification
? Savings Receipt

Blockchain/payment must be a REAL integration, not simulated.

==================================================
X402
==================================================

Inspect the existing Node/TypeScript architecture and install/use only the
currently compatible x402 packages required for Algorand/AVM integration.

Verify the actual package API before coding.

Relevant packages may include:

@x402/core
@x402/avm

Do not blindly assume APIs or package versions.

The code must genuinely use x402.

Create an x402-protected UrjaSetu resource.

Conceptually:

POST /api/v1/optimization/verified

If payment is missing:

HTTP 402 Payment Required

If valid payment is supplied:

continue with the protected operation.

Do not fake HTTP 402.

Do not make frontend-only payment checks.

Backend must be authoritative.

==================================================
ALGORAND
==================================================

Use Algorand TESTNET.

Do not use mainnet.

Use the correct network identifier required by the installed x402 AVM version.

Centralize configuration.

Add appropriate environment variables to .env.example.

Never expose private keys or secrets to frontend.

==================================================
GOPLAUSIBLE
==================================================

Use the GoPlausible facilitator.

Default hosted facilitator:

https://facilitator.goplausible.xyz

Make this configurable:

FACILITATOR_URL

The backend must communicate with the facilitator for x402 verification/settlement.

Do not bypass the facilitator.

==================================================
PAYMENT FLOW
==================================================

Implement:

Frontend
? request verified optimization
? Backend returns HTTP 402
? frontend receives payment requirements
? wallet/payment signing
? x402 payment
? backend receives payment
? GoPlausible facilitator verification
? settlement
? Algorand Testnet transaction
? real transaction ID
? backend stores payment
? task becomes PAYMENT_AUTHORIZED
? user still needs to approve execution

IMPORTANT:

PAYMENT AUTHORIZED
does NOT mean
DEVICE EXECUTION AUTHORIZED.

User approval remains mandatory.

==================================================
DATABASE
==================================================

Inspect existing schema first.

Add only necessary entities.

Payment:

id
task_id
user_id
status
amount
asset
network
receiver
resource
scheme
facilitator
created_at
expires_at
verified_at
settled_at
failure_reason

PaymentTransaction:

id
payment_id
algorand_tx_id
network
sender
receiver
asset
amount
confirmed_at
explorer_url
status

Add foreign keys and useful indexes.

Prevent duplicate transaction IDs and payment replay.

Never store private keys or seed phrases.

==================================================
PAYMENT STATE
==================================================

Implement:

PAYMENT_REQUIRED
SIGNING
VERIFYING
SETTLING
SETTLED

Failure states:

FAILED
EXPIRED
REJECTED
REPLAY_BLOCKED

Backend controls state transitions.

==================================================
VALIDATION
==================================================

Before accepting payment verify:

- correct resource
- correct task
- correct amount
- correct asset
- correct network
- correct receiver
- not expired
- valid x402 payment
- facilitator verification successful
- settlement successful
- payment not already consumed

Any failure must prevent task authorization.

==================================================
PAYMENT ? TASK
==================================================

Link payment directly to the energy task.

Successful settlement should transition:

PAYMENT_REQUIRED
? PAYMENT_AUTHORIZED

Do not automatically execute the task.

==================================================
TRANSACTION PROOF
==================================================

Persist the REAL Algorand transaction ID.

Never generate fake transaction IDs.

Add backend endpoint equivalent to:

GET /api/v1/payments/:paymentId/transaction

Return:

paymentId
status
network
transactionId
amount
asset
sender
receiver
confirmedAt
explorerUrl

Explorer URL must use the REAL transaction ID.

==================================================
FRONTEND
==================================================

Integrate with existing UrjaSetu UI.

Do not create a crypto-looking website.

Add:

PAY & UNLOCK

to the verified optimization flow.

Payment modal/page should show:

Service
Amount
Asset
Network
Recipient
Expiration

States:

Payment Required
Connecting Wallet
Waiting for Signature
Verifying Payment
Settling on Algorand
Payment Confirmed
Payment Failed

After success:

Payment verified.
Optimization unlocked.

Then show:

Continue to Approval

==================================================
TRANSACTION PROOF UI
==================================================

Add reusable component:

BlockchainProof

Display:

x402
? Verified

GoPlausible
? Facilitated

Algorand Testnet
? Settled

Transaction ID
REAL TX ID

Amount
REAL AMOUNT

Timestamp
REAL TIMESTAMP

[VIEW ON ALGORAND TESTNET]

Never show confirmed unless backend has actual settlement data.

==================================================
SAFETY
==================================================

Before actuator execution verify:

payment settled
AND
telemetry fresh
AND
device online
AND
task valid
AND
user approved
AND
command not expired
AND
command not already executed

If any condition fails:

BLOCK/HOLD execution.

Preserve existing stale telemetry safety.

==================================================
TESTS
==================================================

Add tests for:

missing payment ? 402
valid payment ? accepted
wrong amount ? rejected
wrong network ? rejected
wrong asset ? rejected
wrong receiver ? rejected
expired payment ? rejected
replayed payment ? rejected
facilitator failure ? safe failure
settlement failure ? task remains unauthorized
successful settlement ? payment SETTLED
successful settlement ? task PAYMENT_AUTHORIZED

Also verify existing energy tests still pass.

==================================================
PACKAGE.JSON
==================================================

Inspect package.json.

Add only genuinely required dependencies.

Ensure relevant x402 AVM dependencies are actually present and imported.

Remove nothing required by existing project.

Run install/build/typecheck/lint/tests as supported by the repository.

==================================================
DOCUMENTATION
==================================================

Update:

README.md
AppFlow.md
.env.example

Create:

docs/X402-ALGORAND.md

Document the actual implementation.

==================================================
CRITICAL
==================================================

Do not claim real blockchain functionality if configuration is missing.

If credentials/wallet/testnet configuration are missing, clearly identify the exact remaining environment configuration required.

Do not replace real functionality with fake success.

At the end provide:

1. files modified
2. files created
3. dependencies added
4. database changes
5. APIs added
6. environment variables required
7. exact commands to run
8. remaining blockers
9. exact steps to perform a real Algorand Testnet x402 transaction

Start immediately by auditing the repository, then implement the complete integration.
