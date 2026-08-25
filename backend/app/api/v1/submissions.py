import hashlib
import json
import re
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.dependencies import get_db_session, require_contributor
from app.core.exceptions import bad_request_exception, forbidden_exception, not_found_exception
from app.core.storage import (
    content_type_for_file_type,
    get_public_url as get_storage_public_url,
    get_supabase_client,
    upload_to_supabase,
)
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
)
from app.schemas.submission import (
    MySubmissionRead,
    SubmittedArtifactRead,
    SubmittedImageRead,
    SubmissionReceiptRead,
    SubmissionUpdate,
)

router = APIRouter()

MAX_FILE_BYTES = 50 * 1024 * 1024
MAX_FILES_PER_SUBMISSION = 500
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
    suffix = Path(lowered).suffix
    if suffix in {".jpg", ".jpeg"}:
        return FileType.JPG
    if suffix == ".png":
        return FileType.PNG

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=(
            f"{filename} is not a supported upload type. "
            "AURA focuses on 2D slice images and montages (PNG or JPG files)."
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


def _public_url_for_upload(
    request: Request,
    storage_key: str,
    file_type: FileType,
    bucket: str | None = None,
    storage_provider: StorageProvider | None = None,
) -> str | None:
    if file_type not in {FileType.JPG, FileType.PNG}:
        return None

    provider = storage_provider or _storage_provider()
    if provider == StorageProvider.SUPABASE_STORAGE:
        return get_storage_public_url(
            storage_key=storage_key,
            bucket=bucket or settings.APPROVED_STORAGE_BUCKET,
            storage_provider=StorageProvider.SUPABASE_STORAGE,
            request=request,
        )

    return get_storage_public_url(
        storage_key=storage_key,
        bucket=bucket or settings.LOCAL_STORAGE_ROOT,
        storage_provider=StorageProvider.LOCAL_DEV,
        request=request,
    )


def _store_upload(
    upload: UploadFile,
    submission_id: UUID,
    target_bucket: str | None = None,
    file_type: FileType = FileType.OTHER,
) -> tuple[str, int, str, Path]:
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

    provider = _storage_provider()
    if provider == StorageProvider.SUPABASE_STORAGE:
        client = get_supabase_client()
        if not client:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Supabase storage is configured but SUPABASE_SERVICE_ROLE_KEY is missing or invalid.",
            )
        try:
            with destination.open("rb") as f:
                file_bytes = f.read()
            upload_to_supabase(
                bucket=target_bucket or settings.APPROVED_STORAGE_BUCKET,
                storage_key=storage_key,
                file_bytes=file_bytes,
                content_type=content_type_for_file_type(file_type),
            )
        except Exception as exc:
            import logging
            logging.getLogger(__name__).exception("Supabase storage upload failed for %s", upload.filename)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload {upload.filename} to Supabase Storage: {exc}",
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

    tag = Tag(name=name, tag_type=tag_type, modality_scope=modality_scope, is_active=True)
    db.add(tag)
    return tag


def _cleanup_saved_files(paths: list[Path]) -> None:
    for path in paths:
        path.unlink(missing_ok=True)


def _primary_image_for_submission(submission: Submission) -> Image | None:
    return submission.images[0] if submission.images else None


def _artifact_link_for_image(image: Image | None) -> ImageArtifact | None:
    if not image:
        return None
    primary_link = next(
        (
            image_link
            for image_link in image.artifact_links
            if image_link.relationship_type == ImageArtifactRelationshipType.PRIMARY
        ),
        None,
    )
    return primary_link or (image.artifact_links[0] if image.artifact_links else None)


def _artifact_for_image(image: Image | None) -> Artifact | None:
    link = _artifact_link_for_image(image)
    return link.artifact if link else None


def _artifact_tag_names(artifact: Artifact) -> list[str]:
    return sorted(
        tag_link.tag.name
        for tag_link in artifact.tag_links
        if tag_link.tag and tag_link.tag.is_active
    )


def _ordered_artifact_tag_names(artifact: Artifact, category_name: str | None) -> list[str]:
    tag_names = _artifact_tag_names(artifact)
    if not category_name:
        return tag_names

    ordered = [category_name]
    ordered.extend(tag_name for tag_name in tag_names if tag_name.casefold() != category_name.casefold())
    return ordered


