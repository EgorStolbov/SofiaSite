from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from database import Database
from models import *
from server_jwt import *
from datetime import datetime, timezone, timedelta

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db = Database()

@app.put("/user")
async def register(request: RegisterRequest):
    try:
        db.add_user(request.login, request.password)
        return "Success"
    except Exception as e:
        return f"Error: {e}"

@app.post("/login")
async def login(request: LoginRequest):
    try:
        user = db.get_user(request.login, request.password)
        payload = {
            "login": user.login,
            "exp": datetime.now(timezone.utc) + timedelta(minutes=15)
        }
        token = encode(payload)
        return {
            "token": token
        }
    except Exception as e:
        return f"Error: {e}"

@app.delete("/user")
async def delete_user(request: DeleteUserRequest):
    try:
        db.delete_user(request.login, request.password)
        return "Success"
    except Exception as e:
        return f"Error: {e}"

@app.post("/user")
async def update_user(request: UpdateUserRequest):
    try:
        db.update_user(request.login, request.password, request.new_password)
        return "Success"
    except Exception as e:
        return f"Error: {e}"

@app.post("/valid_jwt")
async def valid_jwt(request: ValidJWTRequest):
    token = request.token
    try:
        payload = decode(token)
        return True
    except Exception as e:
        return False

@app.get("/anything")
async def do_anything(request: Request):
    auth = request.headers.get("Authentication")
    if auth:
        token = auth.split()[-1]
        try:
            payload = decode(token)
            return f"Hello, {payload.get("login")}"
        except Exception as e:
            return f"Error: {e}"
    else:
        return "Error: Token required"


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8443)
