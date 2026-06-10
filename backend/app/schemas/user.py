from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.db.models.enums import UserRole
from app.schemas.common import from_attributes


class UserCreate(BaseModel):
    name: str | None = None
    email: str | None = None
    role: UserRole = UserRole.PUBLIC_USER


class UserRead(UserCreate):
    model_config = from_attributes

    id: UUID
    created_at: datetime
    updated_at: datetime
