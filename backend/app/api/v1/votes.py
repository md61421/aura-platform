from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session, selectinload

from app.core.dependencies import get_current_user_optional, get_db_session, require_user
from app.core.exceptions import not_found_exception
from app.db.models import Artifact, Image, ImageArtifact, User, Vote
from app.db.models.enums import ImageArtifactRelationshipType, VoteType
from app.schemas.vote import VoteRequest, VoteSummaryRead

router = APIRouter()


def _get_primary_image_for_artifact(db: Session, artifact_id: UUID) -> tuple[Artifact, Image]:
    statement = (
        select(Artifact)
        .where(Artifact.id == artifact_id)
        .options(
            selectinload(Artifact.image_links)
            .selectinload(ImageArtifact.image)
        )
    )
    artifact = db.scalar(statement)
    if not artifact:
        raise not_found_exception("Artifact")

    primary_image = None
    for link in artifact.image_links:
        if link.image and link.relationship_type == ImageArtifactRelationshipType.PRIMARY:
            primary_image = link.image
            break

    if not primary_image and artifact.image_links:
        for link in artifact.image_links:
            if link.image:
                primary_image = link.image
                break

    if not primary_image:
        raise not_found_exception("Artifact image")

    return artifact, primary_image


def _fetch_vote_counts_and_user_vote(
    db: Session,
    image_id: UUID,
    user_id: UUID | None = None,
) -> tuple[int, int, VoteType | None]:
    counts_query = select(
        func.coalesce(func.sum(case((Vote.vote_type == VoteType.AGREE, 1), else_=0)), 0).label("agreements"),
        func.coalesce(func.sum(case((Vote.vote_type == VoteType.DISAGREE, 1), else_=0)), 0).label("disagreements"),
    ).where(Vote.image_id == image_id)

    row = db.execute(counts_query).one()
    agreements_count = int(row.agreements)
    disagreements_count = int(row.disagreements)

    user_vote = None
    if user_id:
        existing_vote = db.scalar(
            select(Vote.vote_type).where(
                Vote.image_id == image_id,
                Vote.user_id == user_id,
            )
        )
        if existing_vote:
            user_vote = existing_vote

    return agreements_count, disagreements_count, user_vote


@router.get("/artifacts/{artifact_id}/vote-summary", response_model=VoteSummaryRead)
def get_artifact_vote_summary(
    artifact_id: UUID,
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
    db: Session = Depends(get_db_session),
) -> VoteSummaryRead:
    artifact, image = _get_primary_image_for_artifact(db, artifact_id)
    agreements, disagreements, user_vote = _fetch_vote_counts_and_user_vote(
        db,
        image.id,
        current_user.id if current_user else None,
    )
    reliability_score = agreements - disagreements

    return VoteSummaryRead(
        artifact_id=artifact.id,
        image_id=image.id,
        agreements=agreements,
        disagreements=disagreements,
        reliability_score=reliability_score,
        user_vote=user_vote,
    )


@router.post(
    "/artifacts/{artifact_id}/vote",
    response_model=VoteSummaryRead,
    status_code=status.HTTP_200_OK,
)
def cast_or_toggle_artifact_vote(
    artifact_id: UUID,
    payload: VoteRequest,
    current_user: Annotated[User, Depends(require_user)],
    db: Session = Depends(get_db_session),
) -> VoteSummaryRead:
    artifact, image = _get_primary_image_for_artifact(db, artifact_id)

    existing_vote = db.scalar(
        select(Vote).where(
            Vote.image_id == image.id,
            Vote.user_id == current_user.id,
        )
    )

    if existing_vote:
        if existing_vote.vote_type == payload.vote_type:
            # Toggle off
            db.delete(existing_vote)
        else:
            # Change vote
            existing_vote.vote_type = payload.vote_type
    else:
        new_vote = Vote(
            image_id=image.id,
            user_id=current_user.id,
            vote_type=payload.vote_type,
        )
        db.add(new_vote)

    db.flush()

    agreements, disagreements, user_vote = _fetch_vote_counts_and_user_vote(
        db,
        image.id,
        current_user.id,
    )
    image.reliability_score = agreements - disagreements
    db.commit()

    return VoteSummaryRead(
        artifact_id=artifact.id,
        image_id=image.id,
        agreements=agreements,
        disagreements=disagreements,
        reliability_score=image.reliability_score,
        user_vote=user_vote,
    )
