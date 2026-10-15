# Changelog

Format loosely follows Keep a Changelog. Dates are ISO.

## [1.7.1] — 2026-10-16

Checkout wording fixes and a fixed, 3-line address box.

### Changed
- **Address field is now a fixed-height textarea.** `components/order/OrderForm.tsx` renders the address as a `<textarea rows={3} className="field-input address-input">`; `app/globals.css` gives `.address-input` a fixed `5.75rem` (≈92px) height with `resize: none`, `line-height: 1.5` and `overflow-y: auto`, so the box comfortably shows 2–3 lines and never grows, shrinks, or auto-resizes while typing. Width never exceeds its parent (`box-sizing: border-box`).
- **Maximum three address lines (client + server).** New `lib/orders/address.ts` shares `MAX_ADDRESS_LINES = 3` and helpers. The controlled textarea clamps input to three content lines, collapses consecutive newlines, and drops a fourth line whether typed or pasted. `lib/orders/validation.ts` independently normalizes the stored address (unify CRLF, trim, collapse blank lines) and rejects more than three lines with a bilingual message — no silent truncation server-side. Existing min-5 / max-500 address length validation is preserved.
- **Removed the visible phone hint** `বাংলাদেশি মোবাইল নম্বর / Bangladeshi mobile number` from the order form (the field, its label `মোবাইল নম্বর / Mobile Number`, and phone validation are unchanged; the validation message still mentions a valid Bangladeshi number).
- **Corrected the summary label** `উপমোট` → `সর্বমোট` (`OrderSummary`), i.e. Subtotal.

### Notes
- Verified at 320/360/390/430/768/1024/1280/1440px: the address box is a constant 92px tall, `resize: none`, width equals its parent (never overflows), `scrollHeight === clientHeight` (no inner scroll); typing 1/2/3 lines keeps the height at 92px; pasting five lines clamps to three; blank lines collapse (`A\n\n\n\nB` → `A\nB`).
- `POST /api/orders` rejects a 4-line address with `400` and `fieldErrors.customerAddress` (no DB write), and ranks it above the min-length check.
- Tests: +9 (address helpers/validation and OrderForm) → **123 passing (13 files)**.

## [1.7.0] — 2026-10-16

Bengali typography, premium glass polish, a quantity stepper, and overflow fixes.

### Added
- Bengali webfont: **Noto Sans Bengali** (variable, SIL OFL) self-hosted via `next/font/google` in `app/layout.tsx` (`--font-bengali`). Bangla text now renders with a real, consistent typeface on every platform (macOS, Windows, Android, iOS) instead of relying on system fonts; `.bn`/`[lang="bn"]` use it with `line-height: 1.75` so vowel signs and conjuncts are not clipped. Latin text keeps Geist, and the body stack falls back to the Bengali font for mixed content.
- `components/order/QuantityStepper.tsx` — accessible `[ − ] value [ + ]` stepper replacing the quantity `<select>`; 1–20, buttons disable at the limits, labelled "পরিমাণ কমান / Decrease quantity" and "পরিমাণ বাড়ান / Increase quantity", `type="button"` so it never submits the form.
- `MinusIcon`/`PlusIcon` in `components/ui/icons.tsx`.
- Payment-method row in `OrderSummary` showing `পেমেন্ট / Payment: ক্যাশ অন ডেলিভারি / Cash on Delivery`.
- Responsive type-scale tokens (`--fs-brand`, `--fs-section`, `--fs-title`, `--fs-label`, `--fs-input`, `--fs-help`, `--fs-btn`) and an `.eyebrow` helper.

### Changed
- **Overflow fixed:** the `.btn` nowrap rule made long bilingual labels spill out of their card. Added `.btn-block` (full width, `white-space: normal`, auto height, `min-width: 0`) so `অর্ডার করুন / Place Order` and the loading state stay inside the parent card. Summary rows use `min-w-0`/`shrink-0` so prices never overflow.
- Order card is lighter and more compact: the redundant Cash-on-Delivery note was removed from the submit section (it now lives in the order-summary payment row), and the order button stands alone in its own row.
- Typography hierarchy tightened: brand wordmark uses `--fs-brand` (≈18→22.5px), the order title `text-lg`, and `.info-box-title` is now a proper section heading (16–19px) instead of a tiny uppercase eyebrow.
- Compact sidebar: desktop/aside grid is `minmax(300px,320px)` at `lg` and `minmax(320px,360px)` at `xl` (reader keeps the majority width).
- `.info-box`/`.order-summary`/`.field-input`/`.field-label` now use the shared type tokens for consistent sizing.

