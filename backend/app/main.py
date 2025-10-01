from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .api.todos import router as todos_router


def create_app() -> FastAPI:
    app = FastAPI(title="CSV Todo API", version="0.1.0")

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

    return app


app = create_app()


