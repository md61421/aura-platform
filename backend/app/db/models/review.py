import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.db.mixins import CreatedAtMixin
from app.db.models.enums import ReviewActionType, enum_values

if TYPE_CHECKING:
    from app.db.models.submission import Submission
    from app.db.models.user import User


class ReviewAction(CreatedAtMixin, Base):
    __tablename__ = "review_actions"
    __table_args__ = (
        Index("ix_review_actions_submission_id", "submission_id"),
        Index("ix_review_actions_reviewer_id", "reviewer_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    submission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("submissions.id", ondelete="CASCADE"),
        nullable=False,
    )
    reviewer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    action: Mapped[ReviewActionType] = mapped_column(
        Enum(ReviewActionType, values_callable=enum_values, name="review_action_type_enum"),
        nullable=False,
    )
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)

    submission: Mapped["Submission"] = relationship(back_populates="review_actions")
    reviewer: Mapped["User"] = relationship(back_populates="review_actions")

