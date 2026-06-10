import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base_class import Base
from app.db.mixins import TimestampMixin
from app.db.models.enums import UserRole, enum_values

if TYPE_CHECKING:
    from app.db.models.comment import Comment
    from app.db.models.review import ReviewAction
    from app.db.models.submission import Submission
    from app.db.models.vote import Vote


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    email: Mapped[str | None] = mapped_column(String(320), unique=True, index=True, nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, values_callable=enum_values, name="user_role_enum"),
        default=UserRole.PUBLIC_USER,
        nullable=False,
    )

    submissions: Mapped[list["Submission"]] = relationship(back_populates="submitted_by")
    votes: Mapped[list["Vote"]] = relationship(back_populates="user")
    comments: Mapped[list["Comment"]] = relationship(back_populates="user")
    review_actions: Mapped[list["ReviewAction"]] = relationship(back_populates="reviewer")

