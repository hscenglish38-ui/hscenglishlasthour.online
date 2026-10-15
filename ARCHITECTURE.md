# Architecture

Redesigned for `hscenglishlasthour` with premium crystal-glass UI and content-loading architecture.

## Flow
```
Visitor → landing page (app/page.tsx, server) → loadPublishedBook() (Supabase) → BookProvider
  ├─ BookExperience (client shell: header + reader + order panel)
  │   ├─ BookReader ── PageFlip (open book spread desktop, single mobile) | PdfReader
  │   └─ OrderForm ── POST /api/orders → route (server) → createOrder() → Supabase `orders`
  ├─ GET /api/book → published BookConfig (signed asset URLs)
  ├─ GET /api/book/preview-pdf?bookId= → trimmed/stored preview PDF
  └─ BookProvider → Supabase Realtime (postgres_changes) on books/book_pages → refetch /api/book
```

## Key layers
- `lib/book/config.ts` — neutral local defaults, dev preview config, `getActiveBookConfig()` (slicing preview pages; dev-preview fallback in development).
- `lib/book/source.ts` — server-only `loadPublishedBook(bookId?)`: reads the `books` row + `book_pages` via the Supabase service-role client, maps them (`mapBookRow`) with signed asset URLs, and falls back to local config on missing row/unconfigured/error (never throws). Strips content when unpublished.
- `lib/book/storage-paths.ts` — canonical `book-assets` path builders. `lib/book/preview-pdf.ts` — trims the full PDF to the preview page count (pdf-lib).
- `lib/supabase/*` — `config.ts` (env readers), `client.ts` (browser), `admin.ts` (service-role, server-only), `server.ts` (cookie-bound), `storage.ts` (signed URLs/objects).
- `lib/reader/*` — pure math (layout, zoom, navigation), unit-tested.
- `lib/orders/*` — validation (BD phone), pricing (server), createOrder.
- `app/api/book/route.ts` — GET published config. `app/api/book/preview-pdf/route.ts` — trimmed/stored preview PDF.
- `app/api/orders/route.ts` — POST, JSON, 10KB body limit, per-IP rate limit (5/min), error mapping.
- UI: `components/book/*` (BookProvider, BookExperience), `components/reader/*`, `components/order/*`, `components/ui/*` (Button, GlassCard).

## Reader
- Dual-page spread on desktop (≥1024px), single page mobile. PageFlip with gutter shadows, realistic proportions.
- PDF mode (react-pdf, worker + fonts).
- Zoom, fit-to-width/page, pinch-to-zoom, keyboard/swipe, progress.
- Mode switch "Book Mode/PDF Mode" when both available.
- "Back to Order/Finish Reading & Order" scroll without losing state; position restored from localStorage.

## Content
- Active config: if real config has content → use it; else if NODE_ENV=development → use neutral dev preview; else unavailable state.
- No fabricated book content; no sample/dev labels in public UI.

## Order
- Server validates; ignores client prices; loads the book via `loadPublishedBook(bookId)` (Supabase when configured, else local config); checks `isPublished` and optional `bookId`; computes totals (charging `offerPrice` when set); inserts into `orders` with the service-role client only after validation.

## Realtime / sync
- `BookProvider` subscribes to `postgres_changes` on `books` (filter `id=eq.<bookId>`) and `book_pages` (filter `book_id=eq.<bookId>`), refetching `/api/book` on change, plus visibilitychange/focus events and a 60s poll fallback.

## Future Admin
- Schema supports contentMode, pdf_storage_path, book_pages.storage_path, offer_price, is_published, preview_page_count, cover paths. RLS + private storage are admin-only via `admin_users`/`is_admin()`.
