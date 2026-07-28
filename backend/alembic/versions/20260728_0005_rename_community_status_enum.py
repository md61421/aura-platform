"""rename community published enum to contributor published

Revision ID: 20260728_0005
Revises: 20260728_0004
Create Date: 2026-07-28
"""
from typing import Sequence, Union

from alembic import op


revision: str = "20260728_0005"
down_revision: Union[str, None] = "20260728_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("COMMIT")
    op.execute("ALTER TYPE artifact_status_enum ADD VALUE IF NOT EXISTS 'contributor_published'")
    op.execute("COMMIT")
    op.execute("UPDATE artifacts SET status = 'contributor_published' WHERE status = 'community_published'")


def downgrade() -> None:
    op.execute("UPDATE artifacts SET status = 'community_published' WHERE status = 'contributor_published'")
