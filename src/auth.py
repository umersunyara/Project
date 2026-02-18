from datetime import datetime, timedelta, timezone
from typing import Optional

from typing import Literal
from passlib.context import CryptContext
from jose import jwt, JWTError

import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Support both argon2 (new) and bcrypt (old), auto-detect by hash prefix
pwd_context = CryptContext(
    schemes=["argon2", "bcrypt"],
    default="argon2",
    deprecated="auto"
)

def get_password_hash(password: str) -> str:
    # New hashes will be argon2
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # If hash is garbage / unknown format, just treat as invalid
        return False

# def create_access_token(
#     data: dict,
#     expires_delta: Optional[timedelta] = None
# ) -> str:
#     to_encode = data.copy()
#     expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
#     to_encode.update({"exp": expire})
#     return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

def _now_utc() -> datetime:
    return datetime.now(timezone.utc)

def create_token(*, sub: str, token_type: Literal["access", "refresh"]) -> str:
    now = _now_utc()

    if token_type == "access":
        exp = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    else:
        exp = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

    payload = {
        "sub": sub,                 # user id as string
        "type": token_type,         # "access" or "refresh"
        "iat": int(now.timestamp()),
        "exp": int(exp.timestamp()),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_access_token(sub: str) -> str:
    return create_token(sub=sub, token_type="access")

def create_refresh_token(sub: str) -> str:
    return create_token(sub=sub, token_type="refresh")

def decode_token(token: str, expected_type: Literal["access", "refresh"]) -> str:
    """
    Returns: user_id (sub) if valid.
    Raises: JWTError if invalid/expired/wrong type.
    """
    payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

    token_type = payload.get("type")
    if token_type != expected_type:
        raise JWTError("Wrong token type")

    sub = payload.get("sub")
    if not sub:
        raise JWTError("Missing sub")

    return sub


