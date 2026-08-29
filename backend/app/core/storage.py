import logging
from pathlib import Path
from typing import BinaryIO

from fastapi import Request
from supabase import Client, create_client

from app.core.config import settings
from app.db.models.enums import FileType, StorageProvider

logger = logging.getLogger(__name__)

_supabase_client: Client | None = None


def get_supabase_client() -> Client | None:
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    import os
    supabase_url = settings.SUPABASE_URL or os.environ.get("SUPABASE_URL")
    service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY or os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    if not service_role_key or not supabase_url:
        # Re-try loading from .env if empty
        from dotenv import dotenv_values
        env_vals = {**dotenv_values(".env"), **dotenv_values("../.env")}
        supabase_url = supabase_url or env_vals.get("SUPABASE_URL")
        service_role_key = service_role_key or env_vals.get("SUPABASE_SERVICE_ROLE_KEY")

    if supabase_url and service_role_key:
        try:
            _supabase_client = create_client(
                supabase_url.rstrip("/"),
                service_role_key,
            )
            return _supabase_client
        except Exception as exc:
            logger.error("Failed to initialize Supabase client: %s", exc)
            return None
    return None


def get_storage_root() -> Path:
    root = Path(settings.LOCAL_STORAGE_ROOT)
    if not root.is_absolute():
        root = Path.cwd() / root
    return root


def content_type_for_file_type(file_type: FileType) -> str:
    mapping = {
        FileType.PNG: "image/png",
        FileType.JPG: "image/jpeg",
        FileType.NII_GZ: "application/gzip",
        FileType.NIFTI: "application/octet-stream",
        FileType.DICOM: "application/dicom",
        FileType.OTHER: "application/octet-stream",
    }
    return mapping.get(file_type, "application/octet-stream")


def upload_to_supabase(
    bucket: str,
    storage_key: str,
    file_bytes: bytes,
    content_type: str = "application/octet-stream",
) -> str:
    client = get_supabase_client()
    if not client:
        raise RuntimeError("Supabase client is not configured with SUPABASE_SERVICE_ROLE_KEY.")

    client.storage.from_(bucket).upload(
        path=storage_key,
        file=file_bytes,
        file_options={
            "content-type": content_type,
            "upsert": "true",
        },
    )
    return storage_key


def get_public_url(
    storage_key: str,
    bucket: str | None = None,
    storage_provider: StorageProvider = StorageProvider.SUPABASE_STORAGE,
    request: Request | None = None,
) -> str | None:
    target_bucket = bucket or settings.APPROVED_STORAGE_BUCKET

    if storage_provider == StorageProvider.SUPABASE_STORAGE:
        client = get_supabase_client()
        if client:
            try:
                return client.storage.from_(target_bucket).get_public_url(storage_key)
            except Exception as exc:
                logger.warning("Failed to generate Supabase public URL: %s", exc)

        # Fallback to standard Supabase CDN public URL format if client not initialized
        if settings.SUPABASE_URL:
            base_url = settings.SUPABASE_URL.rstrip("/")
            return f"{base_url}/storage/v1/object/public/{target_bucket}/{storage_key}"

    if storage_provider == StorageProvider.LOCAL_DEV and request:
        try:
            return str(request.url_for("local_upload", path=storage_key))
        except Exception:
            return f"/uploads/{storage_key}"

    return None


def delete_from_supabase(bucket: str, storage_keys: list[str]) -> None:
    client = get_supabase_client()
    if not client or not storage_keys:
        return
    try:
        client.storage.from_(bucket).remove(storage_keys)
    except Exception as exc:
        logger.warning("Failed to delete files from Supabase storage: %s", exc)


def delete_storage_file(
    storage_key: str,
    bucket: str | None = None,
    storage_provider: StorageProvider = StorageProvider.SUPABASE_STORAGE,
) -> None:
    if storage_provider == StorageProvider.SUPABASE_STORAGE:
        delete_from_supabase(bucket or settings.APPROVED_STORAGE_BUCKET, [storage_key])

    try:
        local_path = get_storage_root() / storage_key
        local_path.unlink(missing_ok=True)
    except Exception as exc:
        logger.warning("Failed to delete local storage file %s: %s", storage_key, exc)

