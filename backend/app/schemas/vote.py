from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.db.models.enums import VoteType
from app.schemas.common import from_attributes


class VoteCreate(BaseModel):
    image_id: UUID
    user_id: UUID | None = None
    vote_type: VoteType


class VoteRead(VoteCreate):
    model_config = from_attributes

    id: UUID
    created_at: datetime