def _submission_summary(submission: Submission) -> MySubmissionRead:
    image = _primary_image_for_submission(submission)
    artifact_link = _artifact_link_for_image(image)
    artifact = _artifact_for_image(image)

    return MySubmissionRead(
        id=submission.id,
        contact_email=submission.contact_email,
        status=submission.status,
        submitted_at=submission.submitted_at,
        reviewed_at=submission.reviewed_at,
        created_at=submission.created_at,
        updated_at=submission.updated_at,
        artifact=(
            SubmittedArtifactRead(
                id=artifact.id,
                title=artifact.title,
                explanation=artifact.explanation,
                visual_description=artifact.visual_description,
                remedies=artifact.remedies,
                default_modality=artifact.default_modality,
                status=artifact.status,
                tags=_ordered_artifact_tag_names(
                    artifact,
                    artifact_link.note if artifact_link else None,
                ),
            )
            if artifact
            else None
        ),
        image=(
            SubmittedImageRead(
                id=image.id,
                title=image.title,
                modality=image.modality,
                vendor=image.vendor,
                sequence=image.sequence,
                protocol=image.protocol,
                field_strength=image.field_strength,
                visibility_status=image.visibility_status,
                modality_metadata=image.modality_metadata or {},
            )
            if image
            else None
        ),
        file_count=len(image.files) if image else 0,
    )


def _submission_options():
    return (
        selectinload(Submission.images).selectinload(Image.files),
        selectinload(Submission.images)
        .selectinload(Image.artifact_links)
        .selectinload(ImageArtifact.artifact)
        .selectinload(Artifact.tag_links)
        .selectinload(ArtifactTag.tag),
    )


def _get_owned_submission(db: Session, submission_id: UUID, current_user: User) -> Submission:
    statement = (
        select(Submission)
        .where(Submission.id == submission_id)
        .options(*_submission_options())
    )
    submission = db.scalar(statement)
    if not submission:
        raise not_found_exception("Submission")
    if submission.submitted_by_id != current_user.id:
        raise forbidden_exception("You can only manage your own submissions")
    return submission


def _replace_artifact_tags(
    db: Session,
    artifact: Artifact,
    category_name: str,
    symptom_names: list[str],
    modality: Modality,
) -> None:
    category_tag = _get_or_create_tag(
        db,
        category_name,
        TagType.ARTIFACT_CATEGORY,
        Modality.ALL,
    )
    desired_tags = [category_tag]
    for symptom_name in symptom_names:
        desired_tags.append(
            _get_or_create_tag(
                db,
                symptom_name,
                TagType.VISUAL_SYMPTOM,
                modality,
            )
        )

    db.flush()

    desired_tag_ids = {tag.id for tag in desired_tags}
    artifact.tag_links[:] = [
        tag_link
        for tag_link in artifact.tag_links
        if (tag_link.tag_id or (tag_link.tag.id if tag_link.tag else None)) in desired_tag_ids
    ]

    existing_tag_ids = {
        tag_link.tag_id or (tag_link.tag.id if tag_link.tag else None)
        for tag_link in artifact.tag_links
    }
    for tag in desired_tags:
        if tag.id not in existing_tag_ids:
            artifact.tag_links.append(ArtifactTag(tag=tag))


@router.get("/me", response_model=list[MySubmissionRead])
def list_my_submissions(
    current_user: Annotated[User, Depends(require_contributor)],
    db: Session = Depends(get_db_session),
):
    statement = (
        select(Submission)
        .where(Submission.submitted_by_id == current_user.id)
        .options(*_submission_options())
        .order_by(Submission.created_at.desc())
    )
    rows = db.scalars(statement).unique().all()
    return [_submission_summary(submission) for submission in rows]


@router.post("/{submission_id}/edit", response_model=MySubmissionRead)
@router.patch("/{submission_id}", response_model=MySubmissionRead)
def update_my_submission(
    submission_id: UUID,
    payload: SubmissionUpdate,
    current_user: Annotated[User, Depends(require_contributor)],
    db: Session = Depends(get_db_session),
) -> MySubmissionRead:
    submission = _get_owned_submission(db, submission_id, current_user)
    image = _primary_image_for_submission(submission)
    artifact = _artifact_for_image(image)

    if not image or not artifact:
        raise bad_request_exception("Submission is not linked to an editable artifact")
    if artifact.status in {ArtifactStatus.ARCHIVED, ArtifactStatus.REJECTED}:
        raise bad_request_exception("Removed artifacts cannot be edited")

    artifact_name = _clean_label(payload.artifact_name, max_length=255)
    description = _clean_text(payload.description)
    if not description or len(description) < 10:
        raise bad_request_exception("Add a description of at least 10 characters.")

    category_name = _clean_label(payload.category)
    symptom_names = [
        _clean_label(symptom_name)
        for symptom_name in payload.symptoms
        if _clean_text(symptom_name)
    ]
    symptom_names = [
        symptom_name
        for symptom_name in symptom_names
        if symptom_name.casefold() != category_name.casefold()
    ]
    deduped_symptoms: list[str] = []
    seen_symptoms: set[str] = set()
    for symptom_name in symptom_names:
        key = symptom_name.casefold()
        if key not in seen_symptoms:
            seen_symptoms.add(key)
            deduped_symptoms.append(symptom_name)

    artifact.title = artifact_name
    artifact.explanation = description
    artifact.visual_description = description
    artifact.default_modality = payload.modality
    artifact.remedies = _remedies_from_text(payload.remedies)

    image.title = artifact_name
    image.caption = description
    image.modality = payload.modality
    image.vendor = _clean_text(payload.scanner)
    image.sequence = _clean_text(payload.sequence)
    image.protocol = _clean_text(payload.protocol)
    image.field_strength = _clean_text(payload.field_strength)
    if payload.modality_metadata is not None:
        image.modality_metadata = payload.modality_metadata

    _replace_artifact_tags(
        db,
        artifact,
        category_name,
        deduped_symptoms,
        payload.modality,
    )
    artifact_link = _artifact_link_for_image(image)
    if artifact_link:
        artifact_link.note = category_name
    submission.submitter_notes = json.dumps(
        {
            "category": category_name,
            "symptoms": deduped_symptoms,
            "modality_metadata": image.modality_metadata,
        },
        indent=2,
    )

    db.commit()
    db.refresh(submission)
    return _submission_summary(submission)


