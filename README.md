# aura-platform
AURA: Artifact User Repository for Perfusion Imaging — searchable, image-centric artifact platform.

AURA aims to help researchers organize, search, and review perfusion imaging artifacts.

## Current Structure

- `backend/` - FastAPI backend application.
- `frontend/` - frontend application placeholder.
- `database/`, `infra/`, `scripts/`, `tests/`, `docs/`, `data-pipeline/` - planned project areas.
- `docker-compose.yml` - Docker Compose scaffold.

## Backend Setup

From the project root:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a local environment file:

```bash
cp ../.env.example ../.env
```

Run the API locally:

```bash
uvicorn app.main:app --reload
```

The API should be available at:

- `http://127.0.0.1:8000`
- `http://127.0.0.1:8000/docs`
