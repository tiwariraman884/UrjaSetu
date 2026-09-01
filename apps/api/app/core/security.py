from datetime import datetime, timedelta
from typing import Any

from jose import jwt
from passlib.context import CryptContext

from app.config import settings


# Password hashing
# PBKDF2-SHA256 avoids bcrypt's 72-byte password limitation.
pwd_context = CryptContext(
    schemes=["pbkdf2_sha256"],
    deprecated="auto",
)

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(
    subject: str | Any,
    expires_minutes: int | None = None,
) -> str:
    expire = datetime.utcnow() + timedelta(
        minutes=expires_minutes or settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(subject),
        "exp": expire,
    }

    return jwt.encode(
        payload,
        settings.SECRET_KEY,
        algorithm=ALGORITHM,
    )


def decode_access_token(token: str) -> dict:
    return jwt.decode(
        token,
        settings.SECRET_KEY,
        algorithms=[ALGORITHM],
    )

def get_latest_sequence() -> int:
    try:
        data = get(f"{API}/api/v1/telemetry/{DEVICE_ID}/latest")
        if data and data.get("sequence") is not None:
            return int(data["sequence"])
    except Exception as e:
        print(f"  [seq] ERROR: {e}")
    return 0