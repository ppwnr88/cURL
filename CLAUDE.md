# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A single-page Postman-like HTTP request tester. No persistence, no login. The frontend sends request config to a local Express proxy, which executes real `curl` subprocess calls and returns structured responses.

## Commands

```bash
npm run dev          # Start both frontend (Vite :5173) and backend (Express :3001) concurrently
npm run dev:client   # Frontend only
npm run dev:server   # Backend only (tsx watch)
npm run build        # Build both (vite build + tsc)
npm start            # Run built server (after build)
npx tsc -p tsconfig.json --noEmit        # Type-check client
npx tsc -p tsconfig.server.json --noEmit # Type-check server
```

## Architecture

**Two separate TypeScript contexts:**
- `tsconfig.json` — bundler mode for Vite/React client (`src/client/`)
- `tsconfig.server.json` — NodeNext module resolution for Express server (`src/server/`), emits to `dist/server/`

**Server clean architecture layers (`src/server/`):**
- `domain/types.ts` — all shared types, zero dependencies
- `application/executeRequest.usecase.ts` — orchestration only; validates URL, calls infrastructure
- `infrastructure/curlExecutor.ts` — executes `curl` subprocess; uses temp files (`-o bodyFile -D headersFile -w '%{http_code}|%{time_total}|%{size_download}'`); parses headers file (handles HTTP/1.x and HTTP/2 status lines); cleans up temp files in `finally`
- `presentation/routes/proxy.route.ts` — Express router; `POST /api/execute`
- `presentation/server.ts` — Express app setup, CORS, dotenv

**Client (`src/client/`):**
- `types/index.ts` — client-side copy of domain types (no cross-boundary imports)
- `hooks/useRequest.ts` — `{ response, loading, error, send }` — POSTs to `VITE_API_URL/api/execute`
- `components/KeyValueTable.tsx` — shared reusable table (Params, Headers, form-data, urlencoded); auto-adds empty row when last row is typed into
- `components/UrlBar.tsx` — method dropdown + URL input + Send button
- `components/RequestPanel/` — tabs: Params, Headers, Body (none/raw/form-data/urlencoded), Auth (None/Bearer/Basic/API Key)
- `components/ResponsePanel/` — status badge, timing, size; Body (Pretty/Raw toggle), Headers tabs

## Environment

```
PORT=3001            # Express server port
VITE_API_URL=http://localhost:3001  # Used by client to call the proxy
```

## Key Design Decisions

- **Real curl subprocess** — the backend runs actual `curl` binary, not axios/fetch. This ensures authentic curl behavior (TLS, proxy settings, etc.)
- **Temp file approach** — curl writes body to `$TMPDIR/curl-body-{uuid}.bin` and headers to `$TMPDIR/curl-headers-{uuid}.txt`. This cleanly separates headers from body without fragile stdout parsing.
- **Client types are a copy** — `src/client/types/index.ts` mirrors server domain types intentionally so client/server remain independently deployable without shared imports.
- **No shared `src/shared/` folder** — types are duplicated by design to preserve clean architecture boundaries.
