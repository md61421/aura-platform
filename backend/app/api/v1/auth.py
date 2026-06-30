from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.dependencies import require_user
from app.db.models import User
from app.schemas.user import UserRead

router = APIRouter()


@router.get("/me", response_model=UserRead)
def read_current_user(
    current_user: Annotated[User, Depends(require_user)],
) -> User:
    return current_user
