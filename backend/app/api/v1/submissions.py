import hashlib
import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_db_session
from app.db.models import Artifact, ArtifactTag, Image, ImageArtifact, ImageFile, Submission, Tag
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
)
from app.schemas.submission import SubmissionReceiptRead

router = APIRouter()

MAX_FILE_BYTES = 50 * 1024 * 1024
MAX_FILES_PER_SUBMISSION = 8
UPLOAD_CHUNK_SIZE = 1024 * 1024
EMAIL_PATTERN = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")
SAFE_FILENAME_PATTERN = re.compile(r"[^A-Za-z0-9._-]+")


def _clean_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def _clean_label(value: str, max_length: int = 120) -> str:
    cleaned = " ".join(value.strip().split())
    if len(cleaned) > max_length:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"'{cleaned[:40]}...' is too long. Keep labels under {max_length} characters.",
        )
    return cleaned


def _parse_json_or_delimited_list(value: str | None) -> list[str]:
    cleaned = _clean_text(value)
    if not cleaned:
        return []

    if cleaned.startswith("["):
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Symptoms must be valid JSON or a comma-separated list.",
            ) from exc

        if not isinstance(parsed, list):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Symptoms must be a list.",
            )
        values = [str(item) for item in parsed]
    else:
        values = re.split(r"[,\n]+", cleaned)

    deduped: list[str] = []
    seen: set[str] = set()
    for raw_value in values:
        label = _clean_label(raw_value)
        key = label.casefold()
        if label and key not in seen:
            seen.add(key)
            deduped.append(label)
    return deduped


def _parse_lines(value: str | None) -> list[str]:
    cleaned = _clean_text(value)
    if not cleaned:
        return []
    return [line.strip() for line in cleaned.splitlines() if line.strip()]


def _remedies_from_text(value: str | None) -> list[dict[str, str]]:
    return [{"stage": "contributor", "text": line} for line in _parse_lines(value)]


def _file_type_for_filename(filename: str) -> FileType:
    lowered = filename.lower()
    if lowered.endswith(".nii.gz"):
        return FileType.NII_GZ

    suffix = Path(lowered).suffix
    if suffix == ".nii":
        return FileType.NIFTI
    if suffix in {".dcm", ".dicom"}:
        return FileType.DICOM
    if suffix in {".jpg", ".jpeg"}:
        return FileType.JPG
    if suffix == ".png":
        return FileType.PNG

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=(
            f"{filename} is not a supported upload type. "
            "Use DICOM, NIfTI, PNG, or JPG files."
        ),
    )


def _safe_filename(filename: str) -> str:
    basename = Path(filename).name.strip() or "upload"
    safe = SAFE_FILENAME_PATTERN.sub("_", basename)
    if len(safe) <= 180:
        return safe

    suffix = "".join(Path(safe).suffixes)
    stem = safe[: 180 - len(suffix)]
    return f"{stem}{suffix}"


def _storage_root() -> Path:
    root = Path(settings.LOCAL_STORAGE_ROOT)
    if not root.is_absolute():
        root = Path.cwd() / root
    return root


def _storage_provider() -> StorageProvider:
    try:
        return StorageProvider(settings.STORAGE_PROVIDER)
    except ValueError:
        return StorageProvider.OTHER


def _public_url_for_upload(request: Request, storage_key: str, file_type: FileType) -> str | None:
    if file_type not in {FileType.JPG, FileType.PNG, FileType.NIFTI, FileType.NII_GZ}:
        return None
    return str(request.url_for("local_upload", path=storage_key))


