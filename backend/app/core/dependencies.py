from collections.abc import Generator

from sqlalchemy.orm import Session

from app.core.exceptions import not_implemented_exception
from app.db.session import get_db


def get_db_session() -> Generator[Session, None, None]:
    yield from get_db()


def get_current_user_optional():
    # Authentication will be added in a later chunk.
    return None


def require_admin():
    # Admin authorization will be added in a later chunk.
    raise not_implemented_exception("Admin authentication")
