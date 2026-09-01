"""UrjaSetu application configuration."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "UrjaSetu"
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me-in-production"
    JWT_SECRET: str = "change-me-jwt"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    DEVICE_AUTH_SECRET: str = "change-me-device"
    DATABASE_URL: str = "sqlite:///./urjasetu.db"
    FRONTEND_URL: str = "http://localhost:5173"
    API_URL: str = "http://localhost:8000"
    PAYMENT_GATEWAY_URL: str = "http://localhost:3001"
    X402_NETWORK: str = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI="
    X402_SCHEME: str = "exact"
    X402_VERSION: int = 2
    # The FastAPI backend verifies settlement via the payment-gateway's own
    # facilitator routes (self-hosted on the gateway). Override with the
    # external GoPlausible facilitator via the environment if desired.
    FACILITATOR_URL: str = "http://127.0.0.1:3001/facilitator"
    FACILITATOR_API_KEY: str = ""
    ALGOD_SERVER: str = "https://testnet-api.algonode.cloud"
    ALGOD_PORT: int = 443
    ALGOD_TOKEN: str = ""
    RECEIVER_ALGORAND_ADDRESS: str = "VAUTWUPUDLAV5W2BGCLPFXGD4E2IAVYD3XGTSKQOUIBCPIEXWCYHGWU6RY"
    PAYMENT_ASSET_ID: int = 10458941
    MQTT_BROKER: str = "localhost"
    MQTT_PORT: int = 1883
    MQTT_USERNAME: str = ""
    MQTT_PASSWORD: str = ""
    DEMO_MODE: bool = True
    TELEMETRY_FRESHNESS_S: int = 20


settings = Settings()