### Notes
- Verified with headless Chrome at 320/360/390/430/768/1024/1280/1440px: zero horizontal page overflow, order button and payment row inside their cards, stepper buttons 40×40 and correctly disabled at 1/20, sidebar 320–360px on desktop. Runtime check: `+`/`−` update the total immediately (700/unit + 90 delivery) and clamp at 1 and 20.
- PDF preview still serves 7 real source pages (limit marker `hsc-preview-limit:10`, full PDF private); `POST /api/orders` still rejects quantity 0/21 with 400.

## [1.6.0] — 2026-10-15

Bilingual (Bangla / English) labels and clearly visible information boxes.

### Added
- `components/ui/Bilingual.tsx` — renders the Bangla label in `lang="bn"` with the `.bn` font, a muted `/` separator (aria-hidden), then the English label.
- Light information-box tokens/styles in `app/globals.css`: `--box-bg`, `--box-tint`, `--box-border`, `--box-shadow`, `--input-border`; `.info-box`/`.order-summary` (light gradient, 1px indigo border, 16px radius, soft shadow, ~14px padding) and `.info-box-title`.

### Changed
- Order form now groups fields into three labelled `.info-box` sections (Customer Information, Book Quantity, Order Submission); every label, hint, button, success box, and COD note is bilingual (Bangla first, then `/`, then English).
- Order summary and all user-facing order messages (validation, create-order, API route) are bilingual.
- `.field-input` restyled: white background, `--input-border`, `--r-sm` radius, `#f1f5f9` disabled state.
- Removed the example mobile number from the phone hint and validation error (no more `01712345678` sample).

### Notes
- Verified via headless CDP at 360/390/820/1440 px: 4 info boxes with the intended border/radius/shadow/padding, white inputs, bilingual labels present, zero horizontal overflow.

## [1.5.0] — 2026-10-15

Expanded the free preview, added order quantity, and clarified card styling.

### Added
- Free preview ceiling raised to 10 pages: `MAX_PREVIEW_PAGE_COUNT = 10` and `DEFAULT_PREVIEW_PAGE_COUNT = 10` in `lib/book/config.ts`, plus `clampPreviewPageCount()`. `getPreviewPages()`/`mapBookRow()` clamp configured counts to 10.
- Preview cache self-healing: `lib/book/preview-pdf.ts` stamps the generated preview with a `hsc-preview-limit:<n>` PDF Subject marker and adds `readPreviewPdfInfo()`. `GET /api/book/preview-pdf` regenerates and re-caches whenever the marker is missing or stale, and never serves more pages than the current limit (stale/oversized caches are replaced; no page-range parameter is accepted).
- Order quantity 1–20: `components/order/OrderForm.tsx` quantity selector, quantity-aware `OrderSummary`, and `orders.quantity` column (`supabase/migrations/20261015120000_add_orders_quantity.sql` — additive, `default 1`, `check (quantity between 1 and 20)`).

### Changed
- `OrderPricing` is now `{ unitPrice, quantity, subtotal, deliveryCharge, totalAmount }`; totals are computed by `computeTotals(pricing, quantity)` with `MIN_ORDER_QUANTITY`/`MAX_ORDER_QUANTITY` and `normalizeQuantity()`. `parseQuantity()` added to order validation. The server recomputes everything and ignores any client-supplied pricing.
- `orders.book_price` stores the unit price; `total_amount = book_price * quantity + delivery_charge`. Existing rows default to `quantity = 1` and keep their totals.
- Info cards and the order summary got clearer borders/shadows (`--shadow-card*`, `--glass-outline*` tokens; `.order-card`, `.order-summary`).
- Reader end-of-preview detection extracted to `lastVisiblePage()`/`isPreviewEnd()` so a desktop spread includes its right-hand page and mobile single-page uses the current page.

### Notes
- Live `books.preview_page_count` set to 10 and the cached preview regenerated (serves all 7 source pages, capped at 10).
- Applied `20261015120000` to the linked remote project. Two remote-only migration versions (`20261014234521`, `20261014234525`) were marked reverted to reconcile migration history; no schema/data was changed.

