"""API v1 router — aggregates all endpoint routers."""
from fastapi import APIRouter

from app.api.v1.endpoints import (
    health,
    auth,
    devices,
    telemetry,
    tasks,
    proposals,
    commands,
    receipts,
    payments,
    overview,
    history,
)

api_router = APIRouter()
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(devices.router, prefix="/devices", tags=["devices"])
api_router.include_router(telemetry.router, prefix="/telemetry", tags=["telemetry"])
api_router.include_router(tasks.router, prefix="/tasks", tags=["tasks"])
api_router.include_router(proposals.router, prefix="/proposals", tags=["proposals"])
api_router.include_router(commands.router, prefix="/commands", tags=["commands"])
api_router.include_router(receipts.router, prefix="/receipts", tags=["receipts"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(overview.router, prefix="/overview", tags=["overview"])
api_router.include_router(history.router, prefix="/history", tags=["history"])
