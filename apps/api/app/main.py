"""UrjaSetu FastAPI application entrypoint."""
import logging
import uuid as _uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.router import api_router
from app.config import settings
from app.database import Base, engine

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("urjasetu")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    logger.info("UrjaSetu API started (env=%s)", settings.APP_ENV)
    yield
    logger.info("UrjaSetu API shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    description="UrjaSetu - Pay-per-use, physically verified energy optimization powered by x402 on Algorand.",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next):
    rid = request.headers.get("X-Request-ID", str(_uuid.uuid4()))
    request.state.request_id = rid
    response = await call_next(request)
    response.headers["X-Request-ID"] = rid
    return response


@app.get("/")
async def root():
    return {"app": settings.APP_NAME, "status": "running", "version": "0.2.0"}


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception(
        "unhandled error requestId=%s",
        getattr(request.state, "request_id", "?")
    )

    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "internal_error",
                "message": str(exc),
                "type": type(exc).__name__,
                "requestId": getattr(request.state, "request_id", "?"),
            }
        },
    )


app.include_router(api_router, prefix="/api/v1")

