import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.db.mixins import CreatedAtMixin, TimestampMixin
from app.db.models.enums import ImageArtifactRelationshipType, ImageVisibilityStatus, Modality, enum_values

if TYPE_CHECKING:
    from app.db.models.artifact import Artifact
    from app.db.models.comment import Comment
    from app.db.models.file import ImageFile
    from app.db.models.qc import QCResult
    from app.db.models.submission import Submission
    from app.db.models.vote import Vote


class Image(TimestampMixin, Base):
    __tablename__ = "images"
    __table_args__ = (
        Index("ix_images_modality", "modality"),
        Index("ix_images_vendor", "vendor"),
        Index("ix_images_sequence", "sequence"),
        Index("ix_images_visibility_status", "visibility_status"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    submission_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("submissions.id", ondelete="SET NULL"),
        nullable=True,
    )
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    caption: Mapped[str | None] = mapped_column(Text, nullable=True)
    modality: Mapped[Modality] = mapped_column(
        Enum(Modality, values_callable=enum_values, name="modality_enum"),
        default=Modality.UNKNOWN,
        nullable=False,
    )
    vendor: Mapped[str | None] = mapped_column(String(120), nullable=True)
    sequence: Mapped[str | None] = mapped_column(String(120), nullable=True)
    protocol: Mapped[str | None] = mapped_column(String(255), nullable=True)
    field_strength: Mapped[str | None] = mapped_column(String(50), nullable=True)
    visibility_status: Mapped[ImageVisibilityStatus] = mapped_column(
        Enum(
            ImageVisibilityStatus,
            values_callable=enum_values,
            name="image_visibility_status_enum",
        ),
        default=ImageVisibilityStatus.PRIVATE_STAGING,
        nullable=False,
    )
    reliability_score: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default=text("0"),
        nullable=False,
    )

    submission: Mapped["Submission | None"] = relationship(back_populates="images")
    artifact_links: Mapped[list["ImageArtifact"]] = relationship(
        back_populates="image",
        cascade="all, delete-orphan",
    )
    files: Mapped[list["ImageFile"]] = relationship(
        back_populates="image",
        cascade="all, delete-orphan",
    )
    votes: Mapped[list["Vote"]] = relationship(
        back_populates="image",
        cascade="all, delete-orphan",
    )
    comments: Mapped[list["Comment"]] = relationship(
        back_populates="image",
        cascade="all, delete-orphan",
    )
    qc_results: Mapped[list["QCResult"]] = relationship(
        back_populates="image",
        cascade="all, delete-orphan",
    )


class ImageArtifact(CreatedAtMixin, Base):
    __tablename__ = "image_artifacts"
    __table_args__ = (
        Index("ix_image_artifacts_image_id", "image_id"),
        Index("ix_image_artifacts_artifact_id", "artifact_id"),
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
    artifact_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("artifacts.id", ondelete="CASCADE"),
        nullable=False,
    )
    relationship_type: Mapped[ImageArtifactRelationshipType] = mapped_column(
        Enum(
            ImageArtifactRelationshipType,
            values_callable=enum_values,
            name="image_artifact_relationship_type_enum",
        ),
        nullable=False,
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    image: Mapped["Image"] = relationship(back_populates="artifact_links")
    artifact: Mapped["Artifact"] = relationship(back_populates="image_links")


Index(
    "uq_image_artifacts_one_primary_per_image",
    ImageArtifact.image_id,
    unique=True,
    postgresql_where=(
        ImageArtifact.relationship_type == ImageArtifactRelationshipType.PRIMARY.value
    ),
)
