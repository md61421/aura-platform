from app.db.models.enums import ArtifactStatus

PUBLIC_ARTIFACT_STATUSES = (
    ArtifactStatus.CONTRIBUTOR_PUBLISHED,
    ArtifactStatus.OSIPI_VERIFIED,
    ArtifactStatus.APPROVED,
)
