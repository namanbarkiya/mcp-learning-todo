# MCP AI Todo

A full-stack todo application with AI integration using Model Context Protocol (MCP). Features a FastAPI backend with CSV storage and a Next.js frontend, accessible via AI assistants through MCP.

## Project Structure

```
mcp-ai-todo/
├── backend/          # FastAPI server with MCP integration
├── frontend/         # Next.js React application
├── mcp-server/       # MCP server configuration
└── .cursor/          # Cursor IDE MCP configuration
```

## Quick Start

1. **Start Backend**

    ```bash
    cd backend
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    pip install -r requirements.txt
    uvicorn app.main:app --reload --port 8080
    ```

2. **Start Frontend**

    ```bash
    cd frontend
    npm install
    npm run dev
    ```

3. **Access Application**
    - Frontend: http://localhost:3000
    - Backend API: http://localhost:8080
    - MCP Endpoint: http://localhost:8080/mcp

## Features

-   ✅ CRUD operations for todos
-   🤖 AI assistant integration via MCP
-   💾 CSV-based data storage
-   🌐 RESTful API
-   ⚡ Real-time updates

## .cursor/mcp.json

This file configures MCP (Model Context Protocol) integration for Cursor IDE:

```json
{
    "mcpServers": {
        "fastapi-mcp": {
            "url": "http://localhost:8080/mcp"
        }
    }
}
```

This allows AI assistants in Cursor to interact with your todo application directly through the MCP protocol.

## AI Integration

With MCP configured, you can ask AI assistants to:

-   List all todos
-   Create new todos
-   Update todo status
-   Delete todos
-   Get specific todo details

Example: "List all my todos" or "Create a todo for 'Buy groceries'"
