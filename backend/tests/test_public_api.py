from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi import HTTPException, UploadFile

from app.api.v1 import artifacts, health, submissions, tags
from app.core.config import settings
from app.db.models import Artifact, ArtifactTag, Image, ImageArtifact, ImageFile, Submission, Tag, User
from app.db.models.enums import (
    ArtifactStatus,
    FileRole,
    FileType,
    ImageArtifactRelationshipType,
    ImageVisibilityStatus,
    Modality,
    StorageProvider,
    SubmissionStatus,
    UserRole,
)


class FakeScalarResult:
    def __init__(self, items):
        self.items = items

    def unique(self):
        return self

    def all(self):
        return self.items


class FakeReadSession:
    def __init__(self, *, scalars_items=None, scalar_item=None):
        self.scalars_items = scalars_items or []
        self.scalar_item = scalar_item
        self.executed = False

    def execute(self, statement):
        self.executed = True

    def scalars(self, statement):
        return FakeScalarResult(self.scalars_items)

    def scalar(self, statement):
        return self.scalar_item


class FakeWriteSession:
    def __init__(self):
        self.objects = []
        self.committed = False
        self.rolled_back = False

    def scalar(self, statement):
        return None

    def add_all(self, objects):
        self.objects.extend(objects)

    def add(self, obj):
        self.objects.append(obj)

    def flush(self):
        now = datetime.now(UTC)
        for obj in self.objects:
            if hasattr(obj, "id") and obj.id is None:
                obj.id = uuid4()
            if hasattr(obj, "created_at") and obj.created_at is None:
                obj.created_at = now
            if hasattr(obj, "updated_at") and obj.updated_at is None:
                obj.updated_at = now

    def commit(self):
        self.committed = True

    def refresh(self, obj):
        self.flush()

    def rollback(self):
        self.rolled_back = True


class FakeRequest:
    def url_for(self, name, **path_params):
        assert name == "local_upload"
        return f"http://testserver/uploads/{path_params['path']}"


def make_artifact(**overrides):
    now = datetime.now(UTC)
    artifact = Artifact(
        id=overrides.get("id", uuid4()),
        title=overrides.get("title", "Motion artifact"),
        aliases=overrides.get("aliases", ["ghosting"]),
        explanation=overrides.get("explanation", "Motion during acquisition."),
        visual_description=overrides.get("visual_description", "Repeated ghost lines."),
        remedies=overrides.get("remedies", [{"stage": "prevention", "text": "Stabilize head."}]),
        default_modality=overrides.get("default_modality", Modality.ASL),
        status=overrides.get("status", ArtifactStatus.APPROVED),
        created_at=overrides.get("created_at", now),
        updated_at=overrides.get("updated_at", now),
    )
    return artifact


def make_upload(filename="example.png", content=b"not-a-real-png"):
    return UploadFile(file=BytesIO(content), filename=filename)


def make_user(role=UserRole.CONTRIBUTOR):
    return User(
        id=uuid4(),
        email="researcher@example.org",
        role=role,
        is_active=True,
    )


def valid_submission_kwargs(**overrides):
    values = {
        "request": FakeRequest(),
        "artifact_name": "Community artifact",
        "contact_email": "researcher@example.org",
        "modality": Modality.ASL,
        "category": "Motion",
        "description": "A visible ghosting artifact from motion.",
        "permission_confirmed": True,
        "pseudonymisation_confirmed": True,
        "files": None,
        "scanner": None,
        "sequence": None,
        "protocol": None,
        "field_strength": None,
        "symptoms": None,
        "remedies": None,
        "references": None,
        "submitter_notes": None,
        "current_user": make_user(),
        "db": FakeWriteSession(),
    }
    values.update(overrides)
    return values


def test_health_check():
    response = health.health_check()

    assert response["status"] == "ok"


def test_database_health_uses_db_dependency():
    db = FakeReadSession()

    response = health.database_health_check(db)

    assert response == {"status": "ok", "database": "connected"}
    assert db.executed is True


