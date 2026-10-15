# Project Memory

Durable, model-independent memory for this repository. Read this first after any break.

## What this is
Phase 1 of `hscenglishlasthour`: crystal-glass, mobile-first single-book store. Visitors read a preview (page-flip open-book spread on desktop, single page on mobile; or PDF) and order with Cash on Delivery. Orders persist via secure server endpoint.

## Key documents
1. `AGENTS.md` — stack, commands, gotchas, hard rules.
2. `CURRENT_STATUS.md` — current state, verification, known limitations, next steps.
3. `ARCHITECTURE.md` — structure, server/client, reader design, content-loading.
4. `REQUIREMENTS.md` — requirements + acceptance criteria.
5. `DATABASE_SCHEMA.md` — Supabase `books`/`book_pages`/`orders` schema + RLS.
6. `SECURITY.md` — secrets, rules, hardening.
7. `IMPLEMENTATION_PLAN.md` — execution steps.
8. `CHANGELOG.md` — changes.
9. `README.md` — setup.

## Critical constraints
- `cacheComponents: true` enabled — no route segment config in handlers.
- No secrets committed (only `.env.example`).
- Server-authoritative pricing; success only after confirmed Supabase insert; never fake success.
- No Admin Panel/auth/cart/multi-product/payment gateway in Phase 1.
- No fabricated book content; graceful unavailable state if none; no sample/dev labels in public UI.

## Identity
- Site: `hscenglishlasthour`
- Title/brand: `HSC English Last Hour`

## State
- Lint/typecheck/test/build clean (50 tests).
- Dev server: http://localhost:3000 verified; reader spread confirmed via headless-browser DOM check.
- Supabase backend implemented: `loadPublishedBook` (`lib/book/source.ts`), `orders` insert (`lib/orders/create-order.ts`), migrations/RLS/storage, realtime `BookProvider`, `/api/book` + `/api/book/preview-pdf`. Falls back to local config when unconfigured.
- Supabase reads/writes not tested against a live project (503 when unconfigured; migrations not yet applied remotely).

## Next
- Provide Supabase credentials, run `supabase:link` + `supabase:db:push`, and confirm a live order, signed assets, and realtime.
- Add real book content (PDF/pages) to the `book-assets` bucket.
- Phase 2: Admin Panel.
