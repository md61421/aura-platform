from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.db.models.enums import ArtifactStatus, ReviewActionType, SubmissionStatus
from app.schemas.common import from_attributes


class ReviewActionCreate(BaseModel):
    submission_id: UUID
    reviewer_id: UUID
    action: ReviewActionType
    review_note: str | None = None


class ReviewActionRequest(BaseModel):
    review_note: str | None = Field(default=None, max_length=2000)


class ReviewActionRead(ReviewActionCreate):
    model_config = from_attributes

    id: UUID
    created_at: datetime


class ArtifactModerationRead(BaseModel):
    artifact_id: UUID
    artifact_status: ArtifactStatus
    submission_id: UUID | None = None
    submission_status: SubmissionStatus | None = None
    review_action_id: UUID | None = None
    review_action: ReviewActionType | None = None
    reviewed_at: datetime | None = None
