# Current Status

**Phase 1 — HSC English Last Hour (Supabase migration)**. Date: 2026-10-15.

## What exists

- Premium crystal-glass/glassmorphism landing page with book preview + order.
- Colorful 3D crystal-glass redesign: layered animated background orbs, frosted glass panels, gradient primary CTAs. Desktop layout = large reader on the left + compact sticky order sidebar on the right; mobile/tablet = reader first with the order form stacked below. Verified at 320–1920 px with zero horizontal overflow and no clipped controls.
- Free-preview ceiling is 10 pages (`MAX_PREVIEW_PAGE_COUNT`/`DEFAULT_PREVIEW_PAGE_COUNT` in `lib/book/config.ts`); configured counts are clamped to it and the reader shows the Bangla "preview finished — order now" prompt at the limit. The cached preview PDF carries an `hsc-preview-limit:<n>` marker so `GET /api/book/preview-pdf` re-caches when the limit changes and never serves more pages than allowed.
- Two reader formats: page-flip (Book Mode) with realistic dual-page spread on desktop, single page on mobile; PDF (PDF Mode). Zoom (in/out/reset/fit-width/fit-page), pinch-zoom, keyboard/swipe navigation, progress. End-of-preview detection lives in `lastVisiblePage()`/`isPreviewEnd()`.
- Order form (name, BD phone, address, quantity 1–20) with client + server validation; the server recomputes unit price × quantity + delivery.
- Server-authoritative pricing and Supabase-backed order endpoint (`orders` table with `quantity`, service-role client).
- Info cards and the order summary use clearer borders/shadows (`--shadow-card*`/`--glass-outline*`, `.order-card`/`.order-summary`).
- Content-loading architecture: real config + dev preview fixtures gated to development; graceful "preview coming soon" state when no content.
- Server-side Supabase book loading: `loadPublishedBook(bookId?)` reads the `books` row + `book_pages` when Supabase is configured, maps them with signed asset URLs, and falls back to the local config otherwise (never throws). Content is stripped when unpublished.
- Supabase backend: RLS migrations (`supabase/migrations/`), private `book-assets` bucket, realtime publication on `books`/`book_pages`, `BookProvider` live-refresh context, `GET /api/book` (published config) and `GET /api/book/preview-pdf` (trimmed preview PDF, full PDF never exposed).
- Display name **HSC English Last Hour**; stable slug `hscenglishlasthour` for DB ids and storage paths.
- **Live Supabase connected** (project ref `qrkzygdvckuirqmmdxcj`, region ap-southeast-1). Migrations applied; RLS + private `book-assets` bucket verified; a real order was written through `/api/orders` and then removed (test data cleaned up). `.env.local` holds the URL + publishable/secret keys (gitignored); `types/database.ts` generated from the live schema.

## Verification (honest)

| Command                  | Result                                             |
| ------------------------ | -------------------------------------------------- |
| `npm install`            | Succeeds; `postinstall` copies pdf.js assets.      |
| `npm run lint`           | Clean (exit 0).                                    |
| `npm run typecheck`      | Clean (exit 0).                                    |
| `npm test`               | 108 passing (Vitest, 12 files).                    |
| `npm run build`          | Success. `/` dynamic (`instant = false`), `/api/book`, `/api/book/preview-pdf`, `/api/orders` dynamic. |

Dev server: **http://localhost:3000** verified GET / → 200; reader renders an open-book spread (desktop) / single page (mobile) via a real headless-browser DOM check; production shows the graceful "preview coming soon" state; preview assets served; no sample/dev fixture labels in public UI. Redesign verified at 320/360/375/390/414/430/768/1024/1280/1440/1600/1920 px via a temporary same-origin measurement harness (since removed): 0 px page overflow, 0 clipped controls, reader+order side-by-side from 1024 px with the reader at ~68–74% width, and order stacked below the reader on all smaller viewports.

Runtime checks:
- `GET /` → 200 (glass UI, "HSC English Last Hour", reader, order).
- Assets `/preview/book.pdf`, `/preview/pages/page-01.png`, `/pdf.worker.min.mjs` → 200.
- `POST /api/orders` invalid → 400, non-JSON → 400, valid (unconfigured) → 503; tampered-price still → 503.
- Duplicate-submission protection: in-flight ref guard + rate limiting (5/min → 429).

## Known limitations (honest)

1. **Verified against the live Supabase project** (`qrkzygdvckuirqmmdxcj`): tables/RLS/storage/signed URLs and a real order insert were confirmed, then test data was removed. The catalog is currently empty, so the public site still shows the graceful "preview coming soon" state until a real `books` row + assets are added. **Ordering is closed while no published `books` row exists:** `orders.book_id` references `books(id)`, so `/api/orders` now returns `409 "Ordering is not open yet."` instead of a 500. Create the published book row (and assets) to enable orders.
2. **Security hardening applied remotely** (`20261014224523`, `20261014224544`, `20261014224600`, synced locally): anonymous access limited to explicit catalog/preview columns, anonymous `orders`/`admin_users` privileges revoked, `is_admin()` no longer executable by anon, `set_updated_at()` search path pinned. The server (service-role) is unaffected.
3. **Rate limiting is in-memory and per-instance** — resets on restart, not shared across instances.
4. **Page-flip zoom uses a CSS transform** — precise drag-flip degrades while zoomed in page-flip mode. Buttons/swipe/keyboard still work. PDF-mode zoom is crisp.
5. **No real book content supplied** — default real config has no preview content; in development the app uses neutral preview fixtures for mechanics; production shows "preview coming soon".
6. **`npm audit`** has high-severity transitive advisories (eslint tooling) — only fix is breaking downgrade; documented, not applied.

## Not built (Phase 1 scope)

Admin UI, authentication, cart, multiple products, payment gateways — intentionally out of scope.

## Next steps

1. Add the real `books` row + cover/pages/PDF to the `book-assets` bucket and publish it (`is_published = true`).
2. Confirm realtime refresh in the browser while editing that row.
3. Proceed to Phase 2: Admin Panel + book-content management.