def test_list_artifacts_returns_active_tags_only():
    artifact = make_artifact()
    active_tag = Tag(id=uuid4(), name="motion", is_active=True)
    inactive_tag = Tag(id=uuid4(), name="old-tag", is_active=False)
    image = Image(
        id=uuid4(),
        title="List image",
        caption="A public list example.",
        modality=Modality.ASL,
        vendor="Siemens",
        sequence="3D GRASE",
        protocol="Demo protocol",
        field_strength="3T",
        visibility_status=ImageVisibilityStatus.APPROVED_PUBLIC,
        reliability_score=9,
    )
    image.files = [
        ImageFile(
            id=uuid4(),
            file_role=FileRole.THUMBNAIL,
            file_type=FileType.PNG,
            storage_provider=StorageProvider.LOCAL_DEV,
            storage_bucket="approved",
            storage_key="public/list-example.png",
            public_url="http://testserver/uploads/public/list-example.png",
            is_public=True,
        )
    ]
    artifact.tag_links = [
        ArtifactTag(id=uuid4(), artifact=artifact, tag=active_tag),
        ArtifactTag(id=uuid4(), artifact=artifact, tag=inactive_tag),
    ]
    artifact.image_links = [
        ImageArtifact(
            id=uuid4(),
            artifact=artifact,
            image=image,
            relationship_type=ImageArtifactRelationshipType.PRIMARY,
        )
    ]
    db = FakeReadSession(scalars_items=[artifact])

    response = artifacts.list_artifacts(
        db=db,
        skip=0,
        limit=20,
        search=None,
        modality=None,
        status=ArtifactStatus.APPROVED,
        tag=None,
    )

    assert len(response) == 1
    assert response[0].title == "Motion artifact"
    assert response[0].tags == ["motion"]
    assert response[0].created_at == artifact.created_at
    assert response[0].images[0].reliability_score == 9
    assert response[0].images[0].files[0].public_url == "http://testserver/uploads/public/list-example.png"


def test_get_artifact_detail_returns_public_files_only():
    artifact = make_artifact()
    image = Image(
        id=uuid4(),
        title="Example image",
        caption="A public example.",
        modality=Modality.ASL,
        vendor="Siemens",
        sequence="3D GRASE",
        protocol="Demo protocol",
        field_strength="3T",
        visibility_status=ImageVisibilityStatus.APPROVED_PUBLIC,
        reliability_score=4,
    )
    image.files = [
        ImageFile(
            id=uuid4(),
            file_role=FileRole.THUMBNAIL,
            file_type=FileType.PNG,
            storage_provider=StorageProvider.LOCAL_DEV,
            storage_bucket="approved",
            storage_key="public/example.png",
            public_url="http://testserver/uploads/public/example.png",
            is_public=True,
        ),
        ImageFile(
            id=uuid4(),
            file_role=FileRole.OTHER,
            file_type=FileType.JPG,
            storage_provider=StorageProvider.LOCAL_DEV,
            storage_bucket="private",
            storage_key="private/example.jpg",
            public_url="http://testserver/uploads/private/example.jpg",
            is_public=False,
        ),
    ]
    artifact.image_links = [
        ImageArtifact(
            id=uuid4(),
            artifact=artifact,
            image=image,
            relationship_type=ImageArtifactRelationshipType.PRIMARY,
        )
    ]
    db = FakeReadSession(scalar_item=artifact)

    response = artifacts.get_artifact(artifact.id, db=db)

    assert response.id == artifact.id
    assert response.images[0].relationship_type == "primary"
    assert response.images[0].files[0].id == image.files[0].id
    assert response.images[0].files[0].file_role == "thumbnail"
    assert response.images[0].files[0].file_type == "png"
    assert response.images[0].files[0].public_url == "http://testserver/uploads/public/example.png"
    assert len(response.images[0].files) == 1


def test_list_tags():
    tag_rows = [
        Tag(
            id=uuid4(),
            name="motion",
            modality_scope=Modality.ALL,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )
    ]
    db = FakeReadSession(scalars_items=tag_rows)

    response = tags.list_tags(
        db=db,
        tag_type=None,
        modality_scope=None,
        include_inactive=False,
    )

    assert response[0].name == "motion"


