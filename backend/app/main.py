from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        debug=settings.DEBUG,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_origin_regex=r"https://.*\.vercel\.app|http://(localhost|127\.0\.0\.1):\d+",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    upload_root = Path(settings.LOCAL_STORAGE_ROOT)
    if not upload_root.is_absolute():
        upload_root = Path.cwd() / upload_root
    try:
        upload_root.mkdir(parents=True, exist_ok=True)
    except (OSError, PermissionError):
        import tempfile

        upload_root = Path(tempfile.gettempdir()) / "aura_uploads"
        upload_root.mkdir(parents=True, exist_ok=True)

    app.mount(
        "/uploads",
        StaticFiles(directory=upload_root),
        name="local_upload",
    )

    @app.get("/")
    def root():
        return {
            "message": "Welcome to the AURA Platform API",
            "docs": "/docs",
            "health": f"{settings.API_V1_PREFIX}/health",
        }

    @app.get("/health")
    def direct_health_check():
        return {"status": "ok"}

    return app


app = create_app()
