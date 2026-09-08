# AURA Frontend

Web client for the **AURA Platform (Artifact User Repository for Perfusion Imaging)**, built with React 19, Vite 8, React Router 7, and Tailwind CSS v4.

---

## Features

- 🔍 **Catalog & Search (`Home.jsx`):** Instant search by visual symptoms with faceted filtering by modality (ASL, DSC, DCE, IVIM), scanner vendor (Siemens, Philips, GE), sequence, and field strength.
- 🖼️ **Multi-Slice Inspection (`Detail.jsx`):** High-resolution 2D slice stacks and multi-planar montages (Axial, Coronal, Sagittal) with interactive slice navigation and zoom.
- 💡 **Clinical Guides:** Clear explanations of root causes, operator scanner remedies, and published scientific literature for every artifact.
- 🗳️ **Community Consensus (`Detail.jsx`):** Agree / Disagree diagnostic voting with real-time reliability scores and threaded case discussions.
- 📝 **Contribution Wizard (`Submission.jsx`):** Multi-slice upload workflow with drag-and-drop slice reordering, key representative slice selection, and dynamic modality acquisition parameters.
- 🛡️ **Moderation Dashboard (`Admin.jsx`):** Review queue for `reviewer` and `admin` roles to inspect submissions, request edits, approve entries, and manage dynamic modality metadata schemas live.
- 👤 **Contributor Portfolio (`Profile.jsx`):** View and manage personal submissions, track review progress, and edit or withdraw submitted scans.
- ⚖️ **Comparison View (`Compare.jsx`):** Side-by-side artifact comparison tool.

---

## Getting Started

### Prerequisites
- **Node.js:** 20+ (Node 22 LTS recommended)
- **npm**

### 1. Install Dependencies
From the `frontend/` directory:

```bash
npm install
```

### 2. Configure Environment
Copy the example environment file:

```bash
cp .env.example .env
```

Configure your variables in `.env`:

```env
# Target Backend API URL
VITE_API_BASE_URL="http://127.0.0.1:8000/api/v1"

# Supabase Auth Client Configuration
VITE_SUPABASE_URL="https://<project-ref>.supabase.co"
VITE_SUPABASE_ANON_KEY="<supabase-anon-key>"
```

### 3. Start Development Server
Make sure the backend API is running, then start Vite:

```bash
npm run dev
```

The frontend will be available at:
- **Local Application:** [http://localhost:5173](http://localhost:5173)

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Vite local development server with Hot Module Replacement (HMR) |
| `npm run build` | Compiles and bundles production assets into `dist/` |
| `npm run lint` | Runs ESLint to check code quality and React Hooks conventions |
| `npm run preview` | Locally serves the production build from `dist/` |

---

## Project Structure

```text
frontend/
├── src/
│   ├── auth/             # Supabase AuthProvider, useAuth hook, and RequireRole route guard
│   ├── components/       # ImageGallery, ArtifactCard, FilterSidebar, Navbar, Layout, Pagination
│   ├── pages/            # Home, Detail, Submission, Admin, Profile, Compare, Auth
│   ├── services/         # api.js (centralized API client and data transformation adapters)
│   ├── lib/              # supabase.js client configuration
│   ├── App.jsx           # Application routing configuration
│   ├── index.css         # Global Tailwind CSS imports
│   └── main.jsx          # React DOM entrypoint
├── public/               # Static assets
├── package.json          # Dependencies and scripts
└── vite.config.js        # Vite + React + Tailwind CSS build configuration
```
