import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, Enum, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.db.mixins import CreatedAtMixin, TimestampMixin
from app.db.models.enums import Modality, TagType, enum_values

if TYPE_CHECKING:
    from app.db.models.artifact import Artifact


class Tag(TimestampMixin, Base):
    __tablename__ = "tags"
    __table_args__ = (Index("ix_tags_name", "name"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    tag_type: Mapped[TagType] = mapped_column(
        Enum(TagType, values_callable=enum_values, name="tag_type_enum"),
        default=TagType.OTHER,
        nullable=False,
    )
    modality_scope: Mapped[Modality] = mapped_column(
        Enum(Modality, values_callable=enum_values, name="modality_enum"),
        default=Modality.ALL,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=text("true"),
        nullable=False,
    )

    artifact_links: Mapped[list["ArtifactTag"]] = relationship(
        back_populates="tag",
        cascade="all, delete-orphan",
    )


class ArtifactTag(CreatedAtMixin, Base):
    __tablename__ = "artifact_tags"
    __table_args__ = (
        Index("ix_artifact_tags_artifact_id", "artifact_id"),
        Index("ix_artifact_tags_tag_id", "tag_id"),
        Index("uq_artifact_tags_artifact_tag", "artifact_id", "tag_id", unique=True),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    artifact_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("artifacts.id", ondelete="CASCADE"),
        nullable=False,
    )
    tag_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tags.id", ondelete="CASCADE"),
        nullable=False,
    )

    artifact: Mapped["Artifact"] = relationship(back_populates="tag_links")
    tag: Mapped["Tag"] = relationship(back_populates="artifact_links")
