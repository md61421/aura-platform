"""update artifact status workflow

Revision ID: 20260624_0003
Revises: 20260624_0002
Create Date: 2026-06-24
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20260624_0003"
down_revision: Union[str, None] = "20260624_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE artifact_status_enum ADD VALUE IF NOT EXISTS 'community_published'")
    op.execute("ALTER TYPE artifact_status_enum ADD VALUE IF NOT EXISTS 'osipi_verified'")
    op.execute("ALTER TYPE artifact_status_enum ADD VALUE IF NOT EXISTS 'flagged'")
    op.execute("ALTER TYPE artifact_status_enum ADD VALUE IF NOT EXISTS 'rejected'")


def downgrade() -> None:
    # PostgreSQL cannot drop enum values without recreating the enum type.
    # Keeping the values is safer than rewriting existing artifact rows.
    pass
