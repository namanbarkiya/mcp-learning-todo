from fastapi import APIRouter, Depends, HTTPException, status, Request
from app.api.auth import get_current_user
from app.services.csv_service import CSVService
from typing import Any, Dict
import time
import uuid

router = APIRouter()
csv_service = CSVService()


@router.post("/")
async def mcp_endpoint(payload: Dict[str, Any], request: Request, current_user: dict = Depends(get_current_user)):
    """Minimal JSON-RPC 2.0-like MCP endpoint for MVP.

    Expected payload:
    {"jsonrpc":"2.0","id":"...","method":"todos.list","params":{...}}
    """
    rpc_id = payload.get("id")
    method = payload.get("method")
    params = payload.get("params", {}) or {}
    req_id = f"{int(time.time()*1000)}-{uuid.uuid4().hex[:6]}"
    print(f"[mcp][{req_id}] incoming", {
        "rpc_id": rpc_id,
        "method": method,
        "has_params": bool(params),
        "user_id": current_user.get("id")
    })

    def ok(result: Any):
        return {"jsonrpc": "2.0", "id": rpc_id, "result": result}

    def err(code: int, message: str):
        return {"jsonrpc": "2.0", "id": rpc_id, "error": {"code": code, "message": message}}

    if payload.get("jsonrpc") != "2.0":
        return err(-32600, "Invalid Request: jsonrpc must be '2.0'")
    if not method:
        return err(-32601, "Method not specified")

    try:
        if method == "mcp.schema":
            return ok({
                "version": "0.1",
                "methods": [
                    {
                        "name": "todos.list",
                        "params": {},
                        "returns": {"type": "array", "items": {"type": "object"}}
                    },
                    {
                        "name": "todos.create",
                        "params": {
                            "title": {"type": "string", "required": True},
                            "description": {"type": ["string", "null"]},
                            "priority": {"type": "string", "enum": ["low", "medium", "high"]},
                            "due_date": {"type": ["string", "null"], "format": "date-time"},
                            "category": {"type": "string"}
                        },
                        "returns": {"type": "object"}
                    },
                    {
                        "name": "todos.update",
                        "params": {
                            "id": {"type": "integer", "required": True},
                            "title": {"type": "string"},
                            "description": {"type": ["string", "null"]},
                            "priority": {"type": "string", "enum": ["low", "medium", "high"]},
                            "due_date": {"type": ["string", "null"], "format": "date-time"},
                            "category": {"type": "string"},
                            "completed": {"type": "boolean"}
                        },
                        "returns": {"type": "object"}
                    },
                    {
                        "name": "todos.delete",
                        "params": {"id": {"type": "integer", "required": True}},
                        "returns": {"type": "object"}
                    },
                    {
                        "name": "todos.toggle",
                        "params": {"id": {"type": "integer", "required": True}},
                        "returns": {"type": "object"}
                    },
                    {
                        "name": "todos.findByTitle",
                        "params": {
                            "query": {"type": "string", "required": True},
                            "exact": {"type": "boolean"}
                        },
                        "returns": {"type": "array", "items": {"type": "object"}}
                    },
                    {
                        "name": "categories.list",
                        "params": {},
                        "returns": {"type": "array", "items": {"type": "object"}}
                    }
                ]
            })

        # Todos
        if method == "todos.list":
            todos = csv_service.get_todos_by_user(current_user["id"])
            print(f"[mcp][{req_id}] todos.list -> {len(todos)} items")
            return ok(todos)

        if method == "todos.create":
            title = params.get("title")
            if not title:
                return err(-32602, "Missing required param: title")
            created = csv_service.create_todo({
                "user_id": current_user["id"],
                "title": title,
                "description": params.get("description"),
                "priority": params.get("priority", "medium"),
                "due_date": params.get("due_date"),
                "category": params.get("category", "general"),
            })
            print(f"[mcp][{req_id}] todos.create -> id={created.get('id')}")
            return ok(created)

        if method == "todos.findByTitle":
            query = params.get("query")
            exact = bool(params.get("exact"))
            if not query:
                return err(-32602, "Missing required param: query")
            todos = csv_service.get_todos_by_user(current_user["id"])
            if exact:
                matches = [t for t in todos if (t.get("title") or "").strip() == query.strip()]
            else:
                q = query.strip().lower()
                matches = [t for t in todos if q in (t.get("title") or "").lower()]
            print(f"[mcp][{req_id}] todos.findByTitle -> {len(matches)} matches for query='{query}' exact={exact}")
            # Return minimal fields commonly needed for follow-up calls
            return ok([{ "id": t.get("id"), "title": t.get("title") } for t in matches])

        if method == "todos.update":
            todo_id = params.get("id")
            if not todo_id:
                return err(-32602, "Missing required param: id")
            update = {k: v for k, v in params.items() if k != "id"}
            updated = csv_service.update_todo(int(todo_id), current_user["id"], update)
            if not updated:
                return err(404, "Todo not found")
            print(f"[mcp][{req_id}] todos.update -> id={todo_id}")
            return ok(updated)

        if method == "todos.delete":
            todo_id = params.get("id")
            if not todo_id:
                return err(-32602, "Missing required param: id")
            success = csv_service.delete_todo(int(todo_id), current_user["id"])
            if not success:
                return err(404, "Todo not found")
            print(f"[mcp][{req_id}] todos.delete -> id={todo_id}")
            return ok({"deleted": True})

        if method == "todos.toggle":
            todo_id = params.get("id")
            if not todo_id:
                return err(-32602, "Missing required param: id")
            todo = csv_service.get_todo_by_id(int(todo_id), current_user["id"])
            if not todo:
                return err(404, "Todo not found")
            updated = csv_service.update_todo(int(todo_id), current_user["id"], {"completed": not todo["completed"]})
            print(f"[mcp][{req_id}] todos.toggle -> id={todo_id} completed={updated.get('completed')}")
            return ok(updated)

        # Categories
        if method == "categories.list":
            cats = csv_service.get_categories_by_user(current_user["id"])
            print(f"[mcp][{req_id}] categories.list -> {len(cats)} items")
            return ok(cats)

        print(f"[mcp][{req_id}] method not found -> {method}")
        return err(-32601, f"Method not found: {method}")
    except Exception as e:
        print(f"[mcp][{req_id}] error", {"error": str(e)})
        return err(-32000, f"Server error: {str(e)}")


