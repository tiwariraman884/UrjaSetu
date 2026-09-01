We have very limited time before national hackathon submission.

DO NOT modify anything yet.

Perform a focused forensic audit ONLY of the UrjaSetu payment gateway and x402/Algorand implementation.

The repository appears to contain:

apps/payment-gateway/

and the current status suggests:

- @x402/core and @x402/avm are not installed at the repository root
- payment-gateway contains x402-related dist files
- payment-gateway contains Algorand dependencies
- .env.example currently points FACILITATOR_URL to a self-hosted payment-gateway facilitator
- mandatory judging requires GoPlausible Facilitator
- mandatory judging requires x402 genuinely integrated
- mandatory judging requires Algorand Testnet
- mandatory judging requires an actual x402 transaction on Algorand Testnet

Inspect ONLY the following:

1. apps/payment-gateway/package.json
2. apps/payment-gateway/package-lock.json if present
3. apps/payment-gateway/src/** or equivalent source directory
4. apps/payment-gateway/dist/** only to understand generated implementation
5. apps/payment-gateway configuration
6. root package.json/workspace configuration
7. all x402-related source files
8. all Algorand-related source files
9. payment gateway routes
10. facilitator implementation
11. resource server implementation
12. payment client implementation
13. environment configuration

IMPORTANT:
Do not dump node_modules.
Do not dump .venv.
Do not dump generated dependency files.
Do not dump hundreds of lines.

Answer ONLY with this structured report:

A. PAYMENT GATEWAY PACKAGE
- package.json path
- package manager
- package scripts
- installed x402 packages and versions
- installed Algorand packages and versions

B. X402 IMPLEMENTATION
- exact source file implementing x402
- exact imports from @x402/core
- exact imports from @x402/avm
- whether HTTP 402 is genuinely generated
- whether payment requirements are genuinely generated
- whether payment is genuinely verified
- whether settlement is genuinely performed

C. FACILITATOR
- current facilitator implementation
- current FACILITATOR_URL
- whether GoPlausible is actually called
- exact source file where facilitator client is configured
- whether current implementation is self-facilitated or GoPlausible facilitated

D. ALGORAND
- network currently configured
- Testnet support
- asset currently configured
- receiver configuration
- transaction creation/settlement code
- where transaction ID is obtained
- whether transaction ID is real or generated/mock

E. FRONTEND
- exact file where x402 payment starts
- wallet integration
- whether frontend sends a real x402 payment
- whether frontend currently mocks payment

F. BLOCKERS
List only things preventing us from satisfying:
1. x402 mandatory requirement
2. Algorand mandatory requirement
3. GoPlausible mandatory requirement
4. real Testnet transaction mandatory requirement
5. package.json dependency verification

G. EXACT FILES TO MODIFY
Give the minimum files required.

H. NEXT ACTION
Give one recommended implementation action, not a list of small commands.

DO NOT modify files.
DO NOT install packages.
DO NOT run npm install.
DO NOT create code.
This is an audit only.
