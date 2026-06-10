from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.dependencies import get_db_session
from app.db.models import Tag
from app.db.models.enums import Modality, TagType
from app.schemas.tag import TagRead

router = APIRouter()


@router.get("", response_model=list[TagRead])
def list_tags(
    db: Session = Depends(get_db_session),
    tag_type: TagType | None = Query(default=None),
    modality_scope: Modality | None = Query(default=None),
    include_inactive: bool = Query(default=False),
):
    statement = select(Tag)

    if not include_inactive:
        statement = statement.where(Tag.is_active.is_(True))
    if tag_type:
        statement = statement.where(Tag.tag_type == tag_type)
    if modality_scope:
        statement = statement.where(Tag.modality_scope == modality_scope)

    statement = statement.order_by(Tag.name)
    return db.scalars(statement).all()
