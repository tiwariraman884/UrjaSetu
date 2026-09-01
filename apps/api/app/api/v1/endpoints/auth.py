"""Authentication endpoints (email/password + JWT)."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from app.database import get_db
from app.models import User
from app.schemas.schemas import UserCreate, UserOut, Token, TokenData
from app.core.security import hash_password, verify_password, create_access_token, decode_access_token
from app.config import settings

router = APIRouter()


@router.post("/register", response_model=UserOut)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "email already registered")
    user = User(email=payload.email, hashed_password=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
def login(payload: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(401, "invalid credentials")
    token = create_access_token(subject=user.id)
    return Token(access_token=token)


async def get_current_user(token_data: TokenData, db: Session) -> User:
    credentials_exc = HTTPException(401, "could not validate credentials")
    try:
        payload = decode_access_token(token_data.access_token) if hasattr(token_data, "access_token") else jwt.decode(token_data, settings.JWT_SECRET, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exc
    except (JWTError, Exception):
        raise credentials_exc
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exc
    return user
