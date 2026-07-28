from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_db_session, require_contributor
from app.core.exceptions import not_found_exception
from app.core.workflow import PUBLIC_ARTIFACT_STATUSES
from app.db.models import Artifact, Comment, Image, ImageArtifact, User, Vote
from app.db.models.enums import CommentStatus, ImageVisibilityStatus, VoteType
from app.schemas.comment import CommentRead, ContributorCommentCreate
from app.schemas.vote import ContributorVoteCreate, VoteRead

router = APIRouter()


def _public_image_statement(image_id: UUID):
    return (
        select(Image)
        .join(ImageArtifact, ImageArtifact.image_id == Image.id)
        .join(Artifact, Artifact.id == ImageArtifact.artifact_id)
        .where(Image.id == image_id)
        .where(Image.visibility_status == ImageVisibilityStatus.APPROVED_PUBLIC)
        .where(Artifact.status.in_(PUBLIC_ARTIFACT_STATUSES))
    )


def _get_public_image(db: Session, image_id: UUID) -> Image:
    image = db.scalar(_public_image_statement(image_id))
    if not image:
        raise not_found_exception("Public image")
    return image


def _vote_score(vote_type: VoteType) -> int:
    return 1 if vote_type == VoteType.AGREE else -1


def _display_name(user: User) -> str | None:
    return user.name or user.email


@router.post(
    "/images/{image_id}/vote",
    response_model=VoteRead,
    status_code=status.HTTP_200_OK,
)
def vote_on_image(
    image_id: UUID,
    payload: ContributorVoteCreate,
    current_user: Annotated[User, Depends(require_contributor)],
    db: Session = Depends(get_db_session),
) -> Vote:
    image = _get_public_image(db, image_id)
    vote = db.scalar(
        select(Vote).where(Vote.image_id == image.id, Vote.user_id == current_user.id)
    )

    if vote:
        old_score = _vote_score(vote.vote_type)
        new_score = _vote_score(payload.vote_type)
        vote.vote_type = payload.vote_type
        image.reliability_score = (image.reliability_score or 0) + new_score - old_score
    else:
        vote = Vote(
            image_id=image.id,
            user_id=current_user.id,
            vote_type=payload.vote_type,
        )
        image.reliability_score = (image.reliability_score or 0) + _vote_score(payload.vote_type)
        db.add(vote)

    db.commit()
    db.refresh(vote)
    return vote


@router.post(
    "/images/{image_id}/comments",
    response_model=CommentRead,
    status_code=status.HTTP_201_CREATED,
)
def comment_on_image(
    image_id: UUID,
    payload: ContributorCommentCreate,
    current_user: Annotated[User, Depends(require_contributor)],
    db: Session = Depends(get_db_session),
) -> Comment:
    image = _get_public_image(db, image_id)
    comment = Comment(
        image_id=image.id,
        user_id=current_user.id,
        author_name=_display_name(current_user),
        body=payload.body.strip(),
        status=CommentStatus.VISIBLE,
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment
