from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str

class UserCreate(UserBase):
    password: str = Field(..., min_length=6, max_length=100)

class UserLogin(BaseModel):
    username: str
    password: str

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[str] = None
    preferences: Optional[Dict[str, Any]] = None

class User(UserBase):
    id: str
    created_at: datetime
    last_login: Optional[datetime] = None
    preferences: Dict[str, Any] = {}

    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    created_at: datetime
    last_login: Optional[datetime]
    preferences: Dict[str, Any]

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
