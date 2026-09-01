Perform a final production-readiness and hackathon acceptance pass on the existing UrjaSetu repository.

DO NOT add new major features.

Focus only on finding and fixing issues that could cause the final demo or judging verification to fail.

Audit:

x402 dependency exists
x402 dependency is actually imported/used
HTTP 402 actually occurs
GoPlausible facilitator is actually used
Algorand Testnet is actually configured
real settlement produces real transaction ID
transaction is persisted
payment is linked to task
payment replay is blocked
expired payment is blocked
wrong network is blocked
wrong asset is blocked
wrong amount is blocked
frontend cannot fake payment success
payment success does not automatically execute device
user approval remains required
stale telemetry blocks execution
offline device blocks execution
expired command blocks execution
duplicate command blocked
physical verification is sensor-based
verified receipt requires physical verification
existing energy functionality still works
no private keys/secrets are committed
.env is ignored
production build succeeds

Inspect git diff for accidental changes.

Search for:

TODO
FIXME
MOCK
FAKE
SIMULATED
HARDCODED_TX
HARDCODED_TRANSACTION
console.log
test transaction IDs
hardcoded secrets

Do not automatically remove legitimate simulator functionality if it is explicitly labelled.

Fix only real issues.

Run:

typecheck
lint
unit tests
integration tests
build

Then create:

docs/FINAL-ACCEPTANCE.md

with PASS/FAIL status for every mandatory requirement.

At the end provide the exact final demo sequence that should be used for judging.

Do not claim PASS unless the implementation genuinely satisfies the condition.
