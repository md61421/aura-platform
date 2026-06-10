"""initial AURA database schema

Revision ID: 20260606_0001
Revises:
Create Date: 2026-06-06
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260606_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


user_role_enum = postgresql.ENUM(
    "public_user",
    "contributor",
    "reviewer",
    "admin",
    name="user_role_enum",
    create_type=False,
)
modality_enum = postgresql.ENUM(
    "ASL",
    "DSC",
    "DCE",
    "IVIM",
    "MULTI",
    "ALL",
    "UNKNOWN",
    name="modality_enum",
    create_type=False,
)
artifact_status_enum = postgresql.ENUM(
    "draft",
    "approved",
    "archived",
    name="artifact_status_enum",
    create_type=False,
)
submission_status_enum = postgresql.ENUM(
    "pending_review",
    "needs_changes",
    "approved",
    "rejected",
    "withdrawn",
    name="submission_status_enum",
    create_type=False,
)
image_visibility_status_enum = postgresql.ENUM(
    "private_staging",
    "pending_review",
    "approved_public",
    "rejected",
    "archived",
    name="image_visibility_status_enum",
    create_type=False,
)
image_artifact_relationship_type_enum = postgresql.ENUM(
    "primary",
    "secondary",
    "suspected",
    name="image_artifact_relationship_type_enum",
    create_type=False,
)
file_role_enum = postgresql.ENUM(
    "perfusion",
    "structural",
    "m0",
    "control",
    "label",
    "thumbnail",
    "mask",
    "overlay",
    "other",
    name="file_role_enum",
    create_type=False,
)
file_type_enum = postgresql.ENUM(
    "nifti",
    "dicom",
    "jpg",
    "png",
    "nii_gz",
    "other",
    name="file_type_enum",
    create_type=False,
)
storage_provider_enum = postgresql.ENUM(
    "aws_s3",
    "azure_blob",
    "local_dev",
    "other",
    name="storage_provider_enum",
    create_type=False,
)
tag_type_enum = postgresql.ENUM(
    "visual_symptom",
    "artifact_category",
    "asl_specific",
    "dce_specific",
    "dsc_specific",
    "ivim_specific",
    "hardware",
    "patient_induced",
    "sequence",
    "other",
    name="tag_type_enum",
    create_type=False,
)
vote_type_enum = postgresql.ENUM("agree", "disagree", name="vote_type_enum", create_type=False)
comment_status_enum = postgresql.ENUM(
    "visible",
    "hidden",
    "flagged",
    "deleted",
    name="comment_status_enum",
    create_type=False,
)
review_action_type_enum = postgresql.ENUM(
    "approved",
    "rejected",
    "requested_changes",
    "marked_osipi_verified",
    "removed_from_public",
    name="review_action_type_enum",
    create_type=False,
)
quality_flag_enum = postgresql.ENUM(
    "pass",
    "warning",
    "fail",
    "unknown",
    name="quality_flag_enum",
    create_type=False,
)


def upgrade() -> None:
    bind = op.get_bind()
    user_role_enum.create(bind, checkfirst=True)
    modality_enum.create(bind, checkfirst=True)
    artifact_status_enum.create(bind, checkfirst=True)
    submission_status_enum.create(bind, checkfirst=True)
    image_visibility_status_enum.create(bind, checkfirst=True)
    image_artifact_relationship_type_enum.create(bind, checkfirst=True)
    file_role_enum.create(bind, checkfirst=True)
    file_type_enum.create(bind, checkfirst=True)
    storage_provider_enum.create(bind, checkfirst=True)
    tag_type_enum.create(bind, checkfirst=True)
    vote_type_enum.create(bind, checkfirst=True)
    comment_status_enum.create(bind, checkfirst=True)
    review_action_type_enum.create(bind, checkfirst=True)
    quality_flag_enum.create(bind, checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=True),
        sa.Column("email", sa.String(length=320), nullable=True),
        sa.Column("role", user_role_enum, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False)

    op.create_table(
        "artifacts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("aliases", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("explanation", sa.Text(), nullable=True),
        sa.Column("visual_description", sa.Text(), nullable=True),
        sa.Column("remedies", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("default_modality", modality_enum, nullable=False),
        sa.Column("status", artifact_status_enum, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_artifacts_title", "artifacts", ["title"], unique=False)

    op.create_table(
        "submissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submitted_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("contact_email", sa.String(length=320), nullable=True),
        sa.Column("status", submission_status_enum, nullable=False),
        sa.Column("permission_confirmed", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("pseudonymisation_confirmed", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("submitter_notes", sa.Text(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["submitted_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_submissions_status", "submissions", ["status"], unique=False)

    op.create_table(
        "tags",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("tag_type", tag_type_enum, nullable=False),
        sa.Column("modality_scope", modality_enum, nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )
    op.create_index("ix_tags_name", "tags", ["name"], unique=False)

    op.create_table(
        "images",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=True),
        sa.Column("caption", sa.Text(), nullable=True),
        sa.Column("modality", modality_enum, nullable=False),
        sa.Column("vendor", sa.String(length=120), nullable=True),
        sa.Column("sequence", sa.String(length=120), nullable=True),
        sa.Column("protocol", sa.String(length=255), nullable=True),
        sa.Column("field_strength", sa.String(length=50), nullable=True),
        sa.Column("visibility_status", image_visibility_status_enum, nullable=False),
        sa.Column("reliability_score", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_images_modality", "images", ["modality"], unique=False)
    op.create_index("ix_images_sequence", "images", ["sequence"], unique=False)
    op.create_index("ix_images_vendor", "images", ["vendor"], unique=False)
    op.create_index("ix_images_visibility_status", "images", ["visibility_status"], unique=False)

    op.create_table(
        "artifact_tags",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("artifact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tag_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["artifact_id"], ["artifacts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["tag_id"], ["tags.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_artifact_tags_artifact_id", "artifact_tags", ["artifact_id"], unique=False)
    op.create_index("ix_artifact_tags_tag_id", "artifact_tags", ["tag_id"], unique=False)
    op.create_index("uq_artifact_tags_artifact_tag", "artifact_tags", ["artifact_id", "tag_id"], unique=True)

    op.create_table(
        "image_artifacts",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("image_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("artifact_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("relationship_type", image_artifact_relationship_type_enum, nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["artifact_id"], ["artifacts.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["image_id"], ["images.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_image_artifacts_artifact_id", "image_artifacts", ["artifact_id"], unique=False)
    op.create_index("ix_image_artifacts_image_id", "image_artifacts", ["image_id"], unique=False)
    op.create_index(
        "uq_image_artifacts_one_primary_per_image",
        "image_artifacts",
        ["image_id"],
        unique=True,
        postgresql_where=sa.text("relationship_type = 'primary'"),
    )

    op.create_table(
        "image_files",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("image_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("file_role", file_role_enum, nullable=False),
        sa.Column("file_type", file_type_enum, nullable=False),
        sa.Column("storage_provider", storage_provider_enum, nullable=False),
        sa.Column("storage_bucket", sa.String(length=255), nullable=False),
        sa.Column("storage_key", sa.String(length=1024), nullable=False),
        sa.Column("public_url", sa.String(length=2048), nullable=True),
        sa.Column("is_public", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("file_size_mb", sa.Float(), nullable=True),
        sa.Column("checksum", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["image_id"], ["images.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_image_files_file_role", "image_files", ["file_role"], unique=False)
    op.create_index("ix_image_files_image_id", "image_files", ["image_id"], unique=False)
    op.create_index("ix_image_files_storage_key", "image_files", ["storage_key"], unique=False)

    op.create_table(
        "votes",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("image_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("vote_type", vote_type_enum, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["image_id"], ["images.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_votes_image_id", "votes", ["image_id"], unique=False)
    op.create_index("ix_votes_user_id", "votes", ["user_id"], unique=False)
    op.create_index(
        "uq_votes_one_vote_per_user_per_image",
        "votes",
        ["image_id", "user_id"],
        unique=True,
        postgresql_where=sa.text("user_id IS NOT NULL"),
    )

    op.create_table(
        "comments",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("image_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("author_name", sa.String(length=255), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("status", comment_status_enum, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["image_id"], ["images.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_comments_image_id", "comments", ["image_id"], unique=False)
    op.create_index("ix_comments_status", "comments", ["status"], unique=False)

    op.create_table(
        "review_actions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("submission_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("reviewer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("action", review_action_type_enum, nullable=False),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["reviewer_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_review_actions_reviewer_id", "review_actions", ["reviewer_id"], unique=False)
    op.create_index("ix_review_actions_submission_id", "review_actions", ["submission_id"], unique=False)

    op.create_table(
        "qc_results",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("image_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("source_tool", sa.String(length=255), nullable=True),
        sa.Column("metrics", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column("quality_flag", quality_flag_enum, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["image_id"], ["images.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_qc_results_image_id", "qc_results", ["image_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_qc_results_image_id", table_name="qc_results")
    op.drop_table("qc_results")
    op.drop_index("ix_review_actions_submission_id", table_name="review_actions")
    op.drop_index("ix_review_actions_reviewer_id", table_name="review_actions")
    op.drop_table("review_actions")
    op.drop_index("ix_comments_status", table_name="comments")
    op.drop_index("ix_comments_image_id", table_name="comments")
    op.drop_table("comments")
    op.drop_index("uq_votes_one_vote_per_user_per_image", table_name="votes")
    op.drop_index("ix_votes_user_id", table_name="votes")
    op.drop_index("ix_votes_image_id", table_name="votes")
    op.drop_table("votes")
    op.drop_index("ix_image_files_storage_key", table_name="image_files")
    op.drop_index("ix_image_files_image_id", table_name="image_files")
    op.drop_index("ix_image_files_file_role", table_name="image_files")
    op.drop_table("image_files")
    op.drop_index("uq_image_artifacts_one_primary_per_image", table_name="image_artifacts")
    op.drop_index("ix_image_artifacts_image_id", table_name="image_artifacts")
    op.drop_index("ix_image_artifacts_artifact_id", table_name="image_artifacts")
    op.drop_table("image_artifacts")
    op.drop_index("uq_artifact_tags_artifact_tag", table_name="artifact_tags")
    op.drop_index("ix_artifact_tags_tag_id", table_name="artifact_tags")
    op.drop_index("ix_artifact_tags_artifact_id", table_name="artifact_tags")
    op.drop_table("artifact_tags")
    op.drop_index("ix_images_visibility_status", table_name="images")
    op.drop_index("ix_images_vendor", table_name="images")
    op.drop_index("ix_images_sequence", table_name="images")
    op.drop_index("ix_images_modality", table_name="images")
    op.drop_table("images")
    op.drop_index("ix_tags_name", table_name="tags")
    op.drop_table("tags")
    op.drop_index("ix_submissions_status", table_name="submissions")
    op.drop_table("submissions")
    op.drop_index("ix_artifacts_title", table_name="artifacts")
    op.drop_table("artifacts")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")

    bind = op.get_bind()
    quality_flag_enum.drop(bind, checkfirst=True)
    review_action_type_enum.drop(bind, checkfirst=True)
    comment_status_enum.drop(bind, checkfirst=True)
    vote_type_enum.drop(bind, checkfirst=True)
    tag_type_enum.drop(bind, checkfirst=True)
    storage_provider_enum.drop(bind, checkfirst=True)
    file_type_enum.drop(bind, checkfirst=True)
    file_role_enum.drop(bind, checkfirst=True)
    image_artifact_relationship_type_enum.drop(bind, checkfirst=True)
    image_visibility_status_enum.drop(bind, checkfirst=True)
    submission_status_enum.drop(bind, checkfirst=True)
    artifact_status_enum.drop(bind, checkfirst=True)
    modality_enum.drop(bind, checkfirst=True)
    user_role_enum.drop(bind, checkfirst=True)
