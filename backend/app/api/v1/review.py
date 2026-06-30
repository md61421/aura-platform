from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.dependencies import get_db_session, require_admin, require_reviewer
from app.core.exceptions import not_found_exception
from app.db.models import Artifact, Image, ImageArtifact, ReviewAction, Submission, User
from app.db.models.enums import (
    ArtifactStatus,
    ImageVisibilityStatus,
    ReviewActionType,
    SubmissionStatus,
)
from app.schemas.review import ArtifactModerationRead, ReviewActionRequest

review_router = APIRouter()
admin_router = APIRouter()


def _artifact_statement(artifact_id: UUID):
    return (
        select(Artifact)
        .where(Artifact.id == artifact_id)
        .options(
            selectinload(Artifact.image_links)
            .selectinload(ImageArtifact.image)
            .selectinload(Image.submission)
        )
    )


def _get_artifact(db: Session, artifact_id: UUID) -> Artifact:
    artifact = db.scalar(_artifact_statement(artifact_id))
    if not artifact:
        raise not_found_exception("Artifact")
    return artifact


def _linked_images(artifact: Artifact) -> list[Image]:
    return [image_link.image for image_link in artifact.image_links if image_link.image]


def _submission_for_artifact(artifact: Artifact) -> Submission | None:
    for image in _linked_images(artifact):
        if image.submission:
            return image.submission
    return None


def _set_image_visibility(artifact: Artifact, visibility_status: ImageVisibilityStatus) -> None:
    for image in _linked_images(artifact):
        image.visibility_status = visibility_status


def _add_review_action(
    db: Session,
    submission: Submission | None,
    reviewer: User,
    action: ReviewActionType,
    review_note: str | None,
) -> ReviewAction | None:
    if not submission:
        return None

    review_action = ReviewAction(
        submission_id=submission.id,
        reviewer_id=reviewer.id,
        action=action,
        review_note=review_note.strip() if review_note else None,
    )
    db.add(review_action)
    return review_action


def _moderate_artifact(
    db: Session,
    artifact_id: UUID,
    reviewer: User,
    payload: ReviewActionRequest,
    *,
    artifact_status: ArtifactStatus,
    image_visibility_status: ImageVisibilityStatus,
    review_action_type: ReviewActionType,
    submission_status: SubmissionStatus | None = None,
) -> ArtifactModerationRead:
    artifact = _get_artifact(db, artifact_id)
    submission = _submission_for_artifact(artifact)
    reviewed_at = datetime.now(UTC)

    artifact.status = artifact_status
    _set_image_visibility(artifact, image_visibility_status)

    if submission and submission_status:
        submission.status = submission_status
        submission.reviewed_at = reviewed_at
    elif submission:
        submission.reviewed_at = reviewed_at

    review_action = _add_review_action(
        db,
        submission,
        reviewer,
        review_action_type,
        payload.review_note,
    )
    db.flush()
    db.commit()

    return ArtifactModerationRead(
        artifact_id=artifact.id,
        artifact_status=artifact.status,
        submission_id=submission.id if submission else None,
        submission_status=submission.status if submission else None,
        review_action_id=review_action.id if review_action else None,
        review_action=review_action.action if review_action else None,
        reviewed_at=submission.reviewed_at if submission else None,
    )


@review_router.post(
    "/artifacts/{artifact_id}/verify",
    response_model=ArtifactModerationRead,
    status_code=status.HTTP_200_OK,
)
def verify_artifact(
    artifact_id: UUID,
    payload: ReviewActionRequest,
    current_user: Annotated[User, Depends(require_reviewer)],
    db: Session = Depends(get_db_session),
) -> ArtifactModerationRead:
    return _moderate_artifact(
        db,
        artifact_id,
        current_user,
        payload,
        artifact_status=ArtifactStatus.OSIPI_VERIFIED,
        image_visibility_status=ImageVisibilityStatus.APPROVED_PUBLIC,
        review_action_type=ReviewActionType.MARKED_OSIPI_VERIFIED,
        submission_status=SubmissionStatus.APPROVED,
    )


@review_router.post(
    "/artifacts/{artifact_id}/flag",
    response_model=ArtifactModerationRead,
    status_code=status.HTTP_200_OK,
)
def flag_artifact(
    artifact_id: UUID,
    payload: ReviewActionRequest,
    current_user: Annotated[User, Depends(require_reviewer)],
    db: Session = Depends(get_db_session),
) -> ArtifactModerationRead:
    return _moderate_artifact(
        db,
        artifact_id,
        current_user,
        payload,
        artifact_status=ArtifactStatus.FLAGGED,
        image_visibility_status=ImageVisibilityStatus.PENDING_REVIEW,
        review_action_type=ReviewActionType.REMOVED_FROM_PUBLIC,
        submission_status=SubmissionStatus.NEEDS_CHANGES,
    )


@review_router.post(
    "/artifacts/{artifact_id}/reject",
    response_model=ArtifactModerationRead,
    status_code=status.HTTP_200_OK,
)
def reject_artifact(
    artifact_id: UUID,
    payload: ReviewActionRequest,
    current_user: Annotated[User, Depends(require_reviewer)],
    db: Session = Depends(get_db_session),
) -> ArtifactModerationRead:
    return _moderate_artifact(
        db,
        artifact_id,
        current_user,
        payload,
        artifact_status=ArtifactStatus.REJECTED,
        image_visibility_status=ImageVisibilityStatus.REJECTED,
        review_action_type=ReviewActionType.REJECTED,
        submission_status=SubmissionStatus.REJECTED,
    )


@admin_router.post(
    "/artifacts/{artifact_id}/archive",
    response_model=ArtifactModerationRead,
    status_code=status.HTTP_200_OK,
)
def archive_artifact(
    artifact_id: UUID,
    payload: ReviewActionRequest,
    current_user: Annotated[User, Depends(require_admin)],
    db: Session = Depends(get_db_session),
) -> ArtifactModerationRead:
    return _moderate_artifact(
        db,
        artifact_id,
        current_user,
        payload,
        artifact_status=ArtifactStatus.ARCHIVED,
        image_visibility_status=ImageVisibilityStatus.ARCHIVED,
        review_action_type=ReviewActionType.REMOVED_FROM_PUBLIC,
    )
