import os

os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+psycopg2://aura_test:aura_test@localhost:5432/aura_test",
)
