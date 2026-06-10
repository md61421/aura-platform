from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.db.models.enums import Modality, TagType
from app.schemas.common import from_attributes


class TagCreate(BaseModel):
    name: str
    tag_type: TagType = TagType.OTHER
    modality_scope: Modality = Modality.ALL
    is_active: bool = True


class TagRead(TagCreate):
    model_config = from_attributes

    id: UUID
    created_at: datetime
    updated_at: datetime


class ArtifactTagCreate(BaseModel):
    artifact_id: UUID
    tag_id: UUID


class ArtifactTagRead(ArtifactTagCreate):
    model_config = from_attributes

    id: UUID
    created_at: datetime

