from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.db.models.enums import ArtifactStatus, Modality, VoteType
from app.schemas.common import from_attributes


class ArtifactCreate(BaseModel):
    title: str
    aliases: list[str] = Field(default_factory=list)
    explanation: str | None = None
    visual_description: str | None = None
    remedies: list[dict[str, Any]] = Field(default_factory=list)
    default_modality: Modality = Modality.UNKNOWN
    status: ArtifactStatus = ArtifactStatus.CONTRIBUTOR_PUBLISHED


class ArtifactRead(ArtifactCreate):
    model_config = from_attributes

    id: UUID
    created_at: datetime
    updated_at: datetime


class PublicImageFileRead(BaseModel):
    id: UUID
    file_role: str
    file_type: str
    public_url: str


class PublicImageSummaryRead(BaseModel):
    id: UUID
    title: str | None = None
    caption: str | None = None
    modality: Modality
    vendor: str | None = None
    sequence: str | None = None
    protocol: str | None = None
    field_strength: str | None = None
    reliability_score: int
    relationship_type: str
    files: list[PublicImageFileRead] = Field(default_factory=list)


class ArtifactSummaryRead(BaseModel):
    id: UUID
    title: str
    aliases: list[str] = Field(default_factory=list)
    explanation: str | None = None
    visual_description: str | None = None
    default_modality: Modality
    status: ArtifactStatus
    tags: list[str] = Field(default_factory=list)
    images: list[PublicImageSummaryRead] = Field(default_factory=list)
    submitter_notes: str | None = None
    submitted_by: str | None = None
    agreements: int = 0
    disagreements: int = 0
    reliability_score: int = 0
    user_vote: VoteType | None = None
    created_at: datetime
    updated_at: datetime


class ArtifactDetailRead(ArtifactSummaryRead):
    remedies: list[dict[str, Any]] = Field(default_factory=list)
    modality_metadata: dict[str, Any] = Field(default_factory=dict)
