# UrjaSetu — Build with Bharat

UrjaSetu is an energy optimization platform combining a FastAPI core backend,
a Node.js/TypeScript x402 payment gateway, a React/TypeScript web dashboard,
and ESP32 firmware for a protected 5–12V bench rig.

## Project Structure

```
urjasetu/
├── docker-compose.yml
├── .env.example
├── README.md
├── apps/
│   ├── api/                     # FastAPI Core Energy Backend
│   ├── payment-gateway/         # Node.js / TypeScript x402 Server
│   └── web/                     # React / TypeScript Web Dashboard
└── firmware/
    └── esp32_urjasetu/
        └── esp32_urjasetu.ino   # Protected 5-12V Bench Rig Firmware
```

## Getting Started

1. Copy the environment file:
   ```bash
   cp .env.example .env
   ```
2. Edit `.env` with your secrets and configuration.
3. Build and start all services:
   ```bash
   docker-compose up --build
   ```

## Services

| Service           | Port  | Stack                  |
|-------------------|-------|------------------------|
| api               | 8000  | FastAPI / SQLAlchemy   |
| payment-gateway   | 3001  | Node.js / x402 / TS    |
| web               | 5173  | React / Vite / TS      |
| db                | 5432  | PostgreSQL 15          |

## Modules

- **API** — auth, telemetry ingestion, task planning/optimization, device
  commands, savings receipts, payments, devices, health.
- **Payment Gateway** — x402 resource server + facilitator integration for
  pay-per-use energy unlocks.
- **Web** — dashboard, task planner, execution monitor, receipts, audit
  timeline, setup wizard.
- **Firmware** — ESP32 Arduino sketch for the protected 5–12V bench rig.

## License

Proprietary — Build with Bharat.
# UrjaSetu
