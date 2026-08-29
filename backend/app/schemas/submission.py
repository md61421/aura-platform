from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.db.models.enums import ArtifactStatus, FileRole, FileType, ImageVisibilityStatus, Modality, SubmissionStatus
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


class SubmittedArtifactRead(BaseModel):
    id: UUID
    title: str
    explanation: str | None = None
    visual_description: str | None = None
    remedies: list[dict] = Field(default_factory=list)
    default_modality: Modality
    status: ArtifactStatus
    tags: list[str] = Field(default_factory=list)


class SubmittedFileRead(BaseModel):
    id: UUID
    filename: str | None = None
    file_role: FileRole = FileRole.REPRESENTATIVE
    file_type: FileType
    file_size_mb: float | None = None
    checksum: str | None = None
    public_url: str | None = None
    storage_key: str | None = None


class SubmittedImageRead(BaseModel):
    id: UUID
    title: str | None = None
    modality: Modality
    vendor: str | None = None
    sequence: str | None = None
    protocol: str | None = None
    field_strength: str | None = None
    visibility_status: ImageVisibilityStatus
    modality_metadata: dict[str, Any] = Field(default_factory=dict)
    files: list[SubmittedFileRead] = Field(default_factory=list)


class SubmissionReceiptRead(SubmissionRead):
    artifact: SubmittedArtifactRead
    image: SubmittedImageRead
    files: list[SubmittedFileRead] = Field(default_factory=list)


class MySubmissionRead(BaseModel):
    id: UUID
    contact_email: str | None = None
    status: SubmissionStatus
    permission_confirmed: bool = False
    pseudonymisation_confirmed: bool = False
    submitter_notes: str | None = None
    submitted_at: datetime | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    artifact: SubmittedArtifactRead | None = None
    image: SubmittedImageRead | None = None
    file_count: int = 0


class SubmissionUpdate(BaseModel):
    artifact_name: str
    modality: Modality
    category: str | None = None
    description: str
    scanner: str | None = None
    sequence: str | None = None
    protocol: str | None = None
    field_strength: str | None = None
    symptoms: list[str] = Field(default_factory=list)
    remedies: str | None = None
    references: str | None = None
    submitter_notes: str | None = None
    modality_metadata: dict[str, Any] | None = None
