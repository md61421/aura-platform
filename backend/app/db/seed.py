import json
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Artifact, ArtifactTag, Tag, User
from app.db.models.enums import ArtifactStatus, Modality, TagType, UserRole
from app.db.session import SessionLocal

SEED_DATA_PATH = Path(__file__).with_name("seed_data") / "artifacts.json"
REVIEWER_EMAIL = "reviewer@aura.local"


def parse_enum(enum_class, value: str | None, default):
    if not value:
        return default
    return enum_class(value)


def load_seed_data() -> dict[str, Any]:
    with SEED_DATA_PATH.open(encoding="utf-8") as seed_file:
        return json.load(seed_file)


def get_or_create_user(db: Session) -> User:
    user = db.scalar(select(User).where(User.email == REVIEWER_EMAIL))
    if user:
        user.name = "AURA Reviewer"
        user.role = UserRole.REVIEWER
        return user

    user = User(
        name="AURA Reviewer",
        email=REVIEWER_EMAIL,
        role=UserRole.REVIEWER,
    )
    db.add(user)
    db.flush()
    return user


def get_or_create_tag(db: Session, data: dict[str, Any]) -> Tag:
    tag = db.scalar(select(Tag).where(Tag.name == data["name"]))
    tag_type = parse_enum(TagType, data.get("tag_type"), TagType.OTHER)
    modality_scope = parse_enum(Modality, data.get("modality_scope"), Modality.ALL)

    if tag:
        tag.tag_type = tag_type
        tag.modality_scope = modality_scope
        tag.is_active = data.get("is_active", True)
        return tag

    tag = Tag(
        name=data["name"],
        tag_type=tag_type,
        modality_scope=modality_scope,
        is_active=data.get("is_active", True),
    )
    db.add(tag)
    db.flush()
    return tag


def upsert_artifact(db: Session, data: dict[str, Any]) -> Artifact:
    artifact = db.scalar(select(Artifact).where(Artifact.title == data["title"]))
    default_modality = parse_enum(Modality, data.get("default_modality"), Modality.UNKNOWN)
    status = parse_enum(ArtifactStatus, data.get("status"), ArtifactStatus.APPROVED)

    if not artifact:
        artifact = Artifact(title=data["title"])
        db.add(artifact)

    artifact.aliases = data.get("aliases", [])
    artifact.explanation = data.get("explanation")
    artifact.visual_description = data.get("visual_description")
    artifact.remedies = data.get("remedies", [])
    artifact.default_modality = default_modality
    artifact.status = status
    db.flush()
    return artifact


def link_artifact_tags(db: Session, artifact: Artifact, tags_by_name: dict[str, Tag], tag_names: list[str]) -> None:
    existing_tag_ids = {
        artifact_tag.tag_id
        for artifact_tag in db.scalars(
            select(ArtifactTag).where(ArtifactTag.artifact_id == artifact.id)
        )
    }

    for tag_name in tag_names:
        tag = tags_by_name[tag_name]
        if tag.id not in existing_tag_ids:
            db.add(ArtifactTag(artifact=artifact, tag=tag))


def seed(db: Session) -> None:
    seed_data = load_seed_data()
    get_or_create_user(db)

    tags_by_name = {
        tag_data["name"]: get_or_create_tag(db, tag_data)
        for tag_data in seed_data.get("tags", [])
    }

    seeded_titles = []
    for artifact_data in seed_data.get("artifacts", []):
        artifact = upsert_artifact(db, artifact_data)
        link_artifact_tags(db, artifact, tags_by_name, artifact_data.get("tags", []))
        seeded_titles.append(artifact.title)

    db.commit()
    print(f"Seeded {len(seeded_titles)} artifacts: {', '.join(seeded_titles)}")


def main() -> None:
    with SessionLocal() as db:
        seed(db)


if __name__ == "__main__":
    main()
