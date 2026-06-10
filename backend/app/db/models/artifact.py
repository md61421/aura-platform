import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import Enum, Index, String, Text, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.db.mixins import TimestampMixin
from app.db.models.enums import ArtifactStatus, Modality, enum_values

if TYPE_CHECKING:
    from app.db.models.image import ImageArtifact
    from app.db.models.tag import ArtifactTag


class Artifact(TimestampMixin, Base):
    __tablename__ = "artifacts"
    __table_args__ = (Index("ix_artifacts_title", "title"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    aliases: Mapped[list[str]] = mapped_column(
        JSONB,
        default=list,
        server_default=text("'[]'::jsonb"),
        nullable=False,
    )
    explanation: Mapped[str | None] = mapped_column(Text, nullable=True)
    visual_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    remedies: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB,
        default=list,
        server_default=text("'[]'::jsonb"),
        nullable=False,
    )
    default_modality: Mapped[Modality] = mapped_column(
        Enum(Modality, values_callable=enum_values, name="modality_enum"),
        default=Modality.UNKNOWN,
        nullable=False,
    )
    status: Mapped[ArtifactStatus] = mapped_column(
        Enum(ArtifactStatus, values_callable=enum_values, name="artifact_status_enum"),
        default=ArtifactStatus.DRAFT,
        nullable=False,
    )

    image_links: Mapped[list["ImageArtifact"]] = relationship(
        back_populates="artifact",
        cascade="all, delete-orphan",
    )
    tag_links: Mapped[list["ArtifactTag"]] = relationship(
        back_populates="artifact",
        cascade="all, delete-orphan",
    )

