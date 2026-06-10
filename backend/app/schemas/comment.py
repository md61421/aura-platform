from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.db.models.enums import CommentStatus
from app.schemas.common import from_attributes


class CommentCreate(BaseModel):
    image_id: UUID
    user_id: UUID | None = None
    author_name: str | None = None
    body: str
    status: CommentStatus = CommentStatus.VISIBLE


class CommentRead(CommentCreate):
    model_config = from_attributes

    id: UUID
    created_at: datetime
    updated_at: datetime

