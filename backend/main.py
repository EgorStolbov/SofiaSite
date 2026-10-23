from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles
import jwt
import uvicorn

from database import Database
from models import (
    DeleteUserRequest,
    LoginRequest,
    RegisterRequest,
    UpdateUserRequest,
    ValidJWTRequest,
    OrderCreateRequest,
)
from server_jwt import create_token, decode

app = FastAPI(title="МебельСофия API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db = Database()

bearer_scheme = HTTPBearer(auto_error=False)


# ---------- Авторизация ----------

def current_login(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    """Зависимость для защищённых эндпоинтов.
    Ожидает заголовок: Authorization: Bearer <jwt>."""
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode(credentials.credentials)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload.get("sub")


# ---------- Аутентификация ----------

@app.put("/user", status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest):
    try:
        db.add_user(request.login, request.password)
    except Exception as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error))
    return {"status": "Success", "login": request.login}


@app.post("/login")
async def login(request: LoginRequest):
    try:
        (user, _) = db.verify_user(request.login, request.password)
    except Exception as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(error))
    return {"token": create_token(user.login), "login": user.login}


@app.delete("/user")
async def delete_user(request: DeleteUserRequest):
    try:
        db.delete_user(request.login, request.password)
    except Exception as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(error))
    return {"status": "Success"}


@app.post("/user")
async def update_user(request: UpdateUserRequest):
    try:
        db.update_user(request.login, request.password, request.new_password)
    except Exception as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(error))
    return {"status": "Success"}


@app.post("/valid_jwt")
async def valid_jwt(request: ValidJWTRequest):
    # Проверка валидности подписи И срока действия (exp) токена.
    # В PyJWT jwt.ExpiredSignatureError — наследник jwt.InvalidTokenError,
    # но перечисляем оба случая явно: у них разные причины.
    try:
        decode(request.token)
        return True
    except jwt.ExpiredSignatureError:
        # Токен форматно корректен, но срок действия истек
        return False
    except jwt.InvalidTokenError:
        # Подпись не сходится / токен поврежден / неверный формат
        return False


# ---------- Товары ----------

@app.get("/products")
async def products(category: str | None = None):
    return db.get_products(category)


@app.get("/products/{product_id}")
async def product(product_id: int):
    try:
        return db.get_product(product_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")


# ---------- Заказы (требуют JWT) ----------

@app.post("/orders", status_code=status.HTTP_201_CREATED)
async def create_order(
    request: OrderCreateRequest, login: str = Depends(current_login)
):
    items = [item.dict() for item in request.items]
    try:
        order = db.create_order(db.user_id(login), items)
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)
        )
    return order


@app.get("/orders")
async def orders(login: str = Depends(current_login)):
    return db.get_orders(db.user_id(login))


# ---------- Демо защищённого роута ----------

@app.get("/anything")
async def do_anything(login: str = Depends(current_login)):
    return f"Hello, {login}"


# Раздача frontend, если он лежит рядом (localhost:8443 открывает сайт сам)
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="static")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8443)
