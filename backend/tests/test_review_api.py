from datetime import UTC, datetime
from uuid import uuid4

from app.api.v1.review import archive_artifact, flag_artifact, reject_artifact, verify_artifact
from app.api.v1.router import api_router
from app.db.models import Artifact, Image, ImageArtifact, ReviewAction, Submission, User
from app.db.models.enums import (
    ArtifactStatus,
    ImageArtifactRelationshipType,
    ImageVisibilityStatus,
    Modality,
    ReviewActionType,
    SubmissionStatus,
    UserRole,
)
from app.schemas.review import ReviewActionRequest


class FakeReviewSession:
    def __init__(self, artifact):
        self.artifact = artifact
        self.added = []
        self.flushes = 0
        self.commits = 0

    def scalar(self, statement):
        return self.artifact

    def add(self, obj):
        self.added.append(obj)

    def flush(self):
        self.flushes += 1
        now = datetime.now(UTC)
        for obj in self.added:
            if getattr(obj, "id", None) is None:
                obj.id = uuid4()
            if hasattr(obj, "created_at") and obj.created_at is None:
                obj.created_at = now

    def commit(self):
        self.commits += 1


def make_user(role=UserRole.REVIEWER):
    return User(
        id=uuid4(),
        email="reviewer@example.org",
        role=role,
        is_active=True,
    )


def make_artifact_with_submission():
    submission = Submission(
        id=uuid4(),
        status=SubmissionStatus.APPROVED,
        permission_confirmed=True,
        pseudonymisation_confirmed=True,
    )
    image = Image(
        id=uuid4(),
        submission=submission,
        modality=Modality.ASL,
        visibility_status=ImageVisibilityStatus.APPROVED_PUBLIC,
    )
    artifact = Artifact(
        id=uuid4(),
        title="Community artifact",
        default_modality=Modality.ASL,
        status=ArtifactStatus.COMMUNITY_PUBLISHED,
    )
    artifact.image_links = [
        ImageArtifact(
            id=uuid4(),
            artifact=artifact,
            image=image,
            relationship_type=ImageArtifactRelationshipType.PRIMARY,
        )
    ]
    return artifact, image, submission


def review_note(text="Looks good."):
    return ReviewActionRequest(review_note=text)


def test_verify_artifact_marks_osipi_verified_and_records_action():
    artifact, image, submission = make_artifact_with_submission()
    reviewer = make_user()
    db = FakeReviewSession(artifact)

    response = verify_artifact(artifact.id, review_note(), current_user=reviewer, db=db)

    assert artifact.status == ArtifactStatus.OSIPI_VERIFIED
    assert image.visibility_status == ImageVisibilityStatus.APPROVED_PUBLIC
    assert submission.status == SubmissionStatus.APPROVED
    assert response.artifact_status == ArtifactStatus.OSIPI_VERIFIED
    assert response.submission_id == submission.id
    assert response.review_action == ReviewActionType.MARKED_OSIPI_VERIFIED
    action = db.added[0]
    assert isinstance(action, ReviewAction)
    assert action.reviewer_id == reviewer.id
    assert action.review_note == "Looks good."
    assert db.commits == 1


def test_flag_artifact_hides_public_image_and_requests_changes():
    artifact, image, submission = make_artifact_with_submission()
    reviewer = make_user()
    db = FakeReviewSession(artifact)

    response = flag_artifact(
        artifact.id,
        review_note("Needs source details."),
        current_user=reviewer,
        db=db,
    )

    assert artifact.status == ArtifactStatus.FLAGGED
    assert image.visibility_status == ImageVisibilityStatus.PENDING_REVIEW
    assert submission.status == SubmissionStatus.NEEDS_CHANGES
    assert response.review_action == ReviewActionType.REMOVED_FROM_PUBLIC


def test_reject_artifact_removes_artifact_and_submission():
    artifact, image, submission = make_artifact_with_submission()
    reviewer = make_user()
    db = FakeReviewSession(artifact)

    response = reject_artifact(
        artifact.id,
        review_note("Not pseudonymised."),
        current_user=reviewer,
        db=db,
    )

    assert artifact.status == ArtifactStatus.REJECTED
    assert image.visibility_status == ImageVisibilityStatus.REJECTED
    assert submission.status == SubmissionStatus.REJECTED
    assert response.review_action == ReviewActionType.REJECTED


def test_admin_archive_artifact_hides_artifact_without_rejecting_submission():
    artifact, image, submission = make_artifact_with_submission()
    admin = make_user(UserRole.ADMIN)
    db = FakeReviewSession(artifact)

    response = archive_artifact(
        artifact.id,
        review_note("Outdated example."),
        current_user=admin,
        db=db,
    )

    assert artifact.status == ArtifactStatus.ARCHIVED
    assert image.visibility_status == ImageVisibilityStatus.ARCHIVED
    assert submission.status == SubmissionStatus.APPROVED
    assert response.review_action == ReviewActionType.REMOVED_FROM_PUBLIC


def test_review_and_admin_routes_are_registered():
    paths = {route.path for route in api_router.routes}

    assert "/review/artifacts/{artifact_id}/verify" in paths
    assert "/review/artifacts/{artifact_id}/flag" in paths
    assert "/review/artifacts/{artifact_id}/reject" in paths
    assert "/admin/artifacts/{artifact_id}/archive" in paths
