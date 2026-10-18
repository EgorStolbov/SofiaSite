from pydantic import BaseModel

class RegisterRequest(BaseModel):
    login: str
    password: str

class LoginRequest(BaseModel):
    login: str
    password: str

class DeleteUserRequest(BaseModel):
    login: str
    password: str

class UpdateUserRequest(BaseModel):
    login: str
    password: str
    new_password: str

class ValidJWTRequest(BaseModel):
    token: str

class User():
    login: str
    def __init__(self, login):
        self.login = login
