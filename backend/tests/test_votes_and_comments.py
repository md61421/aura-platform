from datetime import UTC, datetime
from uuid import uuid4

import pytest
from fastapi import HTTPException

from app.api.v1 import comments, votes
from app.db.models import Artifact, Comment, Image, ImageArtifact, User, Vote
from app.db.models.enums import (
    ArtifactStatus,
    CommentStatus,
    ImageArtifactRelationshipType,
    ImageVisibilityStatus,
    Modality,
    UserRole,
    VoteType,
)
from app.schemas.comment import CommentCreateRequest
from app.schemas.vote import VoteRequest


class FakeVotesSession:
    def __init__(self, artifact=None, image=None, votes_list=None, comments_list=None):
        self.artifact = artifact
        self.image = image
        self.votes = list(votes_list or [])
        self.comments = list(comments_list or [])
        self.added = []
        self.deleted = []
        self.committed = False

    def execute(self, statement):
        class Row:
            def __init__(self, agreements, disagreements):
                self.agreements = agreements
                self.disagreements = disagreements

        class Result:
            def __init__(self, row):
                self._row = row

            def one(self):
                return self._row

        agreements = sum(1 for v in self.votes if v.vote_type == VoteType.AGREE)
        disagreements = sum(1 for v in self.votes if v.vote_type == VoteType.DISAGREE)
        return Result(Row(agreements, disagreements))

    def scalar(self, statement):
        statement_str = str(statement).lower()
        if "artifacts" in statement_str:
            return self.artifact
        if "votes" in statement_str:
            params = statement.compile().params
            user_id = next((v for k, v in params.items() if "user_id" in k), None)
            for v in self.votes:
                if user_id is None or v.user_id == user_id:
                    if "votes.vote_type" in statement_str and "select votes.vote_type" in statement_str:
                        return v.vote_type
                    return v
            return None
        return None

    def scalars(self, statement):
        class ScalarResult:
            def __init__(self, items):
                self._items = items

            def all(self):
                return self._items

        return ScalarResult(self.comments)

    def get(self, model, id):
        if model == Comment:
            for c in self.comments:
                if c.id == id:
                    return c
        return None

    def add(self, obj):
        if isinstance(obj, Vote):
            self.votes.append(obj)
        elif isinstance(obj, Comment):
            if not getattr(obj, "id", None):
                obj.id = uuid4()
            if not getattr(obj, "created_at", None):
                obj.created_at = datetime.now(UTC)
            if not getattr(obj, "updated_at", None):
                obj.updated_at = datetime.now(UTC)
            self.comments.append(obj)
        self.added.append(obj)

    def delete(self, obj):
        if obj in self.votes:
            self.votes.remove(obj)
        if obj in self.comments:
            self.comments.remove(obj)
        self.deleted.append(obj)

    def flush(self):
        pass

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        pass


def _make_test_artifact_and_image():
    artifact_id = uuid4()
    image_id = uuid4()
    image = Image(
        id=image_id,
        title="Test Image",
        modality=Modality.ASL,
        visibility_status=ImageVisibilityStatus.APPROVED_PUBLIC,
        reliability_score=0,
        files=[],
        votes=[],
    )
    artifact = Artifact(
        id=artifact_id,
        title="Patient Motion",
        default_modality=Modality.ASL,
        status=ArtifactStatus.OSIPI_VERIFIED,
        image_links=[
            ImageArtifact(
                artifact_id=artifact_id,
                image_id=image_id,
                relationship_type=ImageArtifactRelationshipType.PRIMARY,
                image=image,
            )
        ],
    )
    return artifact, image


def test_get_artifact_vote_summary():
    artifact, image = _make_test_artifact_and_image()
    db = FakeVotesSession(artifact=artifact, image=image)

    summary = votes.get_artifact_vote_summary(artifact.id, current_user=None, db=db)
    assert summary.artifact_id == artifact.id
    assert summary.image_id == image.id
    assert summary.agreements == 0
    assert summary.disagreements == 0
    assert summary.reliability_score == 0
    assert summary.user_vote is None


def test_cast_and_toggle_vote():
    artifact, image = _make_test_artifact_and_image()
    user = User(id=uuid4(), email="tester@example.com", role=UserRole.CONTRIBUTOR)
    db = FakeVotesSession(artifact=artifact, image=image)

    # Cast agree vote
    payload = VoteRequest(vote_type=VoteType.AGREE)
    res1 = votes.cast_or_toggle_artifact_vote(artifact.id, payload, current_user=user, db=db)
    assert res1.agreements == 1
    assert res1.disagreements == 0
    assert res1.reliability_score == 1
    assert db.committed is True

    # Cast same vote -> toggle off
    res2 = votes.cast_or_toggle_artifact_vote(artifact.id, payload, current_user=user, db=db)
    assert res2.agreements == 0
    assert res2.disagreements == 0
    assert res2.reliability_score == 0


def test_create_and_list_comments():
    artifact, image = _make_test_artifact_and_image()
    user = User(id=uuid4(), name="Dr. Smith", email="smith@hospital.org", role=UserRole.REVIEWER)
    db = FakeVotesSession(artifact=artifact, image=image)

    # Create comment
    payload = CommentCreateRequest(body="Verified on 3T Prisma.")
    comment_res = comments.create_artifact_comment(artifact.id, payload, current_user=user, db=db)
    assert comment_res.body == "Verified on 3T Prisma."
    assert comment_res.author_name == "Dr. Smith"
    assert comment_res.author_role == "reviewer"
    assert comment_res.is_author is True

    # List comments
    comment_list = comments.list_artifact_comments(artifact.id, current_user=user, db=db)
    assert len(comment_list) == 1
    assert comment_list[0].body == "Verified on 3T Prisma."


def test_delete_comment_permissions():
    artifact, image = _make_test_artifact_and_image()
    author_user = User(id=uuid4(), email="author@example.com", role=UserRole.CONTRIBUTOR)
    other_user = User(id=uuid4(), email="other@example.com", role=UserRole.CONTRIBUTOR)
    admin_user = User(id=uuid4(), email="admin@osipi.org", role=UserRole.ADMIN)

    comment = Comment(
        id=uuid4(),
        image_id=image.id,
        user_id=author_user.id,
        author_name="Author",
        body="Some observation",
        status=CommentStatus.VISIBLE,
    )
    db = FakeVotesSession(artifact=artifact, image=image, comments_list=[comment])

    # Other non-author user cannot delete
    with pytest.raises(HTTPException) as exc_info:
        comments.delete_comment(comment.id, current_user=other_user, db=db)
    assert exc_info.value.status_code == 403

    # Admin user can delete
    comments.delete_comment(comment.id, current_user=admin_user, db=db)
    assert comment not in db.comments
