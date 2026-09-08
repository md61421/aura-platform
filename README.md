# AURA Platform

> A community-driven dictionary and repository to establish consensus on perfusion MRI artifacts, help researchers and clinicians recognize them, and share real-world examples.

[![CI](https://github.com/md61421/aura-platform/actions/workflows/ci.yml/badge.svg)](https://github.com/md61421/aura-platform/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python: 3.12](https://img.shields.io/badge/Python-3.12-blue.svg)](https://www.python.org/)
[![Node.js: 22](https://img.shields.io/badge/Node.js-22-green.svg)](https://nodejs.org/)
[![React: 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688.svg)](https://fastapi.tiangolo.com/)

---

## Overview

- **The Problem:** Perfusion MRI scans (such as ASL, DSC, DCE, and IVIM) often have imaging errors (artifacts) like false shadows, motion blurs, or scanner noise. Researchers and clinicians are often unfamiliar with how these artifacts look and can easily mistake them for real brain disease (like stroke or tumors), corrupting research studies and clinical trials.
- **The Solution:** Developed under the [Open Science Initiative for Perfusion Imaging (OSIPI)](https://www.osipi.org/) for Google Summer of Code 2026, **AURA (Artifact User Repository for Perfusion Imaging)** is an open, community-driven dictionary and consensus repository. It provides researchers with a centralized platform to recognize imaging artifacts, understand their root causes and scanner remedies, and contribute validated examples to establish international standards.

### Features

- 🔍 **Search & Filters:** Find artifacts by visual symptoms (e.g., _"Fat Shift"_, _"Transit Time"_, _"Motion"_) and filter by scan modality (ASL, DSC, DCE, IVIM), scanner vendor (Siemens, Philips, GE), sequence, or field strength.
- 🖼️ **Multi-Slice Image Inspection:** View high-resolution 2D slice stacks and multi-planar montages (Axial, Coronal, Sagittal) with interactive slice navigation and zoom.
- 💡 **Root Causes & Prevention Tips:** Every artifact includes a clear explanation of _why_ it happened, tips for scan operators to prevent it at the scanner, and links to published scientific literature.
- 📝 **Contribution:** Authenticated users can upload new scan examples with drag-and-drop slice reordering and key representative slice selection.
- ⚙️ **Dynamic Modality Parameters:** Upload forms adapt automatically to the selected scan type (e.g., labeling time and delay for ASL vs. contrast dosage for DSC) without requiring code changes.
- 🗳️ **Community Reliability Voting & Comments:** Vote _Agree_ or _Disagree_ on artifact diagnoses to build community consensus and discuss challenging scans in comment threads.
- 🛡️ **Reviewer Moderation Queue:** Reviewers and admins can inspect pending submissions, request changes from submitters, approve entries for public release, or archive records.
- 👤 **Contributor:** Authors can manage their submissions, track review progress, and edit or withdraw submitted scans directly from their profile.

---

## Architecture & Tech Stack

- **Languages & Frameworks:**
  - **Backend API:** Python 3.12, [FastAPI](https://fastapi.tiangolo.com/) `0.136.1`, [Pydantic](https://docs.pydantic.dev/) v2, [Uvicorn](https://www.uvicorn.org/) `0.46.0`
  - **Database & ORM:** [SQLAlchemy](https://www.sqlalchemy.org/) `2.0.49`, [Alembic](https://alembic.sqlalchemy.org/) `1.18.4`, `psycopg2-binary` `2.9.12`
  - **Frontend UI:** JavaScript (ES modules), [React](https://react.dev/) `19.2.4`, [Vite](https://vite.dev/) `8.0.0`, [React Router](https://reactrouter.com/) `7.13.1`, [Tailwind CSS](https://tailwindcss.com/) `4.2.2`
- **Infrastructure / Services:**
  - **Database:** PostgreSQL 16 (via official `postgres:16` Docker image) with native `JSONB` support and relational indexing
  - **Authentication:** [Supabase Auth](https://supabase.com/docs/guides/auth) with JWT verification supporting RS256/ES256 JWKS caching and HS256 signing
  - **File Storage:** Dual-backend storage engine supporting [Supabase Storage](https://supabase.com/docs/guides/storage) buckets and local filesystem staging (`uploads/`)
- **Repository Structure:**

```text
aura-platform/
├── backend/
│   ├── alembic/              # Database migration versions and env configuration
│   ├── app/
│   │   ├── api/v1/           # REST endpoints (artifacts, submissions, review, auth, schema)
│   │   ├── core/             # JWT auth validation, storage engine, settings, permissions
│   │   ├── db/               # SQLAlchemy models (Artifact, Image, Submission, Vote, Comment)
│   │   │   ├── models/       # Relational models with JSONB schemas and enum definitions
│   │   │   └── seed_data/    # Curated baseline artifact dictionary (seed JSON)
│   │   ├── schemas/          # Pydantic request and response schemas
│   │   └── main.py           # FastAPI application instance, CORS, static uploads mount
│   └── tests/                # Automated pytest test suites (74 test cases)
├── frontend/
│   ├── src/
│   │   ├── auth/             # Supabase AuthProvider, role-based route guard (RequireRole)
│   │   ├── components/       # ImageGallery, ArtifactCard, FilterSidebar, Navbar, Layout
│   │   ├── pages/            # Home, Detail, Submission, Admin, Profile, Compare, Auth
│   │   └── services/         # Centralized API client and data transformation adapters
│   ├── package.json          # Node.js dependencies, scripts, and dev tooling
│   └── vite.config.js        # Vite 8 + React + Tailwind CSS build configuration
├── docker-compose.yml        # Multi-container local PostgreSQL service definition
└── .env.example              # Centralized environment variable template
```

---

## Environment & Configuration

Environment templates are provided in `.env.example` (backend & database) and `frontend/.env.example` (frontend client). Create your local files before starting:

```bash
# 1. Root environment (Backend API, Database, Auth, Storage)
cp .env.example .env

# 2. Frontend environment (API URL and Supabase client keys)
cp frontend/.env.example frontend/.env
```

### Key Settings Overview

- **Database (`.env`):** Configures local PostgreSQL Docker credentials and the `DATABASE_URL` (default host port `5433` to prevent conflicts with system Postgres).
- **Storage (`.env`):** Supports both cloud storage (`supabase_storage` using staging/approved buckets) and local disk fallback (`local_dev` in `uploads/`).
- **Authentication (`.env` & `frontend/.env`):** Supabase project URL and JWT credentials for role-based authentication (`public_user`, `contributor`, `reviewer`, `admin`).
- **Frontend API Endpoint (`frontend/.env`):** `VITE_API_BASE_URL` sets the target backend URL (defaults to `http://127.0.0.1:8000/api/v1`).

_(See inline comments in `.env.example` and `frontend/.env.example` for all optional variables and detailed descriptions)._

---

## Developer Workflows

### Prerequisites

- **Python:** 3.12+
- **Node.js:** 20+ (Node 22 LTS recommended) and `npm`
- **Docker:** Docker Engine / Docker Compose (for running PostgreSQL locally)

---

### 1. Database Setup (Docker)

Start the local PostgreSQL 16 service:

```bash
docker compose up -d db
```

_Note: PostgreSQL is exposed on host port `5433` by default to avoid conflicts with existing system Postgres instances._

---

### 2. Backend Setup

From the repository root:

```bash
cd backend

# Step 1: Create a virtual environment (one-time setup)
# Linux / macOS:
python3 -m venv venv
# Windows (Command Prompt / PowerShell):
python -m venv venv

# Step 2: Activate the virtual environment
# Linux / macOS:
source venv/bin/activate
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Windows (Command Prompt):
venv\Scripts\activate.bat

# Step 3: Install dependencies and initialize database (Identical on all operating systems!)
pip install -r requirements-dev.txt
alembic upgrade head
python -m app.db.seed

# Step 4: Start the FastAPI development server
uvicorn app.main:app --reload
```

> 💡 **Tip — Running directly without activating the shell:**  
> If you prefer not to run `activate` every time you open a new terminal, you can run directly via the virtual environment binary:
>
> - **Linux / macOS:** `./venv/bin/python -m uvicorn app.main:app --reload`
> - **Windows (PowerShell/CMD):** `.\venv\Scripts\python -m uvicorn app.main:app --reload`
>
> _(Running bare `python` or `uvicorn` without activating the virtual environment will fail with `ModuleNotFoundError: No module named 'fastapi'` because the terminal will default to your global system Python)._

Once running, explore interactive Swagger documentation at:

- **API Docs:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Health Check:** [http://127.0.0.1:8000/api/v1/health](http://127.0.0.1:8000/api/v1/health)

---

### 3. Frontend Setup

From the repository root:

```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server
npm run dev
```

The web application will be accessible at:

- **Client Application:** [http://localhost:5173](http://localhost:5173)

---

### 4. Testing & Code Quality

#### Backend Test Suite (Pytest)

The test suite validates public endpoints, authentication, user submissions, reviewer workflows, and metadata management across 74 automated tests:

```bash
cd backend

# If your virtual environment is activated:
python -m pytest

# Or directly via the virtual environment binary:
# Linux / macOS:
PYTHONPATH=. ./venv/bin/pytest
# Windows:
.\venv\Scripts\pytest
```

#### Frontend Linting & Production Build

Validate React code conventions and produce optimized production bundles:

```bash
cd frontend

# Run ESLint checks
npm run lint

# Build production bundle with Vite
npm run build
```

#### Continuous Integration (GitHub Actions)

Every pull request and push to `main` triggers `.github/workflows/ci.yml`, running:

- Python 3.12 dependency validation, bytecode compilation, pytest suite, and Alembic head verification.
- Node.js 22 dependency installation (`npm ci`), ESLint validation, and Vite production bundle compilation.

---

## Permissions & Moderation

- **Role-Based Access Control (RBAC):** API endpoints enforce permission tiers via cryptographic Supabase JWT verification. Public users can browse the encyclopedia, authenticated contributors can submit artifact scans, and only users with `reviewer` or `admin` roles can moderate or verify entries.
- **Review Queue:** Reviewers can inspect community submissions through the moderation dashboard to award the `OSIPI Verified` badge, request edits from the submitter, or unpublish/archive an artifact from public view at any time.

---

## Contributing & Community

AURA is an open-source initiative developed under the umbrella of the [Open Science Initiative for Perfusion Imaging (OSIPI)](https://www.osipi.org/). Contributions, bug reports, feature suggestions, and clinical artifact examples are warmly welcomed.

Feel free to open an issue to discuss proposed changes or submit a Pull Request. Please ensure that all backend tests (`pytest`) and frontend checks (`npm run lint && npm run build`) pass before opening a PR.

---

## License

This project is open-source and distributed under the [MIT License](LICENSE).
Copyright (c) 2026 Md Sahil and OSIPI.
