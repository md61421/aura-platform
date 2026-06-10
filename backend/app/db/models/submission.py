import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.db.mixins import TimestampMixin
from app.db.models.enums import SubmissionStatus, enum_values

if TYPE_CHECKING:
    from app.db.models.image import Image
    from app.db.models.review import ReviewAction
    from app.db.models.user import User


class Submission(TimestampMixin, Base):
    __tablename__ = "submissions"
    __table_args__ = (Index("ix_submissions_status", "status"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    submitted_by_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    contact_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    status: Mapped[SubmissionStatus] = mapped_column(
        Enum(SubmissionStatus, values_callable=enum_values, name="submission_status_enum"),
        default=SubmissionStatus.PENDING_REVIEW,
        nullable=False,
    )
    permission_confirmed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=text("false"),
        nullable=False,
    )
    pseudonymisation_confirmed: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=text("false"),
        nullable=False,
    )
    submitter_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    submitted_by: Mapped["User | None"] = relationship(back_populates="submissions")
    images: Mapped[list["Image"]] = relationship(back_populates="submission")
    review_actions: Mapped[list["ReviewAction"]] = relationship(
        back_populates="submission",
        cascade="all, delete-orphan",
    )
