from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import Text, cast, false, func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.dependencies import get_db_session
from app.core.exceptions import not_found_exception
from app.core.workflow import PUBLIC_ARTIFACT_STATUSES
from app.db.models import Artifact, ArtifactTag, Image, ImageArtifact, Tag
from app.db.models.enums import ArtifactStatus, ImageVisibilityStatus, Modality
from app.schemas.artifact import (
    ArtifactDetailRead,
    ArtifactSummaryRead,
    PublicImageFileRead,
    PublicImageSummaryRead,
)

router = APIRouter()


def _artifact_options():
    return (
        selectinload(Artifact.tag_links).selectinload(ArtifactTag.tag),
        selectinload(Artifact.image_links)
        .selectinload(ImageArtifact.image)
        .selectinload(Image.submission),
        selectinload(Artifact.image_links)
        .selectinload(ImageArtifact.image)
        .selectinload(Image.files),
    )


def _tag_names(artifact: Artifact) -> list[str]:
    return sorted(
        tag_link.tag.name
        for tag_link in artifact.tag_links
        if tag_link.tag and tag_link.tag.is_active
    )


def _artifact_summary(artifact: Artifact) -> ArtifactSummaryRead:
    submitter_notes = None
    for image_link in artifact.image_links:
        if image_link.image and image_link.image.submission and image_link.image.submission.submitter_notes:
            submitter_notes = image_link.image.submission.submitter_notes
            break

    return ArtifactSummaryRead(
        id=artifact.id,
        title=artifact.title,
        aliases=artifact.aliases,
        explanation=artifact.explanation,
        visual_description=artifact.visual_description,
        default_modality=artifact.default_modality,
        status=artifact.status,
        tags=_tag_names(artifact),
        images=_public_image_summaries(artifact),
        submitter_notes=submitter_notes,
        created_at=artifact.created_at,
        updated_at=artifact.updated_at,
    )


def _public_image_summaries(artifact: Artifact) -> list[PublicImageSummaryRead]:
    summaries: list[PublicImageSummaryRead] = []
    for image_link in artifact.image_links:
        image = image_link.image
        if not image or image.visibility_status != ImageVisibilityStatus.APPROVED_PUBLIC:
            continue

        role_priority = {
            "primary_representative": 0,
            "representative": 1,
            "thumbnail": 2,
            "other": 3,
            "axial_montage": 4,
            "coronal_montage": 5,
            "sagittal_montage": 6,
        }

        public_files = sorted(
            [
                PublicImageFileRead(
                    id=image_file.id,
                    file_role=image_file.file_role.value,
                    file_type=image_file.file_type.value,
                    public_url=image_file.public_url,
                )
                for image_file in image.files
                if image_file.is_public and image_file.public_url
            ],
            key=lambda f: role_priority.get(f.file_role, 99),
        )

        summaries.append(
            PublicImageSummaryRead(
                id=image.id,
                title=image.title,
                caption=image.caption,
                modality=image.modality,
                vendor=image.vendor,
                sequence=image.sequence,
                protocol=image.protocol,
                field_strength=image.field_strength,
                reliability_score=image.reliability_score,
                relationship_type=image_link.relationship_type.value,
                files=public_files,
            )
        )

    return summaries


def _artifact_detail(artifact: Artifact) -> ArtifactDetailRead:
    summary = _artifact_summary(artifact)
    return ArtifactDetailRead(
        **summary.model_dump(),
        remedies=artifact.remedies,
    )


@router.get("", response_model=list[ArtifactSummaryRead])
def list_artifacts(
    db: Session = Depends(get_db_session),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=20, ge=1, le=100),
    search: str | None = Query(default=None),
    modality: Modality | None = Query(default=None),
    status: ArtifactStatus | None = Query(default=None),
    tag: str | None = Query(default=None),
):
    statement = select(Artifact).options(*_artifact_options())

    if status:
        statement = statement.where(
            Artifact.status == status if status in PUBLIC_ARTIFACT_STATUSES else false()
        )
    else:
        statement = statement.where(Artifact.status.in_(PUBLIC_ARTIFACT_STATUSES))
    if modality:
        statement = statement.where(Artifact.default_modality == modality)
    if tag:
        statement = statement.where(
            Artifact.tag_links.any(
                ArtifactTag.tag.has(func.lower(Tag.name) == tag.strip().lower())
            )
        )
    if search:
        search_pattern = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                Artifact.title.ilike(search_pattern),
                Artifact.explanation.ilike(search_pattern),
                Artifact.visual_description.ilike(search_pattern),
                cast(Artifact.aliases, Text).ilike(search_pattern),
            )
        )

    statement = statement.order_by(Artifact.title).offset(skip).limit(limit)
    artifacts = db.scalars(statement).unique().all()
    return [_artifact_summary(artifact) for artifact in artifacts]


@router.get("/{artifact_id}", response_model=ArtifactDetailRead)
def get_artifact(
    artifact_id: UUID,
    db: Session = Depends(get_db_session),
):
    statement = (
        select(Artifact)
        .where(Artifact.id == artifact_id)
        .where(Artifact.status.in_(PUBLIC_ARTIFACT_STATUSES))
        .options(*_artifact_options())
    )
    artifact = db.scalar(statement)
    if not artifact:
        raise not_found_exception("Artifact")

    return _artifact_detail(artifact)
