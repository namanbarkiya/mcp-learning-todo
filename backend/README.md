# Backend - CSV Todo API

FastAPI backend with MCP (Model Context Protocol) integration for AI assistant access.

## Setup

1. **Create Virtual Environment**

    ```bash
    python -m venv venv
    source venv/bin/activate  # On Windows: venv\Scripts\activate
    ```

2. **Install Dependencies**

    ```bash
    pip install -r requirements.txt
    ```

3. **Run Server**
    ```bash
    uvicorn app.main:app --reload --port 8080
    ```

## API Endpoints

### Todos

-   `GET /todos` - List all todos
-   `GET /todos/{id}` - Get specific todo
-   `POST /todos` - Create new todo
-   `PUT /todos/{id}` - Update todo
-   `DELETE /todos/{id}` - Delete todo

### Health Check

-   `GET /` - Server status

## MCP Integration

The server exposes an MCP endpoint at `/mcp` that allows AI assistants to interact with todos:

-   **Name**: CSV Todo MCP
-   **Description**: MCP tools for CSV-backed todo CRUD operations
-   **Endpoint**: http://localhost:8080/mcp

## Data Storage

Todos are stored in `data/todos.csv` with the following format:

```csv
id,title,completed
1,Buy groceries,false
2,Walk dog,true
```

## Architecture

```
backend/
├── app/
│   ├── api/todos.py     # Todo endpoints
│   ├── services/        # Business logic
│   ├── schemas/         # Pydantic models
│   └── main.py          # FastAPI app with MCP
├── data/
│   └── todos.csv        # Data storage
└── requirements.txt     # Dependencies
```
