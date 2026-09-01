# ⚡ UrjaSetu — Build with Bharat

UrjaSetu is an energy optimization platform combining a **FastAPI** core backend,
a **Node.js / TypeScript x402 payment gateway**, a **React / TypeScript** web dashboard,
and **ESP32 firmware** for a protected 5–12V bench rig.

Devices publish telemetry, request optimization proposals, and pay tiny micropayments
per optimization using the [x402](https://github.com/x402/x402) HTTP payment protocol.
Every optimization is receipted, creating a transparent, auditable energy-optimization
economy.

> ⚠️ **Testnet / demo only.** Do not use mainnet keys or real funds.

---

## 📑 Table of Contents

- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Key Features](#-key-features)
- [Prerequisites](#-prerequisites)
- [Getting Started](#-getting-started)
- [Services](#-services)
- [Modules](#-modules)
- [Configuration](#-configuration)
- [Running Without Docker](#-running-without-docker)
- [Payment Flow (x402)](#-payment-flow-x402)
- [Testing](#-testing)
- [Safety & Operational Limits](#-safety--operational-limits)
- [Disclaimer](#-disclaimer)
- [License](#-license)

---

## 🏗 Architecture

```
┌───────────────┐   telemetry / proposals   ┌──────────┐
│  ESP32 / IoT  │ ────────────▶ │  FastAPI Core API  │
│  (bench rig)  │ ◀──────────── │  PostgreSQL DB     │
└───────────────┘   commands    └────────┬───────────┘
        │                               │
        │  GET /optimize (x402 402)     │
        ▼                               ▼
┌──────────┐  USDC   ┌────────┐
│  Payment Gateway │ ───────▶│  x402 Facilitator      │
│  (Express + x402)│ ◀──set──│  settlement + receipts │
└──────────┘         └────────┘
        │  receipt
        ▼
┌──────────┐
│  Web Dashboard   │  React + TypeScript + Vite
│  (operator UI)   │
└──────────┘
```

---

## 📁 Project Structure

```
UrjaSetu/
├── docker-compose.yml
├── .env.example
├── README.md
├── apps/
│   ├── api/                     # FastAPI Core Energy Backend
│   │   ├── app/
│   │   │   ├── api/v1/endpoints/   # auth, telemetry, tasks, commands,
│   │   │   │                       # payments, receipts, devices, health
│   │   │   ├── core/               # security, formulas
│   │   │   ├── models/             # SQLAlchemy models
│   │   │   ├── schemas/            # Pydantic schemas
│   │   │   └── services/           # business logic
│   │   ├── simulator.py            # IoT device simulator
│   │   ├── tests/                  # pytest suite
│   │   └── requirements.txt
│   ├── payment-gateway/         # Node.js / TypeScript x402 Server
│   │   ├── src/
│   │   │   ├── x402/               # resourceServer, facilitator, buyer
│   │   │   ├── routes/             # paymentRoutes, facilitatorRoutes
│   │   │   └── services/           # optimizerService, paymentStore
│   │   └── package.json
│   └── web/                     # React / TypeScript Web Dashboard
│       ├── src/
│       │   ├── pages/              # Dashboard, Tasks, Payment, Receipts,
│       │   │                      # Audit, Setup wizard, ...
│       │   ├── components/         # Navbar, Metric, StatusBadge, ...
│       │   └── api/client.ts
│       └── package.json
└── firmware/
    └── esp32_urjasetu/
        └── esp32_urjasetu.ino   # Protected 5-12V Bench Rig Firmware
```

---

## ✨ Key Features

- 🔐 **Auth + device authentication** for secure telemetry ingestion.
- 📊 **Real-time telemetry** ingestion and historical query from energy devices.
- 🧮 **Optimization proposals** computed from device telemetry with safety guardrails.
- 💸 **x402 micropayments** — devices pay per optimization (USDC).
- 🧾 **Receipts** — every settled optimization is receipted and auditable.
- 🖥️ **Operator dashboard** — tasks, execution monitor, payments, receipts, audit timeline, setup wizard.
- 🔌 **ESP32 firmware** for a protected 5–12V bench rig.
- 🤖 **Device simulator** included to exercise the full pipeline end-to-end.
- 🐳 **One-command Docker Compose** bring-up.

---

## ✅ Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/install/) (v2+)
- Node.js 20+ and Python 3.11+ **only if running without Docker**.
- (Optional) Arduino IDE / PlatformIO for flashing the ESP32 firmware.

---

## 🚀 Getting Started

1. **Clone**
   ```bash
   git clone https://github.com/tiwariraman884/UrjaSetu.git
   cd UrjaSetu
   ```

2. **Copy the environment file:**
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env`** with your secrets and configuration.

4. **Build and start all services:**
   ```bash
   docker-compose up --build
   ```

5. **Open the dashboard:**
   - Web:             http://localhost:5173
   - API (Swagger):   http://localhost:8000/docs
   - Payment gateway: http://localhost:3001

---

## 🧩 Services

| Service           | Port  | Stack                  |
|-------------------|-------|------------------------|
| api               | 8000  | FastAPI / SQLAlchemy   |
| payment-gateway   | 3001  | Node.js / x402 / TS    |
| web               | 5173  | React / Vite / TS      |
| db                | 5432  | PostgreSQL 15          |

---

## 📦 Modules

- **API** — auth, telemetry ingestion, task planning/optimization, device
  commands, savings receipts, payments, devices, health.
- **Payment Gateway** — x402 resource server + facilitator integration for
  pay-per-use energy unlocks.
- **Web** — dashboard, task planner, execution monitor, receipts, audit
  timeline, setup wizard.
- **Firmware** — ESP32 Arduino sketch for the protected 5–12V bench rig.

---

## ⚙️ Configuration

All runtime config lives in `.env` (see `.env.example` for the full list). Key sections:

### API
| Variable | Description |
|---|---|
| `APP_ENV` | Environment name |
| `SECRET_KEY` / `JWT_SECRET` | App + JWT signing secrets (change in production) |
| `DATABASE_URL` | PostgreSQL connection string |
| `API_URL` / `FRONTEND_URL` | Service URLs for CORS |

### Payment Gateway (x402)
| Variable | Description |
|---|---|
| `X402_VERSION` / `X402_SCHEME` | x402 protocol version & pricing scheme |
| `OPTIMIZATION_PRICE` | Price per optimization in USDC |
| `PAYMENT_ASSET` | Settlement asset (e.g. `USDC`) |
| `PAYMENT_TEST_MODE` | `true` = auto-generate throwaway fee-payer (demo only) |

---

## 🛠 Running Without Docker

### API
```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Payment Gateway
```bash
cd apps/payment-gateway
npm install
npm run dev    # port 3001
```

### Web
```bash
cd apps/web
npm install
npm run dev    # Vite, port 5173
```

---

## 💳 Payment Flow (x402)

1. A device requests an optimization from the **Payment Gateway** (`GET /optimize`).
2. The gateway (x402 **resource server**) responds with HTTP `402 Payment Required`.
3. The device constructs a USDC payment to the receiver address and re-requests with the `X-PAYMENT` header.
4. The x402 **facilitator** verifies the on-chain payment and settles the fee.
5. On success, the gateway returns the optimization result + a cryptographic **receipt**.
6. The receipt is stored and surfaced in the dashboard's **Receipts / Audit** pages.

---

## 🧪 Testing

```bash
# API (pytest)
cd apps/api
pytest

# Web / gateway typechecks
cd apps/web && npm run typecheck
cd apps/payment-gateway && npm run typecheck
```

---

## 🛡 Safety & Operational Limits

Optimization proposals are guarded by safety bounds and validated before any
command is issued. Always review proposals before executing commands against
real hardware.

---

## ⚠️ Disclaimer

This is a **demo / testnet** project. On-chain payment logic has not been audited
for mainnet use. Do not connect mainnet keys, do not use real funds, and do not
deploy against production energy hardware without a full security review.

---

## 📄 License

Proprietary — Build with Bharat.
