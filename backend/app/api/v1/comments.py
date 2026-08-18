from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.dependencies import get_current_user_optional, get_db_session, require_user
from app.core.exceptions import forbidden_exception, not_found_exception
from app.db.models import Artifact, Comment, Image, ImageArtifact, User
from app.db.models.enums import CommentStatus, ImageArtifactRelationshipType, UserRole
from app.schemas.comment import CommentCreateRequest, CommentItemRead

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


@router.get("/artifacts/{artifact_id}/comments", response_model=list[CommentItemRead])
def list_artifact_comments(
    artifact_id: UUID,
    current_user: Annotated[User | None, Depends(get_current_user_optional)] = None,
    db: Session = Depends(get_db_session),
) -> list[CommentItemRead]:
    artifact, image = _get_primary_image_for_artifact(db, artifact_id)

    statement = (
        select(Comment)
        .where(Comment.image_id == image.id)
        .options(selectinload(Comment.user))
        .order_by(Comment.created_at.asc())
    )

    # Filter out deleted/hidden comments unless reviewer or admin
    is_privileged = current_user and current_user.role in {UserRole.REVIEWER, UserRole.ADMIN}
    if not is_privileged:
        statement = statement.where(Comment.status == CommentStatus.VISIBLE)

    comments = db.scalars(statement).all()

    results: list[CommentItemRead] = []
    for comment in comments:
        author_name = comment.author_name
        author_role = None
        if comment.user:
            author_name = comment.user.name or comment.user.email or author_name or "Community Contributor"
            author_role = comment.user.role.value if comment.user.role else None
        elif not author_name:
            author_name = "Community Contributor"

        is_author = bool(current_user and comment.user_id == current_user.id)

        results.append(
            CommentItemRead(
                id=comment.id,
                image_id=comment.image_id,
                user_id=comment.user_id,
                author_name=author_name,
                author_role=author_role,
                body=comment.body,
                status=comment.status,
                created_at=comment.created_at,
                updated_at=comment.updated_at,
                is_author=is_author,
            )
        )

    return results


@router.post(
    "/artifacts/{artifact_id}/comments",
    response_model=CommentItemRead,
    status_code=status.HTTP_201_CREATED,
)
def create_artifact_comment(
    artifact_id: UUID,
    payload: CommentCreateRequest,
    current_user: Annotated[User, Depends(require_user)],
    db: Session = Depends(get_db_session),
) -> CommentItemRead:
    body_clean = payload.body.strip()
    if not body_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Comment body cannot be empty.",
        )

    artifact, image = _get_primary_image_for_artifact(db, artifact_id)

    author_name = current_user.name or current_user.email or "Contributor"
    comment = Comment(
        image_id=image.id,
        user_id=current_user.id,
        author_name=author_name,
        body=body_clean,
        status=CommentStatus.VISIBLE,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    return CommentItemRead(
        id=comment.id,
        image_id=comment.image_id,
        user_id=comment.user_id,
        author_name=author_name,
        author_role=current_user.role.value if current_user.role else None,
        body=comment.body,
        status=comment.status,
        created_at=comment.created_at,
        updated_at=comment.updated_at,
        is_author=True,
    )


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(
    comment_id: UUID,
    current_user: Annotated[User, Depends(require_user)],
    db: Session = Depends(get_db_session),
):
    comment = db.get(Comment, comment_id)
    if not comment:
        raise not_found_exception("Comment")

    is_author = comment.user_id == current_user.id
    is_privileged = current_user.role in {UserRole.REVIEWER, UserRole.ADMIN}

    if not is_author and not is_privileged:
        raise forbidden_exception("You do not have permission to delete this comment.")

    db.delete(comment)
    db.commit()
