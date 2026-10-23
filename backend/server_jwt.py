import jwt
import os
from datetime import datetime, timezone, timedelta

# В проде задавайте через окружение: JWT_SECRET=<случайная строка>
SECRET_KEY = os.environ.get("JWT_SECRET", "super-secret-key")
ALGORITHM = "HS256"
TOKEN_TTL_MINUTES = int(os.environ.get("JWT_TTL_MINUTES", "60"))


def create_token(login: str) -> str:
    payload = {
        "sub": login,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=TOKEN_TTL_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode(token: str) -> dict:
    # Бросает jwt.ExpiredSignatureError / jwt.InvalidTokenError
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
