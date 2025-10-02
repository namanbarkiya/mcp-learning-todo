from fastapi import APIRouter, HTTPException
from typing import List

from ..schemas.todo import Todo, TodoCreate, TodoUpdate
from ..services.csv_service import (
    load_todos,
    save_todos,
    generate_next_id,
)


router = APIRouter()


@router.get("/", response_model=List[Todo], operation_id="list_todos")
def list_todos() -> List[Todo]:
    return load_todos()


@router.get("/{todo_id}", response_model=Todo, operation_id="get_todo")
def get_todo(todo_id: int) -> Todo:
    todos = load_todos()
    for item in todos:
        if item.id == todo_id:
            return item
    raise HTTPException(status_code=404, detail="Todo not found")


@router.post("/", response_model=Todo, status_code=201, operation_id="create_todo")
def create_todo(payload: TodoCreate) -> Todo:
    todos = load_todos()
    new_todo = Todo(id=generate_next_id(todos), title=payload.title, completed=False)
    todos.append(new_todo)
    save_todos(todos)
    return new_todo


@router.put("/{todo_id}", response_model=Todo, operation_id="update_todo")
def update_todo(todo_id: int, payload: TodoUpdate) -> Todo:
    todos = load_todos()
    for idx, item in enumerate(todos):
        if item.id == todo_id:
            updated = Todo(
                id=item.id,
                title=payload.title if payload.title is not None else item.title,
                completed=payload.completed if payload.completed is not None else item.completed,
            )
            todos[idx] = updated
            save_todos(todos)
            return updated
    raise HTTPException(status_code=404, detail="Todo not found")

# include_in_schema=False: this endpoint is not included in the tools list
@router.delete("/{todo_id}", status_code=204, operation_id="delete_todo",  include_in_schema=False)
def delete_todo(todo_id: int) -> None:
    todos = load_todos()
    filtered = [t for t in todos if t.id != todo_id]
    if len(filtered) == len(todos):
        raise HTTPException(status_code=404, detail="Todo not found")
    save_todos(filtered)
    return None