@router.delete("/{submission_id}", response_model=MySubmissionRead)
def withdraw_my_submission(
    submission_id: UUID,
    current_user: Annotated[User, Depends(require_contributor)],
    db: Session = Depends(get_db_session),
) -> MySubmissionRead:
    submission = _get_owned_submission(db, submission_id, current_user)
    image = _primary_image_for_submission(submission)
    artifact = _artifact_for_image(image)

    submission.status = SubmissionStatus.WITHDRAWN
    if artifact:
        artifact.status = ArtifactStatus.ARCHIVED
    if image:
        image.visibility_status = ImageVisibilityStatus.ARCHIVED
        for image_file in image.files:
            image_file.is_public = False
            image_file.public_url = None

    db.commit()
    db.refresh(submission)
    return _submission_summary(submission)


@router.post("/{submission_id}/republish", response_model=MySubmissionRead)
def republish_my_submission(
    submission_id: UUID,
    request: Request,
    current_user: Annotated[User, Depends(require_contributor)],
    db: Session = Depends(get_db_session),
) -> MySubmissionRead:
    submission = _get_owned_submission(db, submission_id, current_user)
    image = _primary_image_for_submission(submission)
    artifact = _artifact_for_image(image)

    if not image or not artifact:
        raise bad_request_exception("Submission is not linked to a publishable artifact")
    if artifact.status not in {ArtifactStatus.ARCHIVED, ArtifactStatus.DRAFT, ArtifactStatus.REJECTED}:
        raise bad_request_exception("Only draft or removed artifacts can be published")

    submission.status = SubmissionStatus.APPROVED
    artifact.status = ArtifactStatus.CONTRIBUTOR_PUBLISHED
    image.visibility_status = ImageVisibilityStatus.APPROVED_PUBLIC

    for image_file in image.files:
        if image_file.file_type in {FileType.JPG, FileType.PNG}:
            image_file.public_url = _public_url_for_upload(
                request,
                image_file.storage_key,
                image_file.file_type,
                bucket=image_file.storage_bucket,
                storage_provider=image_file.storage_provider,
            )
            image_file.is_public = image_file.public_url is not None
        else:
            image_file.is_public = False
            image_file.public_url = None

    db.commit()
    db.refresh(submission)
    return _submission_summary(submission)


