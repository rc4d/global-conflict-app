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

## License

This project is licensed under the MIT License — see [LICENSE](LICENSE).
