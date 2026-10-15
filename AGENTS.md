# AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project: HSC English Last Hour (Phase 1)

Premium crystal-glass single-book store. Display name: **HSC English Last Hour**; stable identity slug: `hscenglishlasthour`. Desktop open-book spread; mobile single page. Book Mode + PDF Mode. COD ordering with Supabase. No Admin Panel in Phase 1.

## Stack
Next.js 16.4.0 (App Router, Turbopack), React 19.3, Tailwind v4, TypeScript strict, Supabase (`@supabase/supabase-js` + `@supabase/ssr`), pdf-lib, zod, react-pdf+pdfjs-dist, react-pageflip.

## Gotchas
- `cacheComponents: true` — no `export const runtime` in route handlers.
- With a live Supabase backend, `app/page.tsx` reads DB data at request time; `cacheComponents` forbids uncached reads during prerender. The page exports `export const instant = false` to opt into a blocking (dynamic) route. The client `BookProvider` still refreshes live via Realtime.
- Client components using `localStorage` must not call `setState` synchronously in `useEffect` (React 19) — use `queueMicrotask` or derive.
- Third-party client-only libs imported from `"use client"`; `react-pdf` via `next/dynamic` with `ssr:false`.

## Commands
- `npm run dev` — dev server (Turbopack)
- `npm run build`/`npm start` — build/serve
- `npm run lint`, `npm run typecheck`, `npm test` — quality
- `npm run generate:preview` — regenerate neutral preview fixtures
- `npm run supabase:start`/`supabase:stop`/`supabase:link`/`supabase:db:push`/`supabase:db:reset`/`supabase:types` — local/remote Supabase ops
- `postinstall` — copy pdf.js worker + fonts

## Content/loading
- `lib/book/config.ts` + `getActiveBookConfig()` choose real config or dev preview (NODE_ENV=development) when content missing; else graceful unavailable. No fabricated book; no sample/dev labels publicly.
- `lib/book/source.ts` (`loadPublishedBook`) is server-only: loads the `books` row + `book_pages` from Supabase when configured and falls back to local config; never import into client code.

## Rules
- No secrets in git. `.env.example` only.
- Server-authoritative pricing; never fake success. Check `isPublished`.
- No Admin/auth/cart/multi-product/payment gateway in Phase 1.
- Only reader + minimal controls + return-to-order + order form+summary.

## Docs
See `CURRENT_STATUS.md`, `ARCHITECTURE.md`, `REQUIREMENTS.md`, `SECURITY.md`, `DATABASE_SCHEMA.md`, `IMPLEMENTATION_PLAN.md`, `CHANGELOG.md`, `PROJECT_MEMORY.md`.
