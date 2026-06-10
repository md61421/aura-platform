from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.db.models.enums import QualityFlag
from app.schemas.common import from_attributes


class QCResultCreate(BaseModel):
    image_id: UUID
    source_tool: str | None = None
    metrics: dict[str, Any] = Field(default_factory=dict)
    quality_flag: QualityFlag = QualityFlag.UNKNOWN


class QCResultRead(QCResultCreate):
    model_config = from_attributes

    id: UUID
    created_at: datetime
