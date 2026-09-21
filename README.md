## What is fintech?
Fintech Frontend + Backend Prototype is a streamlined, AI-driven platform that connects startups with investors through intelligent matching. It integrates a Vite-based frontend with a FastAPI backend to deliver a fast, modular, and scalable system.

Startups upload pitch decks, investors define their thesis and preferences, and the platform generates high-quality matches on both sides. An embedded AI service produces personalized introduction emails, reducing friction in initial outreach.

The system follows a clean three-layer architecture, client interface, API layer, and data layer, using an in-memory store for rapid prototyping with clear extensibility toward production-grade databases. Core workflows include deck ingestion, investor onboarding, bidirectional match discovery, and AI-assisted communication, all accessible through well-documented APIs via Swagger.

## Backend setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# paste your real GROQ_API_KEY in backend/.env
uvicorn main:app --reload --port 8000
```

The frontend calls `/api` by default. In local development, Vite proxies that path to
`http://localhost:8000`; in Vercel, the same path is served by the included Python
function. Set `VITE_API_URL` only when deploying the API to a separate origin.

### VentureLink prototype auth and data

The root `src/` application is the frontend. `api/index.py` imports the FastAPI app
from `backend/main.py`; `fintech-frontend/` is not used by the root Vite build.

The app uses Google OAuth only. It does not collect or store passwords. Successful
Google sign-in creates or updates a local VentureLink user and establishes an
HTTP-only signed session cookie. Local development uses SQLite at
`backend/venturelink.db` by default. Set `DATABASE_URL` to a PostgreSQL or Supabase
connection string for persistent hosted data.

New authenticated routes include:

- `GET /auth/me`, `GET /auth/google`, `GET /auth/google/callback`, `POST /auth/logout`
- `GET /profiles/me`, `PUT /profiles/startup`, `PUT /profiles/investor`
- `GET /discover`
- `POST /connections`, `GET /connections`, `POST /connections/{id}/accept`
- `POST /ai/chat`, `POST /ai/intro/{target_id}`

Matching is deterministic and transparent: sector, stage, geography, and funding or
ticket data contribute to a percentage and alignment reasons. Groq is used only for
natural-language explanations, introductions, and assistant answers; profile data
comes from the database.

### Google OAuth setup

1. In Google Cloud Console, create or select a project.
2. Configure the OAuth consent screen as an External or Internal app, add the app name,
  support email, developer contact email, and the `openid`, `email`, and `profile`
  scopes. Add test users while the app is in testing.
3. Create an OAuth 2.0 Client ID with application type `Web application`.
4. Add this exact local authorized redirect URI:
  `http://localhost:5173/api/auth/google/callback`
5. For Vercel, add the deployed redirect URI:
  `https://YOUR-VERCEL-DOMAIN/api/auth/google/callback`
6. Copy the client ID and secret into the backend environment only. Never expose them
  through a `VITE_*` variable.

### Environment variables

Copy `backend/.env.example` to `backend/.env` and set:

```env
DATABASE_URL=sqlite:///./venturelink.db
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5173/api/auth/google/callback
SESSION_SECRET=replace-with-a-long-random-value
FRONTEND_URL=http://localhost:5173
SESSION_COOKIE_SECURE=false
GROQ_API_KEY=gsk-your-key-here
```

For Supabase, create a PostgreSQL database and set `DATABASE_URL` to its pooled or
direct connection string, for example `postgresql://USER:PASSWORD@HOST:5432/postgres`.
The application creates its tables on startup; no migration command is needed for
this prototype. Install dependencies and run locally with:

```bash
pip install -r backend/requirements.txt
cd backend
python -m uvicorn main:app --reload --port 8000
```

In another terminal, from the repository root, run `npm install` and `npm run dev`.

### Vercel deployment

Deploy from the repository root. Add `DATABASE_URL`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `SESSION_SECRET`, `FRONTEND_URL`,
`SESSION_COOKIE_SECURE=true`, and `GROQ_API_KEY` to the Vercel project environment.
Update Google Cloud Console with the exact Vercel callback URI before testing login.
Use PostgreSQL or Supabase in Vercel; the local SQLite fallback is not suitable for
serverless persistence.

Prototype limitations: database tables are initialized with `create_all`, OAuth has
no account linking beyond Google identity, there is no real-time messaging, and the
in-memory legacy routes remain for compatibility with the original demo endpoints.

### Key endpoints

- `POST /startup/upload-deck` — upload a startup pitch deck PDF
- `GET /startup/{id}/matches` — get investor matches for a startup
- `POST /investor/register` — register investor thesis/preferences
- `GET /investor/{id}/dealflow` — get startup dealflow for investor
- `GET /intro/{startup_id}/{investor_id}` — generate intro email
- `GET /docs` — interactive Swagger docs

## Frontend setup

```bash
npm install
npm run dev
```

Open Vite local URL (typically `http://localhost:5173`).

## Deploy on Vercel

This repository is configured for a single Vercel project: Vite builds the frontend
and `api/index.py` exposes the FastAPI backend under `/api/*`.

1. Import the repository into Vercel and leave the root directory as the repository root.
2. Add `GROQ_API_KEY` in **Settings → Environment Variables** if you want pitch-deck
   extraction and intro-email generation. Profile registration and deterministic matching
   work without it.
3. Deploy. No frontend environment variable is needed for the default same-origin API.

> The prototype uses in-memory storage. Vercel functions can be recreated between
> requests, so replace the dictionaries in `backend/main.py` with a persistent database
> before relying on stored profiles in production.

### Auth flow notes

- Frontend auth is currently local/demo mode (no backend auth API).
- Use any non-empty `name`, `email`, and `password` to continue.
- Role selected on sign-in decides dashboard route:
  - `startup` → startup dashboard
  - `investor` → investor dashboard
- Session is persisted in localStorage; use the `Logout` button to clear it.

## Auth + role dashboards (frontend)

- Users first land on a simple auth screen and choose role (`startup` or `investor`).
- Startup users are routed to startup dashboard flow.
- Investor users are routed to investor dashboard flow.

## 3-minute API demo (copy/paste)

After backend is running on `http://localhost:8000`, run the following in a new terminal.

### 1) Register an investor

```bash
curl -s -X POST http://localhost:8000/investor/register \
  -H "Content-Type: application/json" \
  -d '{
    "partner_name":"Priya Mehta",
    "firm_name":"Nexus Venture Partners",
    "thesis":"We back fintech infrastructure startups in India.",
    "sectors":"Fintech, SaaS",
    "stages":"Seed, Series A"
  }'
```

Copy the `investor_id` from response.

### 2) Upload startup deck

```bash
curl -s -X POST http://localhost:8000/startup/upload-deck \
  -F "file=@/absolute/path/to/pitch-deck.pdf"
```

Copy the `startup_id` from response.

### 3) Get startup -> investor matches

```bash
curl -s "http://localhost:8000/startup/<startup_id>/matches"
```

### 4) Get investor dealflow

```bash
curl -s "http://localhost:8000/investor/<investor_id>/dealflow"
```

### 5) Generate intro email draft

```bash
curl -s "http://localhost:8000/intro/<startup_id>/<investor_id>"
```

### 6) (Optional) Case #6 demo endpoints

```bash
curl -s "http://localhost:8000/india-investor/opportunity-radar"
curl -s "http://localhost:8000/india-investor/chart-patterns/RELIANCE"
curl -s -X POST "http://localhost:8000/india-investor/market-chat" \
  -H "Content-Type: application/json" \
  -d '{"question":"Any near-term breakout opportunities?","portfolio":["INFY","HDFCBANK"]}'
```
