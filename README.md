# AI Orchestrator

Full-stack AI orchestration app:
- Frontend: React + Vite
- API: Express
- Deploy target: Netlify (frontend + serverless function wrapper)
- Local DB: PostgreSQL via Docker Compose
- Optional no-DB mode: provider keys from environment variables (e.g. `HUGGINGFACE_API_KEY`)

## 1) Local run

1. Copy `.env.example` to `.env` and update values.
2. Start Postgres:
   - `docker compose up -d`
3. Start API:
   - `npm run dev:api`
4. Start frontend:
   - `npm run dev`
5. Open:
   - `http://localhost:8080`

## 2) Netlify deploy

1. Push this repo to GitHub.
2. In Netlify: **Add new site** -> **Import from Git** -> select this repo.
3. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add Netlify environment variables:
   - `DATABASE_URL`
   - `ENCRYPTION_KEY`
   - `CORS_ORIGIN` (your Netlify URL)
5. Deploy.

## 3) Database note

Netlify cannot run Docker containers for production databases.
Use a managed Postgres provider (Neon, Supabase, Railway, Render Postgres, etc.) and place that connection string in `DATABASE_URL` on Netlify.

`docker-compose.yml` is for local development only.

## 4) Quick no-DB deploy

If you want to use only Hugging Face without database setup:
- Set `HUGGINGFACE_API_KEY` in Netlify environment variables
- Optionally set `HUGGINGFACE_MODEL`
- Redeploy
