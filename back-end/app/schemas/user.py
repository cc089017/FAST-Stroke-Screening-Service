from pydantic import BaseModel, EmailStr, constr
from typing import Literal
from datetime import date

Gender = Literal["male", "female"]

class UserCreate(BaseModel):
    id: constr(regex="^[A-Za-z0-9]+$")
    email: EmailStr
    password: constr(min_length=6)
    name: str
    birth_date: date
    phone_number: str | None = None
    gender: Gender | None = None
    privacy_agreed: bool

class UserLogin(BaseModel):
    id: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class MessageResponse(BaseModel):
    message: str