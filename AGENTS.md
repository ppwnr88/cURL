# AGENTS.md

<!-- BEGIN OBSIDIAN AGENT MEMORY -->

Generated from Obsidian memory: `/Users/ppwnr/obsidian/Projects/side-project-curl.md`
Project source path: `/Users/ppwnr/Desktop/work/side-project/curl`

## Agent Workflow
- Read this file before working in this project.
- Read the linked Obsidian project note for fuller context.
- Verify generated facts against source code before editing.
- Do not paste secrets, tokens, private keys, local env values, logs, database dumps, or generated dependency output into this file or Obsidian.
- When durable project knowledge is discovered, update the Obsidian project note's `## Human Notes` section.

## Project Brief
- Source path: `/Users/ppwnr/Desktop/work/side-project/curl`
- Category: `side-project`
- Git branch: `main`
- Git remote: `https://github.com/ppwnr88/cURL.git`
- Manifests: `package.json`
- Project kind: `Frontend app`
- Package manager: `npm`
- Detected stack: `Express`, `JavaScript/TypeScript`, `React`, `Vite`
- Data hints: none detected
- Quality hints: `TypeScript`
- Graph hubs: [[Graph/Categories/side-project|side-project]], [[Graph/Kinds/frontend-app|Frontend app]], [[Graph/Stacks/express|Express]], [[Graph/Stacks/javascript-typescript|JavaScript/TypeScript]], [[Graph/Stacks/react|React]], [[Graph/Stacks/vite|Vite]]

## Commands
- dev: `npm run dev`
- build: `npm run build`

## Likely Entrypoints
- `src/client/App.tsx`
- `src/client/main.tsx`
- `src/client/types/index.ts`
- `src/server/presentation/server.ts`

## Important Files
- `AGENTS.md`
- `CLAUDE.md`
- `tsconfig.json`
- `vite.config.ts`

## Code Area Hints
- `src/`: `client/`, `server/`
- `api/`: `execute.ts`

## Data / Schema Files
- No data/schema files detected from safe metadata scan.

## Documentation Files
- `AGENTS.md`
- `CLAUDE.md`

## Agent Notes
- Read this note before touching the project.
- Check the source path directly for current code before making changes.
- Prefer the command hints above, but verify package managers and lockfiles in the source path.
- Add project-specific conventions, risky areas, setup notes, and decisions here as they become known.

## Obsidian Human Notes
_Add durable knowledge here. This generated scanner may overwrite generated sections on the next sync._

<!-- END OBSIDIAN AGENT MEMORY -->

## Existing Instructions Preserved

# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

A single-page Postman-like HTTP request tester. No persistence, no login. The frontend sends request config to a backend proxy and renders structured responses.

Local development uses the Express proxy in `src/server/`, which executes real `curl` subprocess calls and returns structured responses. The Vercel/serverless entrypoint in `api/execute.ts` mirrors the request/response contract but executes requests with native `fetch` because it cannot rely on a local `curl` binary in the same way.

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

Before pushing changes, run `npm run build` unless the change is documentation-only.

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

**Serverless/Vercel entrypoint (`api/execute.ts`):**
- Mirrors the server domain/client request and response shape with local types.
- Uses native `fetch`, `FormData`, and `URLSearchParams` instead of the real `curl` binary.
- Keeps a readable generated cURL command in the response for display parity.
- This path is a compatibility/deployment adapter, not the source of local Express behavior.

**Client (`src/client/`):**
- `types/index.ts` — client-side copy of domain types (no cross-boundary imports)
- `hooks/useRequest.ts` — `{ response, loading, error, send }` — POSTs to `VITE_API_URL/api/execute`
- `App.tsx` — owns tabs, active request/response state, split-panel layout, mobile request/response switcher, send flow, and import modal state
- `components/TabBar.tsx` — multiple in-memory request tabs; no persistence
- `components/ImportCurlModal.tsx` — paste/import cURL commands into the active request
- `utils/curlParser.ts` — tokenizes and parses common cURL flags into the client request shape
- `components/KeyValueTable.tsx` — shared reusable table (Params, Headers, form-data, urlencoded); auto-adds empty row when last row is typed into
- `components/UrlBar.tsx` — method dropdown + URL input + Send button
- `components/RequestPanel/` — tabs: Params, Headers, Body (none/raw/form-data/urlencoded), Auth (None/Bearer/Basic/API Key); raw body supports Beautify for JSON/XML/HTML
- `components/ResponsePanel/` — status badge, timing, size; Body (Pretty/Raw toggle, copy, search/find highlighting), Headers tab

## Environment

```
PORT=3001            # Express server port
VITE_API_URL=http://localhost:3001  # Used by client to call the proxy
```

## Key Design Decisions

- **Real curl subprocess** — the backend runs actual `curl` binary, not axios/fetch. This ensures authentic curl behavior (TLS, proxy settings, etc.)
- **Serverless adapter exception** — `api/execute.ts` uses native `fetch` for Vercel compatibility and should not be treated as the canonical local request executor.
- **Temp file approach** — curl writes body to `$TMPDIR/curl-body-{uuid}.bin` and headers to `$TMPDIR/curl-headers-{uuid}.txt`. This cleanly separates headers from body without fragile stdout parsing.
- **Client types are a copy** — `src/client/types/index.ts` mirrors server domain types intentionally so client/server remain independently deployable without shared imports.
- **No shared `src/shared/` folder** — types are duplicated by design to preserve clean architecture boundaries.
- **No persistence** — tabs, requests, imported cURL data, and responses live only in React state.
- **Request body formatting is client-only** — Beautify changes the textarea value before send; it does not affect server parsing rules.

## Current Feature Notes

- Request body supports `none`, `raw`, `form-data`, and `x-www-form-urlencoded`.
- Raw request body content types: JSON, Text, XML, HTML.
- Raw request body Beautify:
  - JSON uses `JSON.parse` + `JSON.stringify(..., null, 2)` and shows an inline error for invalid JSON.
  - XML/HTML use lightweight tag indentation; do not treat it as a strict parser/validator.
  - Text bodies do not beautify.
- Auth supports None, Bearer, Basic, and API Key in header or query string.
- Imported cURL commands should populate method, URL, headers, params, auth, and body where supported by `curlParser.ts`.
- Response body can render pretty JSON, raw text, copy to clipboard, and search within the displayed body.
