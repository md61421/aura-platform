from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "AURA Platform API"
    API_V1_PREFIX: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    BACKEND_CORS_ORIGINS: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173", "http://localhost:3000"]
    )
    DATABASE_URL: str = Field(
        ...,
        description="SQLAlchemy database URL. Set via environment or a private .env file.",
    )
    STORAGE_PROVIDER: str = "local_dev"
    PRIVATE_STORAGE_BUCKET: str = "aura-submissions-staging"
    APPROVED_STORAGE_BUCKET: str = "aura-approved-artifacts"
    LOCAL_STORAGE_ROOT: str = "uploads"
    DEV_AUTO_APPROVE_SUBMISSIONS: bool = True

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env"),
        env_file_encoding="utf-8",
        enable_decoding=False,
        extra="ignore",
    )

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, value: bool | str) -> bool:
        if isinstance(value, str):
            value = value.strip().lower()
            if value in {"1", "true", "yes", "on", "debug", "development"}:
                return True
            if value in {"0", "false", "no", "off", "release", "production"}:
                return False
        return value

    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            value = value.strip()
            if not value:
                return []
            if value.startswith("[") and value.endswith("]"):
                value = value[1:-1]
            return [origin.strip().strip('"').strip("'") for origin in value.split(",")]
        return value


settings = Settings()