def test_create_submission_stores_file_and_returns_receipt(monkeypatch, tmp_path):
    db = FakeWriteSession()
    monkeypatch.setattr(settings, "LOCAL_STORAGE_ROOT", str(tmp_path))
    monkeypatch.setattr(settings, "DEV_AUTO_APPROVE_SUBMISSIONS", True)

    response = submissions.create_submission(
        **valid_submission_kwargs(
            db=db,
            files=[make_upload()],
            symptoms='["ghosting", "Motion"]',
            remedies="Repeat acquisition with better stabilization.",
        )
    )

    payload = response
    assert payload["contact_email"] == "researcher@example.org"
    assert payload["submitted_by_id"] is not None
    assert payload["status"].value == "approved"
    assert payload["artifact"]["title"] == "Community artifact"
    assert payload["artifact"]["status"].value == "community_published"
    assert payload["artifact"]["tags"] == ["Motion", "ghosting"]
    assert payload["image"]["visibility_status"].value == "approved_public"
    assert payload["files"][0]["file_type"].value == "png"
    assert db.committed is True
    assert list(Path(tmp_path).glob("submissions/*/*-example.png"))


def test_create_submission_attaches_logged_in_user(monkeypatch):
    db = FakeWriteSession()
    current_user = make_user()
    monkeypatch.setattr(settings, "DEV_AUTO_APPROVE_SUBMISSIONS", False)

    response = submissions.create_submission(
        **valid_submission_kwargs(
            db=db,
            current_user=current_user,
            files=None,
        )
    )

    assert response["submitted_by_id"] == current_user.id
    submission = next(obj for obj in db.objects if isinstance(obj, Submission))
    assert submission.submitted_by_id == current_user.id


def test_submission_route_requires_authenticated_contributor():
    route = next(route for route in submissions.router.routes if route.path == "")
    dependency_names = {
        dependency.call.__name__
        for dependency in route.dependant.dependencies
        if dependency.call
    }

    assert "require_contributor" in dependency_names


def test_my_submissions_route_requires_authenticated_contributor():
    route = next(route for route in submissions.router.routes if route.path == "/me")
    dependency_names = {
        dependency.call.__name__
        for dependency in route.dependant.dependencies
        if dependency.call
    }

    assert "require_contributor" in dependency_names


def test_list_my_submissions_returns_current_user_items():
    now = datetime.now(UTC)
    user = make_user()
    submission = Submission(
        id=uuid4(),
        submitted_by_id=user.id,
        contact_email=user.email,
        status=SubmissionStatus.APPROVED,
        permission_confirmed=True,
        pseudonymisation_confirmed=True,
        submitted_at=now,
        reviewed_at=None,
        created_at=now,
        updated_at=now,
    )
    artifact = make_artifact(
        title="Submitted artifact",
        status=ArtifactStatus.COMMUNITY_PUBLISHED,
        created_at=now,
        updated_at=now,
    )
    image = Image(
        id=uuid4(),
        title="Submitted image",
        modality=Modality.ASL,
        vendor="Siemens",
        visibility_status=ImageVisibilityStatus.APPROVED_PUBLIC,
    )
    image.files = [
        ImageFile(
            id=uuid4(),
            file_role=FileRole.OTHER,
            file_type=FileType.PNG,
            storage_provider=StorageProvider.LOCAL_DEV,
            storage_bucket="private",
            storage_key="submissions/example.png",
            is_public=True,
        )
    ]
    image.artifact_links = [
        ImageArtifact(
            id=uuid4(),
            image=image,
            artifact=artifact,
            relationship_type=ImageArtifactRelationshipType.PRIMARY,
        )
    ]
    submission.images = [image]
    db = FakeReadSession(scalars_items=[submission])

    response = submissions.list_my_submissions(current_user=user, db=db)

    assert len(response) == 1
    assert response[0].id == submission.id
    assert response[0].artifact.title == "Submitted artifact"
    assert response[0].artifact.status == ArtifactStatus.COMMUNITY_PUBLISHED
    assert response[0].image.vendor == "Siemens"
    assert response[0].file_count == 1


@pytest.mark.parametrize(
    ("form_updates", "expected_detail"),
    [
        ({"contact_email": "bad-email"}, "Enter a valid contact email address."),
        ({"permission_confirmed": False}, "Confirm permission and pseudonymisation"),
    ],
)
def test_create_submission_validation_errors(form_updates, expected_detail):
    db = FakeWriteSession()
    kwargs = valid_submission_kwargs(db=db)
    kwargs.update(form_updates)

    with pytest.raises(HTTPException) as exc_info:
        submissions.create_submission(**kwargs)

    assert exc_info.value.status_code == 400
    assert expected_detail in exc_info.value.detail
    assert db.committed is False
