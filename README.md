# AURA Platform

AURA is an Artifact User Repository for Perfusion Imaging. The goal is to help
researchers browse, search, review, and eventually contribute perfusion imaging
artifact examples.

This repository currently contains:

- `backend/`: FastAPI API with SQLAlchemy models and Alembic migrations.
- `frontend/`: Vite + React prototype for browsing artifacts.
- `docker-compose.yml`: local PostgreSQL service.
- `database/`, `infra/`, `scripts/`, `tests/`, `docs/`, `data-pipeline/`: planned project areas.

## Current Status

Working backend/API slice:

- `GET /api/v1/artifacts`
- `GET /api/v1/artifacts/{artifact_id}`
- `POST /api/v1/submissions`
- `GET /api/v1/tags`
- `GET /api/v1/health`
- `GET /api/v1/health/db`

Working frontend slice:

- artifact browse page
- artifact detail page
- artifact submission form
- API adapter for the current backend endpoints

Prototype or local-only frontend pages:

- admin review queue
- profile page
- compare page
- localStorage voting
- hardcoded quality assessment panel

## Requirements

- Python 3.12+
- Node.js and npm
- Docker, if using the local PostgreSQL database

## Backend Setup

From the project root:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Create a local environment file from the project root:

```bash
cp .env.example .env
```

Edit `.env` and set the local database values. The file is private and should
not be committed.

Start PostgreSQL from the project root:

```bash
docker compose up -d db
```

Run migrations from `backend/`:

```bash
./venv/bin/alembic upgrade head
```

Optional: seed demo data from `backend/`:

```bash
./venv/bin/python -m app.db.seed
```

Run the API from `backend/`:

```bash
./venv/bin/python -m uvicorn app.main:app --reload
```

If your virtual environment is already activated, this also works:

```bash
python -m uvicorn app.main:app --reload
```

Avoid running bare `uvicorn` unless `which uvicorn` points inside
`backend/venv/`. Otherwise Python may use the system Uvicorn and fail to find
project dependencies like FastAPI.

The backend should be available at:

- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/api/v1/health`

## Frontend Setup

The frontend is a Vite + React app in `frontend/`. Start the backend first.

From the project root:

```bash
cd frontend
npm install
npm run dev
```

The frontend should be available at:

- `http://localhost:5173`

The default frontend API URL is:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```
