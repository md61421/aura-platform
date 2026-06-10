from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.db.models.enums import ReviewActionType
from app.schemas.common import from_attributes


class ReviewActionCreate(BaseModel):
    submission_id: UUID
    reviewer_id: UUID
    action: ReviewActionType
    review_note: str | None = None


class ReviewActionRead(ReviewActionCreate):
    model_config = from_attributes

    id: UUID
    created_at: datetime

