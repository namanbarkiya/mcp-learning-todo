from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import auth, todos, mcp
from app.core.config import settings

app = FastAPI(
    title="MCP Todo App API",
    description="A todo application with Model Context Protocol integration",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["authentication"])
app.include_router(todos.router, prefix="/api/todos", tags=["todos"])
app.include_router(mcp.router, prefix="/api/mcp", tags=["mcp"])

@app.get("/")
async def root():
    return {"message": "MCP Todo App API", "version": "1.0.0"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
