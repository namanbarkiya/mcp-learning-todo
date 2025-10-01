from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class Priority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class TodoBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    priority: Priority = Priority.MEDIUM
    due_date: Optional[datetime] = None
    category: str = Field(default="general", max_length=50)

class TodoCreate(TodoBase):
    pass

class TodoUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    priority: Optional[Priority] = None
    due_date: Optional[datetime] = None
    completed: Optional[bool] = None
    category: Optional[str] = Field(None, max_length=50)

class Todo(TodoBase):
    id: int
    user_id: str
    completed: bool = False
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TodoResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    priority: Priority
    due_date: Optional[datetime]
    completed: bool
    category: str
    created_at: datetime
    updated_at: datetime