## [1.4.0] — 2026-10-15

Migrated the backend from Firebase/Firestore to Supabase (Postgres + Storage + Realtime + RLS) and rebranded the display name.

### Added
- Supabase clients: `lib/supabase/config.ts` (env readers + configured checks), `client.ts` (browser), `admin.ts` (service-role, server-only), `server.ts` (cookie-bound), `storage.ts` (signed URLs / object helpers).
- Migrations `supabase/migrations/20251015000000_init.sql` (`books`, `book_pages`, `orders`, `admin_users`, indexes, `set_updated_at()` triggers, `is_admin()` function) and `20251015000001_rls_storage.sql` (RLS policies, private `book-assets` bucket + admin storage policies, realtime publication, replica identity full). Optional `supabase/seed.sql`, plus `supabase/config.toml`.
- Routes `app/api/book/route.ts` (published config) and `app/api/book/preview-pdf/route.ts` (serves/trims the preview PDF; full PDF never exposed).
- `lib/book/storage-paths.ts` (canonical asset paths) and `lib/book/preview-pdf.ts` (pdf-lib page trimming).
- `components/book/BookProvider.tsx` (Supabase Realtime context on `books`/`book_pages` with visibility/focus/60s-poll fallback) and `components/book/BookExperience.tsx` (client shell).
- `pdf-lib` and `server-only` dependencies; `supabase:*` npm scripts.

### Changed
- `lib/book/source.ts` rewritten: `loadPublishedBook(bookId?)` reads the `books` row + `book_pages` via the service-role client, maps with signed URLs (`mapBookRow`), strips content when unpublished, and falls back to the local config on missing row/unconfigured/error.
- `lib/orders/create-order.ts` rewritten to insert into Supabase `orders`; 409 when unpublished, 503 when unconfigured.
- `app/page.tsx` is now an async server component loading `loadPublishedBook()` and wrapping the UI in `BookProvider`. It exports `instant = false` so Cache Components permits the request-time DB read (blocking/dynamic route). `app/layout.tsx` metadata title is **HSC English Last Hour**.
- `components/reader/BookReader.tsx` and `components/order/OrderForm.tsx` consume `useBook()`.
- Display name rebranded to **HSC English Last Hour** (kept slug `hscenglishlasthour` for ids/paths).
- Docs updated end-to-end (README, AGENTS, ARCHITECTURE, DATABASE_SCHEMA, SECURITY, REQUIREMENTS, IMPLEMENTATION_PLAN, CURRENT_STATUS, PROJECT_MEMORY).
- Tests rewritten for Supabase mocks: `lib/book/source.test.ts` (8), `lib/orders/create-order.test.ts` (7), `components/order/OrderForm.test.tsx` (5) — 50 tests total; added `tests/server-only-stub.ts` alias in `vitest.config.ts`.

### Removed
- Firebase: `lib/firebase/`, `firebase.json`, `firestore.rules`, `storage.rules`, and `firebase`/`firebase-admin` dependencies.
- Leftover `package.json.bak`, `public/sample/`, `scripts/generate-sample-content.mjs`, and the redundant `generate:sample` npm alias.

## [1.3.0] — 2026-10-15

Premium colorful 3D crystal-glass visual redesign and reader/order layout overhaul.

### Added
- Animated colorful 3D background layer (`components/ui/BackgroundDecor.tsx`) with floating glass orbs and a subtle grid.
- Inline SVG icon set (`components/ui/icons.tsx`) for reader/order controls (no icon dependency).
- `DEFAULT_PREVIEW_PAGE_COUNT = 4` in `lib/book/config.ts` used as the default free-preview limit.

### Changed
- `app/globals.css` rebuilt as a full design system: color tokens, 3D background, glass surfaces, gradient buttons, glass inputs, segmented control, reader stage, loader, and reduced-motion handling.
- `app/layout.tsx` mounts the background decor and exports a `Viewport`.
- `app/page.tsx` restructured: compact glass header and a responsive layout — large reader left + compact sticky order sidebar right on desktop (`lg`/`xl` grid), reader-then-order stacked on mobile/tablet.
- `components/ui/Button.tsx` (variants `primary`/`glass`/`ghost`, sizes `sm`/`md`/`lg`) and `GlassCard.tsx` (`panel`/`soft` tones) rewritten.
- Reader components (`BookReader`, `ReaderControls`, `PageFlipReader`, `PdfReader`, `ReaderUnavailable`) restyled: glass toolbars with icons, spread crease, loading state, themed unavailable state, and the Bangla preview-ended prompt.
- Order components (`OrderForm`, `OrderSummary`) restyled and merged into a single glass card with the order CTA.

