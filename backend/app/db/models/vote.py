import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.db.mixins import CreatedAtMixin
from app.db.models.enums import VoteType, enum_values

if TYPE_CHECKING:
    from app.db.models.image import Image
    from app.db.models.user import User


class Vote(CreatedAtMixin, Base):
    __tablename__ = "votes"
    __table_args__ = (
        Index("ix_votes_image_id", "image_id"),
        Index("ix_votes_user_id", "user_id"),
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
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    vote_type: Mapped[VoteType] = mapped_column(
        Enum(VoteType, values_callable=enum_values, name="vote_type_enum"),
        nullable=False,
    )

    image: Mapped["Image"] = relationship(back_populates="votes")
    user: Mapped["User | None"] = relationship(back_populates="votes")


Index(
    "uq_votes_one_vote_per_user_per_image",
    Vote.image_id,
    Vote.user_id,
    unique=True,
    postgresql_where=Vote.user_id.is_not(None),
)
