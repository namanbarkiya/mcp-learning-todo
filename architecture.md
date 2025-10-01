# MCP Todo App - Architecture and Technical Guide

This document describes the complete architecture of the MCP Todo App, including frontend, backend, storage, authentication, MCP capabilities, API contracts, data models, flows, logging, configuration, and future enhancements.

## Overview

-   Frontend: Next.js 14/15 (App Router), TypeScript, Tailwind CSS
-   Backend: FastAPI (Python), JSON-RPC-like MCP endpoint, REST endpoints
-   Storage: CSV files managed via pandas (`users.csv`, `todos.csv`, `categories.csv`)
-   Auth: JWT (jose) with bcrypt password hashing
-   Validation: Pydantic v2 schemas
-   MCP: JSON-RPC 2.0-style endpoint `/api/mcp` exposing todo/category methods
-   Chat: Simple Gemini-backed chat with tool-use to drive MCP calls (optional)

## Repository Structure

```
backend/
  app/
    api/
      auth.py        # REST auth: register, login, current user
      todos.py       # REST todos: CRUD, toggle, categories list
      mcp.py         # JSON-RPC-like endpoint for MCP methods
    core/
      config.py      # pydantic-settings based configuration
      security.py    # bcrypt + JWT helpers
    schemas/
      user.py        # Pydantic User schemas
      todo.py        # Pydantic Todo schemas
      category.py    # Pydantic Category schemas
    services/
      csv_service.py # All CSV read/write and normalization logic
  data/
    users.csv        # user records
    todos.csv        # todo records
    categories.csv   # category records

frontend/
  src/app/
    api/chat/route.ts         # Server route proxying Gemini + MCP
    chat/page.tsx             # Chat UI using the route
    dashboard/page.tsx        # Todos management UI
    auth/login/page.tsx       # Login form
    auth/register/page.tsx    # Register form
    layout.tsx, page.tsx      # Root layout and home

architecture.md               # This document
architecture.mermaid          # Mermaid diagram
plan.md                       # Development plan and phases
```

## Data Model

### `users.csv`

-   Columns: `id`, `username`, `email`, `password_hash`, `created_at`, `last_login`, `preferences`, `updated_at`
-   `preferences` stored as JSON string (e.g., `{}`) to avoid CSV type confusion

### `todos.csv`

-   Columns: `id`, `user_id`, `title`, `description`, `priority`, `due_date`, `completed`, `created_at`, `updated_at`, `category`
-   `id`: integer sequence
-   `completed`: boolean
-   `due_date`: ISO string or null

### `categories.csv`

-   Columns: `id`, `name`, `description`, `color`, `user_id`
-   Auto-managed on-the-fly when a todo is created with a new category

## Backend

### Framework & Libraries

-   FastAPI for REST endpoints and middleware
-   pandas for CSV I/O
-   jose for JWT signing/verification
-   bcrypt for hashing
-   pydantic v2 + pydantic-settings for schema & config

### Core Services

`CSVService` encapsulates CSV operations:

-   Initialization with headers when files are missing
-   `create_user`, `get_user_by_username`, `get_user_by_id`, `update_user`
-   `create_todo`, `get_todos_by_user`, `get_todo_by_id`, `update_todo`, `delete_todo`
-   `_ensure_category_exists`, `get_categories_by_user`
-   Normalization helpers for NaN/null, booleans, ids, and types to satisfy pydantic

### REST Endpoints

-   `POST /api/auth/register` → create user
-   `POST /api/auth/login` → JWT
-   `GET  /api/auth/me` → current user
-   `GET  /api/todos/` → list todos for user
-   `POST /api/todos/` → create todo
-   `PUT  /api/todos/{id}` → update todo
-   `PATCH /api/todos/{id}/toggle` → toggle completion
-   `DELETE /api/todos/{id}` → delete todo
-   `GET  /api/todos/categories` → list categories for user

All protected routes require `Authorization: Bearer <token>`.

