# AURA Frontend

Vite + React prototype for browsing AURA artifacts.

The frontend now reads artifact data from the FastAPI backend. It no longer uses
local fake artifact JSON.

## Setup

From the `frontend/` directory:

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open:

```text
http://localhost:5173
```

## Backend Requirement

Start the backend first:

```bash
cd ../backend
./venv/bin/python -m uvicorn app.main:app --reload
```

The API should be available at:

```text
http://127.0.0.1:8000/api/v1
```

## Environment

The frontend uses this Vite environment variable:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
```

Use `.env.local` for local overrides. Do not commit `.env.local`.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Current Backend Integration

Implemented frontend API calls:

- `GET /artifacts`
- `GET /artifacts/{id}`

The adapter in `src/services/api.js` maps backend fields like `title`,
`visual_description`, `tags`, and `images` into the temporary UI shape used by
the prototype components.

Still mocked or local-only:

- submission form
- admin review queue
- profile page
- compare page
- voting
- quality assessment panel
