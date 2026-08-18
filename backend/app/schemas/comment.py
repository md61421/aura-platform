from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.db.models.enums import CommentStatus
from app.schemas.common import from_attributes


class CommentCreate(BaseModel):
    image_id: UUID
    user_id: UUID | None = None
    author_name: str | None = None
    body: str
    status: CommentStatus = CommentStatus.VISIBLE


class ContributorCommentCreate(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class CommentCreateRequest(BaseModel):
    body: str = Field(min_length=1, max_length=4000)


class CommentRead(CommentCreate):
    model_config = from_attributes

    id: UUID
    created_at: datetime
    updated_at: datetime


class CommentItemRead(BaseModel):
    model_config = from_attributes

    id: UUID
    image_id: UUID
    user_id: UUID | None = None
    author_name: str
    author_role: str | None = None
    body: str
    status: CommentStatus = CommentStatus.VISIBLE
    created_at: datetime
    updated_at: datetime
    is_author: bool = False
