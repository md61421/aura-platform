import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, Float, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.db.mixins import CreatedAtMixin
from app.db.models.enums import FileRole, FileType, StorageProvider, enum_values

if TYPE_CHECKING:
    from app.db.models.image import Image


class ImageFile(CreatedAtMixin, Base):
    __tablename__ = "image_files"
    __table_args__ = (
        Index("ix_image_files_image_id", "image_id"),
        Index("ix_image_files_file_role", "file_role"),
        Index("ix_image_files_storage_key", "storage_key"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    image_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("images.id", ondelete="CASCADE"),
        nullable=False,
    )
    file_role: Mapped[FileRole] = mapped_column(
        Enum(FileRole, values_callable=enum_values, name="file_role_enum"),
        nullable=False,
    )
    file_type: Mapped[FileType] = mapped_column(
        Enum(FileType, values_callable=enum_values, name="file_type_enum"),
        nullable=False,
    )
    storage_provider: Mapped[StorageProvider] = mapped_column(
        Enum(StorageProvider, values_callable=enum_values, name="storage_provider_enum"),
        nullable=False,
    )
    storage_bucket: Mapped[str] = mapped_column(String(255), nullable=False)
    storage_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    public_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    is_public: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=text("false"),
        nullable=False,
    )
    file_size_mb: Mapped[float | None] = mapped_column(Float, nullable=True)
    checksum: Mapped[str | None] = mapped_column(String(128), nullable=True)

    image: Mapped["Image"] = relationship(back_populates="files")
