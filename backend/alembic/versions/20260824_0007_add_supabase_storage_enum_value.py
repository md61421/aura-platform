"""add supabase_storage to storage_provider_enum

Revision ID: 20260824_0007
Revises: 20260730_0006
Create Date: 2026-08-24

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = '20260824_0007'
down_revision = '20260730_0006'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE storage_provider_enum ADD VALUE IF NOT EXISTS 'supabase_storage'")


def downgrade() -> None:
    pass
