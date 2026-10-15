# HSC English Last Hour — Single-Book Store

Premium crystal-glass book reader + Cash on Delivery ordering. Display name: **HSC English Last Hour** (slug `hscenglishlasthour`).

## Quick start
```bash
npm install
npm run dev  # http://localhost:3000
```

## Scripts
- `npm run dev` — dev server (Turbopack)
- `npm run build` / `npm start` — prod build/serve
- `npm run lint` — ESLint
- `npm run typecheck` — tsc --noEmit
- `npm test` — Vitest
- `npm run generate:preview` — regenerate neutral preview fixtures
- `npm run supabase:start` / `supabase:stop` — local Supabase stack
- `npm run supabase:link` / `supabase:db:push` / `supabase:db:reset` — remote link, apply migrations, reset
- `npm run supabase:types` — regenerate DB types

## Supabase (optional)
Copy `.env.example` to `.env.local` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`) — **server-only, never exposed**

Then push the schema: `npm run supabase:link` then `npm run supabase:db:push` (migrations in `supabase/migrations/`). The storage bucket `book-assets` is created by the migration and is private. Without these values the order endpoint returns 503 and the reader falls back to the local config (no fake success).

## Content
- Real book content: not included. When unavailable, UI shows graceful "preview coming soon" (no sample/dev labels).
- Dev preview fixtures (`/preview/`) are used only in development to demonstrate reader mechanics.
- In production, book rows, page images and PDFs live in Supabase; assets are served as short-lived signed URLs and the full PDF is never exposed (PDF Mode uses a trimmed preview).

## Testing & verification
```bash
npm run lint && npm run typecheck && npm test && npm run build
```

All green (50 tests). Dev server verified at http://localhost:3000.

## Docs
See `CURRENT_STATUS.md`, `ARCHITECTURE.md`, `SECURITY.md`, `DATABASE_SCHEMA.md`, `REQUIREMENTS.md`, `IMPLEMENTATION_PLAN.md`, `CHANGELOG.md`, `PROJECT_MEMORY.md`, `AGENTS.md`.
