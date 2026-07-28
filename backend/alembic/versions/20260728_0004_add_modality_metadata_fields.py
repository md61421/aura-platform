"""add modality metadata fields table and image modality_metadata column

Revision ID: 20260728_0004
Revises: 20260624_0003
Create Date: 2026-07-28
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260728_0004"
down_revision: Union[str, None] = "20260624_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("images", sa.Column("modality_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.create_table(
        "modality_metadata_fields",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("modality", postgresql.ENUM("ASL", "DSC", "DCE", "IVIM", "MULTI", "UNKNOWN", name="modality_enum", create_type=False), nullable=False),
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("label", sa.String(length=255), nullable=False),
        sa.Column("unit", sa.String(length=50), nullable=True),
        sa.Column("field_type", sa.String(length=50), server_default="text", nullable=False),
        sa.Column("is_required", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("example", sa.String(length=255), nullable=True),
        sa.Column("display_order", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_modality_metadata_fields_modality", "modality_metadata_fields", ["modality"])
    op.create_index("ix_modality_metadata_fields_key", "modality_metadata_fields", ["key"])


def downgrade() -> None:
    op.drop_index("ix_modality_metadata_fields_key", table_name="modality_metadata_fields")
    op.drop_index("ix_modality_metadata_fields_modality", table_name="modality_metadata_fields")
    op.drop_table("modality_metadata_fields")
    op.drop_column("images", "modality_metadata")
