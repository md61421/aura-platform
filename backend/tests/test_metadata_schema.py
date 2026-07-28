from uuid import uuid4

from app.api.v1.metadata_schema import create_metadata_field, delete_metadata_field, list_metadata_fields
from app.api.v1.router import api_router
from app.db.models import User
from app.db.models.enums import Modality, UserRole
from app.schemas.metadata_schema import MetadataFieldCreate


class FakeMetadataSession:
    def __init__(self, fields=None):
        self.fields = fields or []
        self.added = []
        self.deleted = []

    def scalars(self, statement):
        class Result:
            def __init__(self, items):
                self.items = items

            def all(self):
                return self.items

        filtered = [f for f in self.fields if getattr(f, "modality", None) == Modality.ASL] if self.fields else []
        return Result(filtered)

    def scalar(self, statement):
        return None

    def get(self, model, id):
        return next((f for f in self.fields if getattr(f, "id", None) == id), None)

    def add(self, obj):
        if getattr(obj, "id", None) is None:
            obj.id = uuid4()
        self.fields.append(obj)
        self.added.append(obj)

    def delete(self, obj):
        self.deleted.append(obj)
        self.fields = [f for f in self.fields if f.id != obj.id]

    def commit(self):
        pass

    def refresh(self, obj):
        pass


def make_admin():
    return User(id=uuid4(), email="admin@example.org", role=UserRole.ADMIN, is_active=True)


def test_list_metadata_fields_public():
    db = FakeMetadataSession()
    res = list_metadata_fields(modality=Modality.ASL, db=db)
    assert res == []


def test_admin_create_and_delete_metadata_field():
    admin = make_admin()
    db = FakeMetadataSession()
    payload = MetadataFieldCreate(
        modality=Modality.ASL,
        key="test_bolus_dur",
        label="Test Bolus Duration",
        unit="ms",
        field_type="number",
        is_required=True,
        example="1500",
        display_order=1,
    )
    field = create_metadata_field(payload=payload, current_user=admin, db=db)
    assert field.key == "test_bolus_dur"
    assert field.label == "Test Bolus Duration"

    delete_metadata_field(field_id=field.id, current_user=admin, db=db)
    assert len(db.deleted) == 1


def test_metadata_schema_routes_are_registered():
    paths = {route.path for route in api_router.routes}
    assert "/metadata-schema" in paths