### Fixed
- No horizontal overflow or clipped controls from 320 px to 1920 px; reader/order proportions kept within ~68–74% reader width on desktop.

## [1.2.0] — 2026-10-14

Server-side Firestore book loading and offer-price support.

### Added
- Real `loadActiveBookConfig(bookId?)` in `lib/book/source.ts`: reads `books/{bookId}` with the Admin SDK when Firebase is configured; maps documents to `BookConfig`; falls back to the local config (and development preview) when Firebase is unconfigured, the doc is missing, or the read fails. Never throws.
- `mapBookDocument()` with defensive parsing/defaults for pricing, content, reader, market, and pages.
- Tests: `lib/book/source.test.ts` (7), Firestore-priced order and unpublished-book cases in `create-order.test.ts`, and an offer-price case in `pricing.test.ts` (48 tests total).

### Changed
- `createOrder()` prices from the server-loaded Firestore book document (falling back to local config) instead of only the local config.
- `computeTotals()` now charges `offerPrice` when set (server-authoritative; the order UI uses the same function).

## [1.1.0] — 2026-10-14

Complete redesign for `hscenglishlasthour` with premium crystal-glass/glassmorphism UI, extended backend/config, neutral preview fixtures, and content-loading architecture.

### Added
- Rebranded site identity to `hscenglishlasthour` (metadata, title, wordmark).
- Crystal-glass design system (variables, gradients, `backdrop-blur`, soft shadows, accessible contrast).
- `components/ui/GlassCard.tsx`, redesigned `Button` with gradient primary + glass variants.
- `ReaderUnavailable` component with graceful "preview coming soon" state (no dev labels).
- Content-loading architecture: `getActiveBookConfig()` chooses real config or dev preview fixtures in development; no fabricated book content in default production.
- Neutral preview fixtures at `/preview/` (PDF + page images, no "sample/dev/fixture" text) generated via `scripts/generate-preview-content.mjs`. Script also exposed as `generate:preview` / `generate:sample`.
- Firestore (`firestore.rules`) and Storage (`storage.rules`) security rule templates; `firebase.json` for Firebase config.
- `lib/book/source.ts` server-side Firestore book loading (completed in 1.2.0).
- Route: body size limit (10KB), basic request hardening; order endpoint validates optional `bookId` and checks `book.isPublished`.

### Changed
- `types/book.ts` extended: `BookContentMode`, pricing `offerPrice`, `coverImageUrl/Path`, `contentMode`, `pdfStoragePath`, `pageImages/storagePath`, `isPublished`, `previewPageCount`, timestamps.
- `lib/book/config.ts` restructured for real book `hscenglishlasthour`, dev preview config, active config helper, preview slicing.
- `BookReader`, `PageFlipReader`, `PdfReader`, `ReaderControls` redesigned with glass styling; dual-page spread improved with gutter shadows; mobile single-page layout intact.
- `OrderForm`, `OrderSummary` redesigned to glass; form keeps values on error.
- `app/page.tsx` simplified/minimal brand; `app/layout.tsx` metadata updated.
- `app/globals.css` restyled with soft gradients and reduced motion support.
- `createOrder()` checks `isPublished` and optional `bookId`; uses active book config.
- Order API accepts optional `bookId` (validated if present).

### Removed
- Public "development/sample/fixture" labels from UI. Neutral preview assets replace sample set.

### Verified
- Lint/typecheck/test/build clean (38 tests). Dev server on http://localhost:3000 verified.
- Forbidden labels absent; metadata + identity correct. No fabricated content exposed publicly.

## [1.0.1] — 2026-10-14 (previous)
Hardening + verification pass (duplicate submission, route tests, dependency checks).

## [1.0.0] — 2026-10-14 (previous)
Initial Phase 1 implementation.
