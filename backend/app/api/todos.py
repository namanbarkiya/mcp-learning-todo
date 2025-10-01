from fastapi import APIRouter, HTTPException, Depends, status
from typing import List
from app.schemas.todo import TodoCreate, TodoUpdate, TodoResponse
from app.schemas.user import UserResponse
from app.services.csv_service import CSVService
from app.api.auth import get_current_user

router = APIRouter()
csv_service = CSVService()

@router.get("/", response_model=List[TodoResponse])
async def get_todos(current_user: dict = Depends(get_current_user)):
    """Get all todos for the current user."""
    todos = csv_service.get_todos_by_user(current_user["id"])
    return [TodoResponse(**todo) for todo in todos]

@router.post("/", response_model=TodoResponse)
async def create_todo(todo_data: TodoCreate, current_user: dict = Depends(get_current_user)):
    """Create a new todo."""
    todo_dict = {
        "user_id": current_user["id"],
        "title": todo_data.title,
        "description": todo_data.description,
        "priority": todo_data.priority.value,
        "due_date": todo_data.due_date.isoformat() if todo_data.due_date else None,
        "category": todo_data.category
    }
    
    created_todo = csv_service.create_todo(todo_dict)
    return TodoResponse(**created_todo)

@router.get("/categories")
async def list_categories(current_user: dict = Depends(get_current_user)):
    """List categories for current user."""
    return csv_service.get_categories_by_user(current_user["id"])

@router.get("/{todo_id}", response_model=TodoResponse)
async def get_todo(todo_id: int, current_user: dict = Depends(get_current_user)):
    """Get a specific todo by ID."""
    todo = csv_service.get_todo_by_id(todo_id, current_user["id"])
    if not todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found"
        )
    return TodoResponse(**todo)

@router.put("/{todo_id}", response_model=TodoResponse)
async def update_todo(
    todo_id: int, 
    todo_update: TodoUpdate, 
    current_user: dict = Depends(get_current_user)
):
    """Update a todo."""
    # Prepare update data
    update_data = {}
    for field, value in todo_update.dict(exclude_unset=True).items():
        if field == "priority" and value is not None:
            update_data[field] = value.value
        elif field == "due_date" and value is not None:
            update_data[field] = value.isoformat()
        else:
            update_data[field] = value
    
    updated_todo = csv_service.update_todo(todo_id, current_user["id"], update_data)
    if not updated_todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found"
        )
    
    return TodoResponse(**updated_todo)

@router.delete("/{todo_id}")
async def delete_todo(todo_id: int, current_user: dict = Depends(get_current_user)):
    """Delete a todo."""
    success = csv_service.delete_todo(todo_id, current_user["id"])
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found"
        )
    return {"message": "Todo deleted successfully"}

@router.patch("/{todo_id}/toggle")
async def toggle_todo_completion(todo_id: int, current_user: dict = Depends(get_current_user)):
    """Toggle todo completion status."""
    todo = csv_service.get_todo_by_id(todo_id, current_user["id"])
    if not todo:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Todo not found"
        )
    
    updated_todo = csv_service.update_todo(
        todo_id, 
        current_user["id"], 
        {"completed": not todo["completed"]}
    )
    
    return TodoResponse(**updated_todo)

@router.get("/categories")
async def list_categories(current_user: dict = Depends(get_current_user)):
    """List categories for current user."""
    return csv_service.get_categories_by_user(current_user["id"])
