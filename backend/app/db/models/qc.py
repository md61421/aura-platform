import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import Enum, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.db.mixins import CreatedAtMixin
from app.db.models.enums import QualityFlag, enum_values

if TYPE_CHECKING:
    from app.db.models.image import Image


class QCResult(CreatedAtMixin, Base):
    __tablename__ = "qc_results"
    __table_args__ = (Index("ix_qc_results_image_id", "image_id"),)

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
    source_tool: Mapped[str | None] = mapped_column(String(255), nullable=True)
    metrics: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        server_default=text("'{}'::jsonb"),
        nullable=False,
    )
    quality_flag: Mapped[QualityFlag] = mapped_column(
        Enum(QualityFlag, values_callable=enum_values, name="quality_flag_enum"),
        default=QualityFlag.UNKNOWN,
        nullable=False,
    )

    image: Mapped["Image"] = relationship(back_populates="qc_results")

