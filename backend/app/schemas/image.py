from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.db.models.enums import (
    FileRole,
    FileType,
    ImageArtifactRelationshipType,
    ImageVisibilityStatus,
    Modality,
    StorageProvider,
)
from app.schemas.common import from_attributes


class ImageCreate(BaseModel):
    submission_id: UUID | None = None
    title: str | None = None
    caption: str | None = None
    modality: Modality = Modality.UNKNOWN
    vendor: str | None = None
    sequence: str | None = None
    protocol: str | None = None
    field_strength: str | None = None
    visibility_status: ImageVisibilityStatus = ImageVisibilityStatus.PRIVATE_STAGING
    reliability_score: int = 0


class ImageRead(ImageCreate):
    model_config = from_attributes

    id: UUID
    created_at: datetime
    updated_at: datetime


class ImageArtifactCreate(BaseModel):
    image_id: UUID
    artifact_id: UUID
    relationship_type: ImageArtifactRelationshipType
    note: str | None = None


class ImageArtifactRead(ImageArtifactCreate):
    model_config = from_attributes

    id: UUID
    created_at: datetime


class ImageFileCreate(BaseModel):
    image_id: UUID
    file_role: FileRole
    file_type: FileType
    storage_provider: StorageProvider
    storage_bucket: str
    storage_key: str
    public_url: str | None = None
    is_public: bool = False
    file_size_mb: float | None = None
    checksum: str | None = None


class ImageFileRead(ImageFileCreate):
    model_config = from_attributes

    id: UUID
    created_at: datetime

