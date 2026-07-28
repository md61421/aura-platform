from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field

from app.db.models.enums import Modality
from app.schemas.common import from_attributes


class MetadataFieldCreate(BaseModel):
    modality: Modality
    key: str = Field(min_length=1, max_length=100)
    label: str = Field(min_length=1, max_length=255)
    unit: str | None = Field(default=None, max_length=50)
    field_type: str = Field(default="text", max_length=50)
    is_required: bool = False
    example: str | None = Field(default=None, max_length=255)
    display_order: int = 0


class MetadataFieldUpdate(BaseModel):
    label: str | None = Field(default=None, max_length=255)
    unit: str | None = Field(default=None, max_length=50)
    field_type: str | None = Field(default=None, max_length=50)
    is_required: bool | None = None
    example: str | None = Field(default=None, max_length=255)
    display_order: int | None = None


class MetadataFieldRead(BaseModel):
    model_config = from_attributes

    id: UUID
    modality: Modality
    key: str
    label: str
    unit: str | None = None
    field_type: str
    is_required: bool
    example: str | None = None
    display_order: int
    created_at: datetime
    updated_at: datetime