def _store_upload(upload: UploadFile, submission_id: UUID) -> tuple[str, int, str, Path]:
    filename = _safe_filename(upload.filename or "upload")
    storage_key = f"submissions/{submission_id}/{uuid4().hex}-{filename}"
    destination = _storage_root() / storage_key
    destination.parent.mkdir(parents=True, exist_ok=True)

    checksum = hashlib.sha256()
    total_bytes = 0

    try:
        with destination.open("wb") as output:
            while True:
                chunk = upload.file.read(UPLOAD_CHUNK_SIZE)
                if not chunk:
                    break

                total_bytes += len(chunk)
                if total_bytes > MAX_FILE_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail=f"{upload.filename} exceeds the 50MB upload limit.",
                    )

                checksum.update(chunk)
                output.write(chunk)
    except Exception:
        destination.unlink(missing_ok=True)
        raise
    finally:
        upload.file.close()

    if total_bytes == 0:
        destination.unlink(missing_ok=True)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{upload.filename} is empty.",
        )

    return storage_key, total_bytes, checksum.hexdigest(), destination


def _get_or_create_tag(
    db: Session,
    name: str,
    tag_type: TagType,
    modality_scope: Modality,
) -> Tag:
    statement = select(Tag).where(func.lower(Tag.name) == name.lower())
    tag = db.scalar(statement)
    if tag:
        return tag

    tag = Tag(name=name, tag_type=tag_type, modality_scope=modality_scope)
    db.add(tag)
    return tag


def _cleanup_saved_files(paths: list[Path]) -> None:
    for path in paths:
        path.unlink(missing_ok=True)


