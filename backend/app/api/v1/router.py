from fastapi import APIRouter

from app.api.v1 import artifacts, auth, health, submissions, tags

api_router = APIRouter()
api_router.include_router(artifacts.router, prefix="/artifacts", tags=["artifacts"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(submissions.router, prefix="/submissions", tags=["submissions"])
api_router.include_router(tags.router, prefix="/tags", tags=["tags"])
