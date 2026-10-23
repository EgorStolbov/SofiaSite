from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    login: str = Field(min_length=3, max_length=32)
    password: str = Field(min_length=6, max_length=64)


class LoginRequest(BaseModel):
    login: str
    password: str


class DeleteUserRequest(BaseModel):
    login: str
    password: str


class UpdateUserRequest(BaseModel):
    login: str
    password: str
    new_password: str = Field(min_length=6, max_length=64)


class ValidJWTRequest(BaseModel):
    token: str


class CartItem(BaseModel):
    id: int = Field(ge=1)
    qty: int = Field(ge=1, le=99)


class OrderCreateRequest(BaseModel):
    items: list[CartItem] = Field(min_length=1)


class Order(BaseModel):
    id: int
    total: int
    items: list[dict]
    created_at: str


class User:
    def __init__(self, login: str):
        self.login = login
