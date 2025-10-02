from fastapi import FastAPI
from fastapi_mcp import FastApiMCP
from fastapi.middleware.cors import CORSMiddleware

from .api.todos import router as todos_router


def create_app() -> FastAPI:
    app = FastAPI(title="MCP Todo API", version="0.1.0")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(todos_router, prefix="/todos", tags=["todos"])

    @app.get("/")
    def root():
        return {"status": "ok", "service": "csv-todo"}

    # Mount MCP server with metadata and include only endpoints tagged as "todos"
    mcp = FastApiMCP(
        app,
        name="MCP Todo",
        description=(
            "MCP tools exposing CSV-backed todo CRUD endpoints. "
            "Includes list, get, create, update, and delete operations."
        ),
        include_tags=["todos"],
    )
    mcp.mount()

    return app


app = create_app()


