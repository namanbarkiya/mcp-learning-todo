# MCP AI Todo

An end-to-end demo showing an API-first MCP approach: a FastAPI backend exposes both a REST API and an MCP endpoint; a Next.js client consumes the REST API for UI and can orchestrate via MCP for tool-driven actions.

## Why API-first MCP?

-   The backend (FastAPI) owns the source of truth and exposes capabilities as REST endpoints and MCP tools.
-   The frontend (Next.js) stays thin and calls the API, while MCP can automate workflows via the same backend.
-   Assistants in MCP-compatible clients can invoke the same server-side tools used by the UI.

## Architecture

```text
                 ┌───────────────────────────────┐
                 │        Next.js Frontend       │
                 │  (Tabs: Todos | MCP | Chat)   │
                 └───────────────┬───────────────┘
                                 │
              fetch /app/api/mcp │         fetch /app/api/chat
                                 │                  │
                                 ▼                  ▼
                     ┌────────────────────────────┐   ┌──────────────────────┐
                     │ MCP API Routes             │   │   Chat API Route     │
                     │ /api/mcp/tools             │   │ (LLM + tool-calling) │
                     │ /api/mcp/tool (invoke)     │   └─────────────┬────────┘
                     │ /api/mcp/resources/prompts │                 │
                     └──────────────┬─────────────┘                 │ server-side
                                    │                               ▼
                                    │                    ┌────────────────────────┐
                                    │                    │  MCP Client SDK (JS)   │
                                    │                    │ @modelcontextprotocol  │
                                    │                    └─────────────┬──────────┘
                                    │                                  │ HTTP
                                    ▼                                  │
                         ┌────────────────────────────┐                ▼
                         │   MCP Server (FastAPI)     │        ┌───────────────┐
                         │   Endpoint: POST /mcp      │        │   LLM (Gemini)│
                         │   Exposes MCP Tools:       │        └───────────────┘
                         │   - list_todos             │         function calls
                         │   - get_todo               │
                         │   - create_todo            │
                         │   - update_todo            │
                         │   - delete_todo            │
                         └─────────┬──────────────────┘
                                   │
                        REST       │
    ┌──────────────────────────────┴───────────────────────────────┐
    │                         FastAPI REST                         │
    │   GET/POST /todos/  |  PUT/DELETE /todos/{id}                │
    └───────────────┬──────────────────────────────────────────────┘
                    │
                    ▼
         ┌──────────────────────┐       writes/reads      ┌───────────┐
         │  CSV Service (CRUD)  │────────────────────────►│ todos.csv │
         │ load/save/next id    │◄────────────────────────│           │
         └──────────────────────┘        data returned    └───────────┘

```

## Project Structure

```
mcp-ai-todo/
├── .cursor/          # Cursor config for MCP tools
├── backend/          # FastAPI REST API + MCP endpoint; CSV storage for todos
├── frontend/         # Next.js client (shadcn/ui, Tailwind) with multi-tab UI
└── README.md         # This file
```

## Backend (FastAPI + MCP)

Start the API server:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

Key endpoints:

-   REST: GET/POST `/todos/`, PUT/DELETE `/todos/{id}/`
-   MCP: POST `/mcp` (Model Context Protocol endpoint)

Data store: `backend/data/todos.csv` via a simple CSV service.

## Frontend (Next.js)

Start the web client:

```bash
cd frontend
npm install
npm run dev
```

Environment variables:

-   `NEXT_PUBLIC_API_BASE` (optional): defaults to `http://localhost:8080`. Set if your backend runs elsewhere.

UI highlights (single-page, multi-tab):

-   **Todos**: CRUD against FastAPI endpoints; inline edit, toggle, delete
-   **MCP Tools**: lists available server tools exposed via MCP
-   **Chat**: improved chat window; each response shows collapsible tool-call details

Tech:

-   Next.js App Router, Tailwind CSS (v3), shadcn/ui components
-   MCP client (`@modelcontextprotocol/sdk`) configured in `frontend/lib/mcpClient.ts`

## Using MCP with this project

MCP is exposed at `http://localhost:8080/mcp`. Any MCP-compatible client can connect and discover available tools. Typical flows:

-   Ask the assistant to list/create/update/delete todos; the assistant calls MCP tools that use the same backend logic as the REST API.
-   In the UI Chat tab, tool calls and results appear under each assistant response.

Example assistant prompts:

-   “List all todos.”
-   “Create a todo ‘Buy groceries’.”
-   “Mark todo 3 as completed.”

## Development Tips

-   Keep server logic in the backend; expose as both REST and MCP tools.
-   The UI should remain a thin client; avoid duplicating server logic in the frontend.
-   To change styles, use shadcn/ui primitives and Tailwind utilities (no custom component boilerplate).

## URLs

-   Frontend: `http://localhost:3000`
-   API: `http://localhost:8080`
-   MCP: `http://localhost:8080/mcp`
