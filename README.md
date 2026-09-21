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