### Authentication

-   Bcrypt hashing for passwords
-   JWT (HS256) with subject = username
-   `get_current_user` extracts token, finds user, injects into dep chain

### MCP Endpoint (JSON-RPC-like)

`POST /api/mcp`

-   Request: `{ "jsonrpc": "2.0", "id": "...", "method": "<name>", "params": { ... } }`
-   Response: `{ "jsonrpc": "2.0", "id": "...", "result": <payload> }` or `{ "error": { code, message } }`

Supported methods:

-   `mcp.schema`: returns tool metadata and method signatures
-   `todos.list`: list todos
-   `todos.create`: create todo (title, description?, priority?, due_date?, category?)
-   `todos.update`: update by `id`
-   `todos.delete`: delete by `id`
-   `todos.toggle`: toggle completion by `id`
-   `todos.findByTitle`: search by title (exact or substring) returning `{id,title}` pairs
-   `categories.list`: list categories

The endpoint prints structured logs with a request id for traceability.

## Frontend

### Dashboard (Next.js)

-   Displays todos, allows add, toggle, delete
-   Category management in the create form:
    -   Dropdown for existing categories + optional custom category field
    -   After create, refreshes category list
-   Fetches with JWT from localStorage

### Chat with Tools (Optional)

-   API route `/api/chat`:

    -   Calls Gemini (Google Generative Language API) with a system prompt containing MCP schema and recent tool context
    -   Sends last 5 chat messages and last 3 tool results
    -   If the model emits a `{ tool_call: { method, params } }`, forwards it to `/api/mcp`
    -   Heuristics (lightweight):
        -   Deterministic bypass for explicit "list all todos"
        -   When previous tool result has a single todo and user says "toggle", calls `todos.toggle`
    -   Cleans message, returns `{ message, tool_call?, tool_result? }`

-   UI `/chat`:
    -   Minimal chat window
    -   Renders results in a readable list; stores a short `toolHistory` (last 3 tool results)

## Error Handling & Data Normalization

-   Pydantic validation: ensure datetime/boolean types
-   CSV normalization: convert NaN to None, coerce fields to expected types
-   For categories and preferences, store JSON as strings to avoid CSV parsing pitfalls

## Logging

-   Backend MCP logs: request id, method, outcomes
-   Frontend chat logs: request id, gemini response length, parsed tool-call, fallbacks, response meta

## Configuration

-   Backend environment via `pydantic-settings`:
    -   Secret key, JWT expiry, CSV paths, CORS origins
-   Frontend env:
    -   `GEMINI_API_KEY`
    -   `NEXT_PUBLIC_BACKEND_URL` (default `http://localhost:8000`)

## Security Considerations

-   JWT validation for all protected routes
-   Password hashing with bcrypt
-   CORS restricted via settings
-   No PII beyond required fields stored in users.csv

## Deployment Outline

-   Backend: Uvicorn/Gunicorn on Render/Railway/Fly; mount `backend/data` as persistent volume
-   Frontend: Vercel/Netlify/Render static hosting; set env vars
-   Ensure HTTPS and correct CORS for production domains

## Testing

-   Manual smoke via curl for REST and MCP
-   Future: pytest + httpx for API tests, mocking CSV files

## Limitations & Tradeoffs

-   CSV storage is simple but not concurrent-safe for heavy write load
-   No optimistic locking; last-write-wins
-   No pagination; suitable for MVP scale

## Future Enhancements

-   Replace CSV with SQLite/PostgreSQL; keep MCP surface stable
-   Add MCP batch processing and streaming tool results
-   Rich category management (colors, re-ordering)
-   Attachments and reminders for todos
-   Role-based multi-user sharing
-   Observability: structured JSON logs, OpenTelemetry traces

---

This document mirrors the current codebase. For the latest details, see `backend/app/api/mcp.py`, `backend/app/services/csv_service.py`, and `frontend/src/app/api/chat/route.ts`.
