"""Telemetry ingestion and validation tests."""
import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timezone

from app.main import app
from app.database import Base, engine

client = TestClient(app)


@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


def test_health():
    r = client.get("/api/v1/health/")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_root():
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["status"] == "running"


def test_ready():
    r = client.get("/api/v1/health/ready")
    assert r.status_code == 200
