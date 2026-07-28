from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_db_session, require_reviewer
from app.db.models import ModalityMetadataField, User
from app.db.models.enums import Modality
from app.schemas.metadata_schema import MetadataFieldCreate, MetadataFieldRead, MetadataFieldUpdate

router = APIRouter()


@router.get("", response_model=list[MetadataFieldRead])
def list_metadata_fields(
    modality: Modality | None = None,
    db: Session = Depends(get_db_session),
):
    statement = select(ModalityMetadataField)
    if modality:
        statement = statement.where(ModalityMetadataField.modality == modality)
    statement = statement.order_by(ModalityMetadataField.modality, ModalityMetadataField.display_order, ModalityMetadataField.key)
    return db.scalars(statement).all()


@router.post("", response_model=MetadataFieldRead, status_code=status.HTTP_201_CREATED)
def create_metadata_field(
    payload: MetadataFieldCreate,
    current_user: Annotated[User, Depends(require_reviewer)],
    db: Session = Depends(get_db_session),
):
    key_clean = payload.key.strip().lower().replace("-", "_").replace(" ", "_")
    existing = db.scalar(
        select(ModalityMetadataField).where(
            ModalityMetadataField.modality == payload.modality,
            ModalityMetadataField.key == key_clean,
        )
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Field key '{key_clean}' already exists for modality '{payload.modality.value}'.",
        )

    field = ModalityMetadataField(
        modality=payload.modality,
        key=key_clean,
        label=payload.label.strip(),
        unit=payload.unit.strip() if payload.unit else None,
        field_type=payload.field_type.strip(),
        is_required=payload.is_required,
        example=payload.example.strip() if payload.example else None,
        display_order=payload.display_order,
    )
    db.add(field)
    db.commit()
    db.refresh(field)
    return field


@router.put("/{field_id}", response_model=MetadataFieldRead)
def update_metadata_field(
    field_id: UUID,
    payload: MetadataFieldUpdate,
    current_user: Annotated[User, Depends(require_reviewer)],
    db: Session = Depends(get_db_session),
):
    field = db.get(ModalityMetadataField, field_id)
    if not field:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Metadata field definition not found.")

    if payload.label is not None:
        field.label = payload.label.strip()
    if payload.unit is not None:
        field.unit = payload.unit.strip() if payload.unit else None
    if payload.field_type is not None:
        field.field_type = payload.field_type.strip()
    if payload.is_required is not None:
        field.is_required = payload.is_required
    if payload.example is not None:
        field.example = payload.example.strip() if payload.example else None
    if payload.display_order is not None:
        field.display_order = payload.display_order

    db.commit()
    db.refresh(field)
    return field


@router.delete("/{field_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_metadata_field(
    field_id: UUID,
    current_user: Annotated[User, Depends(require_reviewer)],
    db: Session = Depends(get_db_session),
):
    field = db.get(ModalityMetadataField, field_id)
    if not field:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Metadata field definition not found.")

    db.delete(field)
    db.commit()
