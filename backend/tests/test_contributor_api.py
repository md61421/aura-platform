from datetime import UTC, datetime
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.api.v1.contributor import comment_on_image, vote_on_image
from app.api.v1.router import api_router
from app.db.models import Comment, Image, User, Vote
from app.db.models.enums import ImageVisibilityStatus, Modality, UserRole, VoteType
from app.schemas.comment import ContributorCommentCreate
from app.schemas.vote import ContributorVoteCreate


class FakeContributorSession:
    def __init__(self, *, image=None, vote=None):
        self.image = image
        self.vote = vote
        self.scalar_calls = 0
        self.added = []
        self.commits = 0
        self.refreshed = []

    def scalar(self, statement):
        self.scalar_calls += 1
        if self.scalar_calls == 1:
            return self.image
        return self.vote

    def add(self, obj):
        self.added.append(obj)
        if isinstance(obj, Vote):
            self.vote = obj

    def commit(self):
        self.commits += 1

    def refresh(self, obj):
        now = datetime.now(UTC)
        if getattr(obj, "id", None) is None:
            obj.id = uuid4()
        if hasattr(obj, "created_at") and obj.created_at is None:
            obj.created_at = now
        if hasattr(obj, "updated_at") and obj.updated_at is None:
            obj.updated_at = now
        self.refreshed.append(obj)


def make_user(role=UserRole.CONTRIBUTOR):
    return User(
        id=uuid4(),
        name="Contributor Reviewer",
        email="reviewer@example.org",
        role=role,
        is_active=True,
    )


def make_public_image(score=0):
    return Image(
        id=uuid4(),
        modality=Modality.ASL,
        visibility_status=ImageVisibilityStatus.APPROVED_PUBLIC,
        reliability_score=score,
    )


def test_vote_on_image_creates_user_vote_and_updates_score():
    image = make_public_image()
    user = make_user()
    db = FakeContributorSession(image=image)

    vote = vote_on_image(
        image.id,
        ContributorVoteCreate(vote_type=VoteType.AGREE),
        current_user=user,
        db=db,
    )

    assert vote.image_id == image.id
    assert vote.user_id == user.id
    assert vote.vote_type == VoteType.AGREE
    assert image.reliability_score == 1
    assert db.added == [vote]
    assert db.commits == 1


def test_vote_on_image_updates_existing_vote_score_delta():
    image = make_public_image(score=1)
    user = make_user()
    existing_vote = Vote(
        id=uuid4(),
        image_id=image.id,
        user_id=user.id,
        vote_type=VoteType.AGREE,
    )
    db = FakeContributorSession(image=image, vote=existing_vote)

    vote = vote_on_image(
        image.id,
        ContributorVoteCreate(vote_type=VoteType.DISAGREE),
        current_user=user,
        db=db,
    )

    assert vote is existing_vote
    assert vote.vote_type == VoteType.DISAGREE
    assert image.reliability_score == -1
    assert db.added == []
    assert db.commits == 1


def test_comment_on_image_creates_visible_user_comment():
    image = make_public_image()
    user = make_user()
    db = FakeContributorSession(image=image)

    comment = comment_on_image(
        image.id,
        ContributorCommentCreate(body="This example matches my scan."),
        current_user=user,
        db=db,
    )

    assert comment.image_id == image.id
    assert comment.user_id == user.id
    assert comment.author_name == "Contributor Reviewer"
    assert comment.body == "This example matches my scan."
    assert isinstance(comment, Comment)
    assert db.added == [comment]
    assert db.commits == 1


def test_contributor_actions_reject_non_public_image():
    user = make_user()
    db = FakeContributorSession(image=None)

    with pytest.raises(HTTPException) as exc_info:
        vote_on_image(
            uuid4(),
            ContributorVoteCreate(vote_type=VoteType.AGREE),
            current_user=user,
            db=db,
        )

    assert exc_info.value.status_code == 404
    assert exc_info.value.detail == "Public image not found"


def test_contributor_routes_are_registered():
    paths = {route.path for route in api_router.routes}

    assert "/contributor/images/{image_id}/vote" in paths
    assert "/contributor/images/{image_id}/comments" in paths
