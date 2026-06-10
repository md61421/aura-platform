from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.db.models.enums import SubmissionStatus
from app.schemas.common import from_attributes


class SubmissionCreate(BaseModel):
    submitted_by_id: UUID | None = None
    contact_email: str | None = None
    status: SubmissionStatus = SubmissionStatus.PENDING_REVIEW
    permission_confirmed: bool = False
    pseudonymisation_confirmed: bool = False
    submitter_notes: str | None = None
    submitted_at: datetime | None = None


class SubmissionRead(SubmissionCreate):
    model_config = from_attributes

    id: UUID
    reviewed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
