from enum import Enum


class UserRole(str, Enum):
    PUBLIC_USER = "public_user"
    CONTRIBUTOR = "contributor"
    REVIEWER = "reviewer"
    ADMIN = "admin"


class Modality(str, Enum):
    ASL = "ASL"
    DSC = "DSC"
    DCE = "DCE"
    IVIM = "IVIM"
    MULTI = "MULTI"
    ALL = "ALL"
    UNKNOWN = "UNKNOWN"


class ArtifactStatus(str, Enum):
    DRAFT = "draft"
    CONTRIBUTOR_PUBLISHED = "contributor_published"
    OSIPI_VERIFIED = "osipi_verified"
    FLAGGED = "flagged"
    REJECTED = "rejected"
    APPROVED = "approved"
    ARCHIVED = "archived"


class SubmissionStatus(str, Enum):
    PENDING_REVIEW = "pending_review"
    NEEDS_CHANGES = "needs_changes"
    APPROVED = "approved"
    REJECTED = "rejected"
    WITHDRAWN = "withdrawn"


class ImageVisibilityStatus(str, Enum):
    PRIVATE_STAGING = "private_staging"
    PENDING_REVIEW = "pending_review"
    APPROVED_PUBLIC = "approved_public"
    REJECTED = "rejected"
    ARCHIVED = "archived"


class ImageArtifactRelationshipType(str, Enum):
    PRIMARY = "primary"
    SECONDARY = "secondary"
    SUSPECTED = "suspected"


class FileRole(str, Enum):
    PERFUSION = "perfusion"
    STRUCTURAL = "structural"
    M0 = "m0"
    CONTROL = "control"
    LABEL = "label"
    THUMBNAIL = "thumbnail"
    MASK = "mask"
    OVERLAY = "overlay"
    OTHER = "other"


class FileType(str, Enum):
    NIFTI = "nifti"
    DICOM = "dicom"
    JPG = "jpg"
    PNG = "png"
    NII_GZ = "nii_gz"
    OTHER = "other"


class StorageProvider(str, Enum):
    AWS_S3 = "aws_s3"
    AZURE_BLOB = "azure_blob"
    LOCAL_DEV = "local_dev"
    OTHER = "other"


class TagType(str, Enum):
    VISUAL_SYMPTOM = "visual_symptom"
    ARTIFACT_CATEGORY = "artifact_category"
    ASL_SPECIFIC = "asl_specific"
    DCE_SPECIFIC = "dce_specific"
    DSC_SPECIFIC = "dsc_specific"
    IVIM_SPECIFIC = "ivim_specific"
    HARDWARE = "hardware"
    PATIENT_INDUCED = "patient_induced"
    SEQUENCE = "sequence"
    OTHER = "other"


class VoteType(str, Enum):
    AGREE = "agree"
    DISAGREE = "disagree"


class CommentStatus(str, Enum):
    VISIBLE = "visible"
    HIDDEN = "hidden"
    FLAGGED = "flagged"
    DELETED = "deleted"


class ReviewActionType(str, Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    REQUESTED_CHANGES = "requested_changes"
    MARKED_OSIPI_VERIFIED = "marked_osipi_verified"
    REMOVED_FROM_PUBLIC = "removed_from_public"


class QualityFlag(str, Enum):
    PASS = "pass"
    WARNING = "warning"
    FAIL = "fail"
    UNKNOWN = "unknown"


def enum_values(enum_class: type[Enum]) -> list[str]:
    return [member.value for member in enum_class]
