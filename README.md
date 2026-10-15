# CivIQ Backend

FastAPI + PostgreSQL API for the [CivIQ frontend](../civiq-frontend) — construction intelligence: projects, drawings, 3D models, takeoff, BOQ, cost, schedule (CPM), coordination, revisions, risks (Monte Carlo), simulations, reports, documents, team, notifications, activity, and an AI Copilot with tool-calling.

The frontend's `src/services/*.api.ts` + `src/mocks/handlers.ts` are the contract; every endpoint mirrors them (base path `/api`, Bearer JWT, `{data,total,page,limit}` envelopes).

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
# API: http://localhost:8000/docs | MinIO: http://localhost:9001 | PG: localhost:5432
```

Seed the demo workspace (mirrors the frontend MSW fixtures):

```bash
docker compose exec api python -m app.seed
# demo@civiq.ai / demo1234
```

## Quick start (local Python)

```bash
python -m venv .venv && .venv/Scripts/activate  # Windows
pip install -r requirements.txt
cp .env.example .env
python -m app.seed   # creates SQLite db at ./data/civiq.db when Postgres is down
uvicorn app.main:app --reload --port 8000
```

Point the frontend at it: `VITE_API_URL=http://localhost:8000/api`, `VITE_USE_MSW=false`, `VITE_BYPASS_AUTH=false`.

## Layout

`app/` — `main.py` (app + CORS + routers), `config.py`, `db.py`, `deps.py` (auth/RBAC/pagination), `security.py` (JWT + rotating refresh), `models/` (SQLAlchemy), `schemas/` (Pydantic, mirrors frontend `@/types`), `routers/` (one per frontend service), `services/` (CPM, Monte Carlo, forecasts, clash, reports, exports, imports), `storage/` (S3/MinIO + local fallback), `realtime/` (WS + Redis pub/sub), `copilot/` (OpenAI-compatible agent + 12 tools + SSE), `jobs.py` (RQ with sync fallback), `seed.py`.
