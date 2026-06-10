from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.db.models.enums import ArtifactStatus, Modality
from app.schemas.common import from_attributes


class ArtifactCreate(BaseModel):
    title: str
    aliases: list[str] = Field(default_factory=list)
    explanation: str | None = None
    visual_description: str | None = None
    remedies: list[dict[str, Any]] = Field(default_factory=list)
    default_modality: Modality = Modality.UNKNOWN
    status: ArtifactStatus = ArtifactStatus.DRAFT


class ArtifactRead(ArtifactCreate):
    model_config = from_attributes

    id: UUID
    created_at: datetime
    updated_at: datetime
