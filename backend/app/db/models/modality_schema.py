import uuid

from sqlalchemy import Boolean, Enum, Index, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base_class import Base
from app.db.mixins import TimestampMixin
from app.db.models.enums import Modality, enum_values


class ModalityMetadataField(TimestampMixin, Base):
    __tablename__ = "modality_metadata_fields"
    __table_args__ = (
        Index("ix_modality_metadata_fields_modality", "modality"),
        Index("ix_modality_metadata_fields_key", "key"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    modality: Mapped[Modality] = mapped_column(
        Enum(Modality, values_callable=enum_values, name="modality_enum"),
        nullable=False,
    )
    key: Mapped[str] = mapped_column(String(100), nullable=False)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    unit: Mapped[str | None] = mapped_column(String(50), nullable=True)
    field_type: Mapped[str] = mapped_column(String(50), default="text", nullable=False)
    is_required: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    example: Mapped[str | None] = mapped_column(String(255), nullable=True)
    display_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