@router.post("", response_model=SubmissionReceiptRead, status_code=status.HTTP_201_CREATED)
def create_submission(
    request: Request,
    artifact_name: Annotated[str, Form(min_length=2, max_length=255)],
    contact_email: Annotated[str, Form(max_length=320)],
    modality: Annotated[Modality, Form()],
    category: Annotated[str, Form(min_length=2, max_length=120)],
    description: Annotated[str, Form(min_length=10)],
    permission_confirmed: Annotated[bool, Form()],
    pseudonymisation_confirmed: Annotated[bool, Form()],
    files: Annotated[list[UploadFile] | None, File()] = None,
    scanner: Annotated[str | None, Form(max_length=120)] = None,
    sequence: Annotated[str | None, Form(max_length=120)] = None,
    protocol: Annotated[str | None, Form(max_length=255)] = None,
    field_strength: Annotated[str | None, Form(max_length=50)] = None,
    symptoms: Annotated[str | None, Form()] = None,
    remedies: Annotated[str | None, Form()] = None,
    references: Annotated[str | None, Form()] = None,
    submitter_notes: Annotated[str | None, Form()] = None,
    db: Session = Depends(get_db_session),
):
    email = contact_email.strip().lower()
    if not EMAIL_PATTERN.match(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enter a valid contact email address.",
        )

    if not permission_confirmed or not pseudonymisation_confirmed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Confirm permission and pseudonymisation before submitting.",
        )

    upload_files = files or []
    if len(upload_files) > MAX_FILES_PER_SUBMISSION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Upload no more than {MAX_FILES_PER_SUBMISSION} files per submission.",
        )

    file_types = [_file_type_for_filename(file.filename or "upload") for file in upload_files]
    category_name = _clean_label(category)
    symptom_names = _parse_json_or_delimited_list(symptoms)
    symptom_names = [
        symptom_name
        for symptom_name in symptom_names
        if symptom_name.casefold() != category_name.casefold()
    ]
    remedy_payload = _remedies_from_text(remedies)
    reference_lines = _parse_lines(references)
    auto_approve = settings.DEV_AUTO_APPROVE_SUBMISSIONS

    saved_paths: list[Path] = []
    stored_file_rows: list[tuple[ImageFile, str]] = []

    submission = Submission(
        contact_email=email,
        status=SubmissionStatus.APPROVED if auto_approve else SubmissionStatus.PENDING_REVIEW,
        permission_confirmed=permission_confirmed,
        pseudonymisation_confirmed=pseudonymisation_confirmed,
        submitter_notes=json.dumps(
            {
                "category": category_name,
                "symptoms": symptom_names,
                "references": reference_lines,
                "submitter_notes": _clean_text(submitter_notes),
            },
            indent=2,
        ),
        submitted_at=datetime.now(UTC),
    )
    artifact = Artifact(
        title=artifact_name.strip(),
        explanation=description.strip(),
        visual_description=description.strip(),
        remedies=remedy_payload,
        default_modality=modality,
        status=ArtifactStatus.APPROVED if auto_approve else ArtifactStatus.DRAFT,
    )
    image = Image(
        submission=submission,
        title=artifact_name.strip(),
        caption=description.strip(),
        modality=modality,
        vendor=_clean_text(scanner),
        sequence=_clean_text(sequence),
        protocol=_clean_text(protocol),
        field_strength=_clean_text(field_strength),
        visibility_status=(
            ImageVisibilityStatus.APPROVED_PUBLIC
            if auto_approve
            else ImageVisibilityStatus.PENDING_REVIEW
        ),
    )
    image.artifact_links.append(
        ImageArtifact(
            artifact=artifact,
            relationship_type=ImageArtifactRelationshipType.PRIMARY,
            note=category_name,
        )
    )

    category_tag = _get_or_create_tag(
        db,
        category_name,
        TagType.ARTIFACT_CATEGORY,
        Modality.ALL,
    )
    artifact.tag_links.append(ArtifactTag(tag=category_tag))

    for symptom_name in symptom_names:
        symptom_tag = _get_or_create_tag(
            db,
            symptom_name,
            TagType.VISUAL_SYMPTOM,
            modality,
        )
        artifact.tag_links.append(ArtifactTag(tag=symptom_tag))

    try:
        db.add_all([submission, artifact, image])
        db.flush()

        for upload, file_type in zip(upload_files, file_types, strict=True):
            storage_key, total_bytes, checksum, saved_path = _store_upload(upload, submission.id)
            saved_paths.append(saved_path)
            public_url = (
                _public_url_for_upload(request, storage_key, file_type)
                if auto_approve
                else None
            )

            image_file = ImageFile(
                image=image,
                file_role=FileRole.OTHER,
                file_type=file_type,
                storage_provider=_storage_provider(),
                storage_bucket=settings.PRIVATE_STORAGE_BUCKET,
                storage_key=storage_key,
                public_url=public_url,
                is_public=public_url is not None,
                file_size_mb=round(total_bytes / (1024 * 1024), 3),
                checksum=checksum,
            )
            db.add(image_file)
            db.flush()
            stored_file_rows.append((image_file, upload.filename or "upload"))

        db.commit()
        db.refresh(submission)
        db.refresh(artifact)
        db.refresh(image)
    except HTTPException:
        db.rollback()
        _cleanup_saved_files(saved_paths)
        raise
    except Exception:
        db.rollback()
        _cleanup_saved_files(saved_paths)
        raise

    return {
        "id": submission.id,
        "submitted_by_id": submission.submitted_by_id,
        "contact_email": submission.contact_email,
        "status": submission.status,
        "permission_confirmed": submission.permission_confirmed,
        "pseudonymisation_confirmed": submission.pseudonymisation_confirmed,
        "submitter_notes": submission.submitter_notes,
        "submitted_at": submission.submitted_at,
        "reviewed_at": submission.reviewed_at,
        "created_at": submission.created_at,
        "updated_at": submission.updated_at,
        "artifact": {
            "id": artifact.id,
            "title": artifact.title,
            "default_modality": artifact.default_modality,
            "status": artifact.status,
            "tags": [category_name, *symptom_names],
        },
        "image": {
            "id": image.id,
            "title": image.title,
            "modality": image.modality,
            "vendor": image.vendor,
            "sequence": image.sequence,
            "protocol": image.protocol,
            "field_strength": image.field_strength,
            "visibility_status": image.visibility_status,
        },
        "files": [
            {
                "id": image_file.id,
                "filename": filename,
                "file_type": image_file.file_type,
                "file_size_mb": image_file.file_size_mb,
                "checksum": image_file.checksum,
            }
            for image_file, filename in stored_file_rows
        ],
    }
