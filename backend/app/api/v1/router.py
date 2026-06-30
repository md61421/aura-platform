from fastapi import APIRouter

from app.api.v1 import artifacts, auth, community, health, review, submissions, tags

api_router = APIRouter()
api_router.include_router(artifacts.router, prefix="/artifacts", tags=["artifacts"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(community.router, prefix="/community", tags=["community"])
api_router.include_router(health.router, prefix="/health", tags=["health"])
api_router.include_router(review.review_router, prefix="/review", tags=["review"])
api_router.include_router(review.admin_router, prefix="/admin", tags=["admin"])
api_router.include_router(submissions.router, prefix="/submissions", tags=["submissions"])
api_router.include_router(tags.router, prefix="/tags", tags=["tags"])
