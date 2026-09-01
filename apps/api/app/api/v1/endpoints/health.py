"""Health, readiness, and version endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database import get_db
from app.config import settings

router = APIRouter()


@router.get("/", response_model=dict)
async def health():
    return {"status": "ok", "service": settings.APP_NAME, "version": "0.2.0"}


@router.get("/ready", response_model=dict)
async def ready(db: Session = Depends(get_db)):
    db_ok = True
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
    return {"ready": db_ok, "database": db_ok, "payment_gateway": True, "facilitator": True}


@router.get("/version", response_model=dict)
async def version():
    return {"version": "0.2.0", "env": settings.APP_ENV, "network": settings.X402_NETWORK}
