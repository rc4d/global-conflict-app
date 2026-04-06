# Global Conflict App

Monorepo for **Global Conflict Updates**: a Next.js dashboard and an Express + MongoDB API that ingests news, clusters events, and serves updates to the UI.

**Repository:** [github.com/rc4d/global-conflict-app](https://github.com/rc4d/global-conflict-app)

## Layout

| Directory | Description |
|-----------|-------------|
| [`global-conflict-updates/`](global-conflict-updates/) | Backend — Express, MongoDB, NewsAPI/NewsData ingestion, optional OpenAI summaries |
| [`global-conflict-updates-web/`](global-conflict-updates-web/) | Frontend — Next.js dashboard |

## Prerequisites

- **Node.js** — backend ≥ 18; web ≥ 20.9 (see each package’s `engines`)
- **MongoDB** — local via Docker (below) or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
- **API keys** — at least `NEWS_API_KEY` (NewsAPI.org) for ingestion; see backend `.env.example` for optional providers

## Quick start

### 1. Backend

```bash
cd global-conflict-updates
cp .env.example .env
# Edit .env: set MONGODB_URI, NEWS_API_KEY, etc.

npm install
npm run mongo:up    # optional: local Mongo via docker-compose
npm run dev         # API on http://localhost:3000 (default PORT)
```

### 2. Web

```bash
cd global-conflict-updates-web
cp .env.example .env.local
# Ensure NEXT_PUBLIC_API_BASE_URL matches the API (default http://localhost:3000)

npm install
npm run dev         # App on http://localhost:3001
```

Run the API before using features that call the backend. The web app expects the API at `NEXT_PUBLIC_API_BASE_URL`.

## Deploy the web app to Vercel

This monorepo keeps the Next.js app under `global-conflict-updates-web/`. Vercel does not accept `rootDirectory` in root `vercel.json` for this flow; set the app folder in project settings instead.

1. **Create a Vercel project** — In the [Vercel dashboard](https://vercel.com/new), import [**rc4d/global-conflict-app**](https://github.com/rc4d/global-conflict-app). Framework: Next.js (auto-detected). Set **Root Directory** to **`global-conflict-updates-web`** (during import or under **Project Settings → General**). Required so builds use the Next.js app, not the repo root.

2. **Production environment variables** (Vercel → Project → Settings → Environment Variables). Use at least:

   | Name | Value |
   |------|--------|
   | `NEXT_PUBLIC_API_BASE_URL` | Public HTTPS origin of your deployed API (no trailing slash), e.g. `https://api.example.com` |
   | `ADMIN_SYNC_SECRET` | Optional; must match the API’s `ADMIN_SYNC_SECRET` if you use dashboard sync |
   | `NEXT_PUBLIC_UPDATES_MAX_AGE_HOURS` | Optional; see [`global-conflict-updates-web/.env.example`](global-conflict-updates-web/.env.example) |

   Redeploy after changing variables. `NEXT_PUBLIC_*` values are baked in at build time.

3. **Allow CORS on the API** — The Express app only accepts origins listed in `FRONTEND_ORIGIN`. After you have a Vercel URL (and any custom domain), set on the **API host**, for example:

   `FRONTEND_ORIGIN=http://localhost:3001,https://your-app.vercel.app`

   Then restart or redeploy the API. See [`global-conflict-updates/.env.example`](global-conflict-updates/.env.example).

4. **Node version** — The web `package.json` specifies `engines.node` ≥ 20.9; Vercel will pick a matching runtime.

5. **Check it** — Open the Vercel deployment URL; in the browser **Network** tab, requests to your API should return 200. If they fail with CORS errors, fix `FRONTEND_ORIGIN` on the API.

The API itself is not deployed by this step; host it on your provider of choice (Railway, Render, Fly.io, a VPS, etc.) with HTTPS and the same env vars as local (`MONGODB_URI`, `NEWS_API_KEY`, etc.).

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE).
