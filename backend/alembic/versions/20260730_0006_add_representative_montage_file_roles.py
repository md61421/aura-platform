"""add representative and montage values to file_role_enum

Revision ID: 20260730_0006
Revises: 20260728_0005
Create Date: 2026-07-30

"""

from alembic import op

# revision identifiers, used by Alembic.
revision = '20260730_0006'
down_revision = '20260728_0005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE file_role_enum ADD VALUE IF NOT EXISTS 'primary_representative'")
    op.execute("ALTER TYPE file_role_enum ADD VALUE IF NOT EXISTS 'representative'")
    op.execute("ALTER TYPE file_role_enum ADD VALUE IF NOT EXISTS 'axial_montage'")
    op.execute("ALTER TYPE file_role_enum ADD VALUE IF NOT EXISTS 'coronal_montage'")
    op.execute("ALTER TYPE file_role_enum ADD VALUE IF NOT EXISTS 'sagittal_montage'")


def downgrade() -> None:
    pass
