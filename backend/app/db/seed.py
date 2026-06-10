from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

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
    TagType,
    UserRole,
)
from app.db.session import SessionLocal


def get_or_create_user(db: Session) -> User:
    user = db.scalar(select(User).where(User.email == "reviewer@aura.local"))
    if user:
        return user

    user = User(
        name="AURA Reviewer",
        email="reviewer@aura.local",
        role=UserRole.REVIEWER,
    )
    db.add(user)
    return user


def seed(db: Session) -> None:
    existing_image = db.scalar(select(Image).where(Image.title == "Example ASL motion artifact case"))
    if existing_image:
        print("Seed data already exists.")
        return

    reviewer = get_or_create_user(db)

    motion = Artifact(
        title="Motion artifact",
        aliases=["patient motion", "head motion"],
        explanation="Motion during acquisition can create ghosting, blurring, or misregistration.",
        visual_description="Repeated edges, shifted anatomy, or mismatch between perfusion and structural images.",
        remedies=[
            {"stage": "prevention", "text": "Use patient padding and clear breathing instructions."},
            {"stage": "post_processing", "text": "Check registration and consider motion correction."},
        ],
        default_modality=Modality.ASL,
        status=ArtifactStatus.APPROVED,
    )
    low_snr = Artifact(
        title="Low SNR",
        aliases=["noisy perfusion", "low signal"],
        explanation="Low signal-to-noise ratio can make perfusion maps grainy or unreliable.",
        visual_description="Speckled CBF map with poor gray-white matter contrast.",
        remedies=[{"stage": "review", "text": "Inspect raw control/tag pairs and M0 image quality."}],
        default_modality=Modality.ASL,
        status=ArtifactStatus.APPROVED,
    )
    labeling_failure = Artifact(
        title="Labeling failure",
        aliases=["poor labeling", "inversion failure"],
        explanation="ASL labeling problems can reduce or distort perfusion contrast.",
        visual_description="Unexpectedly low perfusion signal across vascular territories.",
        remedies=[{"stage": "acquisition", "text": "Check labeling plane placement and scanner protocol."}],
        default_modality=Modality.ASL,
        status=ArtifactStatus.APPROVED,
    )

    motion_tag = Tag(
        name="motion",
        tag_type=TagType.PATIENT_INDUCED,
        modality_scope=Modality.ALL,
    )
    asl_tag = Tag(
        name="ASL",
        tag_type=TagType.ASL_SPECIFIC,
        modality_scope=Modality.ASL,
    )
    ghosting_tag = Tag(
        name="ghosting",
        tag_type=TagType.VISUAL_SYMPTOM,
        modality_scope=Modality.ALL,
    )

    submission = Submission(
        submitted_by=reviewer,
        contact_email="contributor@example.org",
        status=SubmissionStatus.APPROVED,
        permission_confirmed=True,
        pseudonymisation_confirmed=True,
        submitter_notes="Example seed case using object-storage references only.",
        submitted_at=datetime.now(UTC),
        reviewed_at=datetime.now(UTC),
    )

    image = Image(
        submission=submission,
        title="Example ASL motion artifact case",
        caption="ASL perfusion example with motion as the primary artifact and secondary low SNR findings.",
        modality=Modality.ASL,
        vendor="Siemens",
        sequence="pCASL",
        protocol="3D GRASE pCASL",
        field_strength="3T",
        visibility_status=ImageVisibilityStatus.APPROVED_PUBLIC,
        reliability_score=2,
    )

    db.add_all(
        [
            motion,
            low_snr,
            labeling_failure,
            motion_tag,
            asl_tag,
            ghosting_tag,
            submission,
            image,
        ]
    )
    db.flush()

    db.add_all(
        [
            ArtifactTag(artifact=motion, tag=motion_tag),
            ArtifactTag(artifact=motion, tag=ghosting_tag),
            ArtifactTag(artifact=motion, tag=asl_tag),
            ArtifactTag(artifact=low_snr, tag=asl_tag),
            ImageArtifact(
                image=image,
                artifact=motion,
                relationship_type=ImageArtifactRelationshipType.PRIMARY,
                note="Dominant visible issue.",
            ),
            ImageArtifact(
                image=image,
                artifact=low_snr,
                relationship_type=ImageArtifactRelationshipType.SECONDARY,
                note="Noise also affects interpretation.",
            ),
            ImageArtifact(
                image=image,
                artifact=labeling_failure,
                relationship_type=ImageArtifactRelationshipType.SECONDARY,
                note="Included to demonstrate multiple secondary artifacts.",
            ),
            ImageFile(
                image=image,
                file_role=FileRole.PERFUSION,
                file_type=FileType.NII_GZ,
                storage_provider=StorageProvider.AWS_S3,
                storage_bucket="aura-approved-private",
                storage_key="asl/examples/motion_case_001/perfusion.nii.gz",
                is_public=False,
                file_size_mb=18.4,
                checksum="sha256:example-perfusion-checksum",
            ),
            ImageFile(
                image=image,
                file_role=FileRole.THUMBNAIL,
                file_type=FileType.JPG,
                storage_provider=StorageProvider.AWS_S3,
                storage_bucket="aura-approved-public",
                storage_key="asl/examples/motion_case_001/thumbnail.jpg",
                public_url="https://cdn.example.org/asl/examples/motion_case_001/thumbnail.jpg",
                is_public=True,
                file_size_mb=0.32,
                checksum="sha256:example-thumbnail-checksum",
            ),
        ]
    )
    db.commit()
    print("Seed data created.")


def main() -> None:
    with SessionLocal() as db:
        seed(db)


if __name__ == "__main__":
    main()