@router.post("", response_model=SubmissionReceiptRead, status_code=status.HTTP_201_CREATED)
def create_submission(
    request: Request,
    artifact_name: Annotated[str, Form(min_length=2, max_length=255)],
    contact_email: Annotated[str, Form(max_length=320)],
    modality: Annotated[Modality, Form()],
    category: Annotated[str, Form(min_length=2, max_length=120)],
    description: Annotated[str, Form(min_length=10)],
    current_user: Annotated[User, Depends(require_contributor)],
    permission_confirmed: Annotated[bool, Form()] = True,
    pseudonymisation_confirmed: Annotated[bool, Form()] = True,
    files: Annotated[list[UploadFile] | None, File()] = None,
    axial_montage: Annotated[UploadFile | None, File()] = None,
    coronal_montage: Annotated[UploadFile | None, File()] = None,
    sagittal_montage: Annotated[UploadFile | None, File()] = None,
    primary_index: Annotated[int, Form()] = 0,
    scanner: Annotated[str | None, Form(max_length=120)] = None,
    sequence: Annotated[str | None, Form(max_length=120)] = None,
    protocol: Annotated[str | None, Form(max_length=255)] = None,
    field_strength: Annotated[str | None, Form(max_length=50)] = None,
    symptoms: Annotated[str | None, Form()] = None,
    remedies: Annotated[str | None, Form()] = None,
    references: Annotated[str | None, Form()] = None,
    submitter_notes: Annotated[str | None, Form()] = None,
    modality_metadata: Annotated[str | None, Form()] = None,
    slice_metadata: Annotated[str | None, Form()] = None,
    save_as_draft: Annotated[bool, Form()] = False,
    db: Session = Depends(get_db_session),
):
    email = contact_email.strip().lower()
    if not EMAIL_PATTERN.match(email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Enter a valid contact email address.",
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
    publish_immediately = not save_as_draft

    parsed_slice_metadata = []
    if slice_metadata:
        try:
            parsed_slice_metadata = json.loads(slice_metadata) if isinstance(slice_metadata, str) else slice_metadata
        except Exception:
            parsed_slice_metadata = []

    parsed_modality_metadata = {}
    if modality_metadata:
        try:
            parsed_modality_metadata = json.loads(modality_metadata) if isinstance(modality_metadata, str) else modality_metadata
        except Exception:
            parsed_modality_metadata = {}

    saved_paths: list[Path] = []
    stored_file_rows: list[tuple[ImageFile, str]] = []

    submission = Submission(
        submitted_by_id=current_user.id,
        contact_email=email,
        status=SubmissionStatus.APPROVED if publish_immediately else SubmissionStatus.PENDING_REVIEW,
        permission_confirmed=permission_confirmed,
        pseudonymisation_confirmed=pseudonymisation_confirmed,
        submitter_notes=json.dumps(
            {
                "category": category_name,
                "symptoms": symptom_names,
                "references": reference_lines,
                "submitter_notes": _clean_text(submitter_notes),
                "modality_metadata": parsed_modality_metadata,
                "slice_metadata": parsed_slice_metadata,
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
        status=(
            ArtifactStatus.CONTRIBUTOR_PUBLISHED
            if publish_immediately
            else ArtifactStatus.DRAFT
        ),
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
        modality_metadata=parsed_modality_metadata,
        visibility_status=(
            ImageVisibilityStatus.APPROVED_PUBLIC
            if publish_immediately
            else ImageVisibilityStatus.PRIVATE_STAGING
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

        target_bucket = (
            settings.APPROVED_STORAGE_BUCKET
            if publish_immediately
            else settings.PRIVATE_STORAGE_BUCKET
        )

        for idx, (upload, file_type) in enumerate(zip(upload_files, file_types, strict=True)):
            storage_key, total_bytes, checksum, saved_path = _store_upload(
                upload,
                submission.id,
                target_bucket=target_bucket,
                file_type=file_type,
            )
            saved_paths.append(saved_path)
            public_url = (
                _public_url_for_upload(request, storage_key, file_type, bucket=target_bucket)
                if publish_immediately
                else None
            )

            role = (
                FileRole.PRIMARY_REPRESENTATIVE
                if idx == primary_index
                else FileRole.REPRESENTATIVE
            )

            image_file = ImageFile(
                image=image,
                file_role=role,
                file_type=file_type,
                storage_provider=_storage_provider(),
                storage_bucket=target_bucket,
                storage_key=storage_key,
                public_url=public_url,
                is_public=public_url is not None,
                file_size_mb=round(total_bytes / (1024 * 1024), 3),
                checksum=checksum,
            )
            db.add(image_file)
            db.flush()
            stored_file_rows.append((image_file, upload.filename or "upload"))

        montage_uploads = [
            (axial_montage, FileRole.AXIAL_MONTAGE),
            (coronal_montage, FileRole.CORONAL_MONTAGE),
            (sagittal_montage, FileRole.SAGITTAL_MONTAGE),
        ]
        for m_upload, m_role in montage_uploads:
            if m_upload and m_upload.filename:
                m_type = _file_type_for_filename(m_upload.filename)
                storage_key, total_bytes, checksum, saved_path = _store_upload(
                    m_upload,
                    submission.id,
                    target_bucket=target_bucket,
                    file_type=m_type,
                )
                saved_paths.append(saved_path)
                public_url = (
                    _public_url_for_upload(request, storage_key, m_type, bucket=target_bucket)
                    if publish_immediately
                    else None
                )

                m_file = ImageFile(
                    image=image,
                    file_role=m_role,
                    file_type=m_type,
                    storage_provider=_storage_provider(),
                    storage_bucket=target_bucket,
                    storage_key=storage_key,
                    public_url=public_url,
                    is_public=public_url is not None,
                    file_size_mb=round(total_bytes / (1024 * 1024), 3),
                    checksum=checksum,
                )
                db.add(m_file)
                db.flush()
                stored_file_rows.append((m_file, m_upload.filename))

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
            "modality_metadata": image.modality_metadata or {},
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
