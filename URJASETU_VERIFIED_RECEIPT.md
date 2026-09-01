Enhance the existing UrjaSetu Savings Receipt and auditability without changing existing energy calculations.

Do not rebuild existing receipt logic.

Extend it into a verified end-to-end proof artifact.

The final receipt must combine:

ENERGY PROOF
- task
- device
- runtime
- energy consumed
- baseline cost
- optimized cost
- incremental benefit

EXECUTION PROOF
- command ID
- command timestamp
- device acknowledgement
- observed power
- expected power
- physical verification status

PAYMENT PROOF
- x402 status
- payment ID
- amount
- asset
- facilitator
- payment timestamp

BLOCKCHAIN PROOF
- Algorand Testnet
- REAL transaction ID
- sender
- receiver
- amount
- timestamp
- explorer URL

PROVENANCE
- measured
- derived
- estimated
- forecast
- simulated

CRITICAL RULE:

The receipt can only become VERIFIED when:

payment settlement succeeded
AND
physical execution succeeded
AND
sensor verification succeeded.

Payment alone must never create a VERIFIED receipt.

Device acknowledgement alone must never create a VERIFIED receipt.

Blockchain transaction alone must never create a VERIFIED receipt.

Add an audit timeline:

Task Created
Optimization Generated
Payment Required
Payment Signed
Payment Verified
Payment Settled
Task Authorized
User Approved
Command Issued
Device Acknowledged
Execution Verified
Receipt Generated

Store audit events server-side.

Do not store secrets.

Make the receipt visually strong enough to be shown as the final hackathon demo screen.

Test all success and failure states.

Run build/typecheck/lint/tests after changes.
