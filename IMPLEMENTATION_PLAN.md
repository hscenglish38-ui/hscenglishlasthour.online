# Implementation Plan (Phase 1)

Phase 1 — HSC English Last Hour, crystal-glass redesign + Supabase backend migration, completed and verified (code-side; live project not yet connected).

## Steps

### 1. Scaffolding & tooling
- Next.js 16 App Router, TypeScript strict, Tailwind v4, ESLint, Vitest.
- Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:watch`, `postinstall`, `generate:preview`, `supabase:*`.

### 2. Dependency verification
- `react-pageflip@2.0.3` — React 19 compatible (no peers, no removed APIs).
- `react-pdf@11.0.0` — React 19 peers; client-only via `next/dynamic(ssr:false)`.
- No peer conflicts; no `--force`/`--legacy-peer-deps`.

### 3. Types, config, content architecture
- Extended `types/book.ts` (contentMode, pricing.offerPrice, storage paths, isPublished, previewPageCount).
- `lib/book/config.ts` — real config for `hscenglishlasthour`, dev preview config, `getActiveBookConfig()`, preview slicing.
- Neutral preview fixtures generated (`/preview/book.pdf`, `/preview/pages/*`), no sample/dev labels.
- `lib/book/source.ts` — server-side Supabase book loader (`loadPublishedBook` / `mapBookRow`), graceful fallback to local config; never throws.

### 4. Design system & UI
- Crystal-glass/glassmorphism in `app/globals.css` (gradients, backdrop-blur, shadows, reduced motion).
- Primitives: `Button` (gradient primary + glass), `GlassCard`.
- Redesign: `OrderSummary`, `OrderForm` (ref guard for duplicates, preserves values on error).
- Reader: `ReaderControls`, `PageFlipReader` (gutter shadows, dual-page spread on desktop, single page on mobile), `PdfReader`, `BookReader` (active config, unavailable state), `ReaderUnavailable`.

### 5. Page, metadata, branding
- `app/page.tsx` minimal brand; `app/layout.tsx` title/description `hscenglishlasthour`.

### 6. Backend (server)
- `lib/orders/create-order.ts`: validates optional `bookId`, checks `isPublished`, loads book config via `loadPublishedBook`, server-authoritative pricing, inserts into Supabase `orders`.
- `app/api/orders/route.ts`: POST-only, JSON parse, body size limit (10KB), rate limiting (5/min), error mapping.
- `app/api/book/route.ts` (published config) and `app/api/book/preview-pdf/route.ts` (trimmed preview PDF).

### 7. Supabase schema, RLS & storage
- `supabase/migrations/20251015000000_init.sql` (`books`, `book_pages`, `orders`, `admin_users`, indexes, triggers, `is_admin()`), `20251015000001_rls_storage.sql` (RLS policies, private `book-assets` bucket, realtime publication).
- `lib/supabase/*` clients; `lib/book/storage-paths.ts`, `lib/book/preview-pdf.ts`.

### 8. Tests
- 50 passing across 8 files (unit + component + route + book-source). Duplicate submissions, rate limiting, Supabase-priced orders, unpublished-book, and offer-price handling covered.

### 9. Verification & docs
- Lint/typecheck/test/build clean. Dev server on http://localhost:3000 verified. No forbidden labels in public UI. Memory/docs updated.

## Next phase
Admin Panel + book-content management (PDF/image upload, pricing, preview pages, order management, restricted asset serving, auth).
