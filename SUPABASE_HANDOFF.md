# Supabase Handoff Report

Prepared: 2026-10-15 (Phase 1). Audience: ChatGPT / next operator.

This document is a **read-only handoff**. No Supabase project, migration, resource
or data was changed while producing it. It contains no secrets (no access tokens,
database passwords, secret/service-role keys, or signed URLs).

Convention used below:

- **Verified** = observed directly (live command output or file content) during this handoff.
- **Assumption** = inferred, not directly observed.

---

## 1. Project identity

- Product display name: **HSC English Last Hour**
- Stable slug / DB id / route key: **`hscenglishlasthour`**
- Local project root: `/Users/mohaiminul/Desktop/bookproject`
- Local Supabase project id (`supabase/config.toml` → `project_id`): `hscenglishlasthour`
- Git: repository present; working tree has many uncommitted/untracked files (the
  project does not appear to have been committed yet). **No secret is tracked**:
  `.gitignore` ignores `.env*` and un-ignores only `.env.example`.

Repository top-level (excluding `node_modules`, `.next`, `.git`):

```
app/ components/ hooks/ lib/ public/ scripts/ supabase/ tests/ types/
.env.example  .gitignore  AGENTS.md  ARCHITECTURE.md  CHANGELOG.md
CURRENT_STATUS.md  DATABASE_SCHEMA.md  IMPLEMENTATION_PLAN.md  PROJECT_MEMORY.md
README.md  REQUIREMENTS.md  SECURITY.md  next.config.ts  package.json
tsconfig.json  vitest.config.ts  vitest.setup.ts
```

Key source layout (verified):

```
app/
  layout.tsx, page.tsx, globals.css
  api/book/route.ts                 GET published config
  api/book/preview-pdf/route.ts     GET trimmed/stored preview PDF
  api/orders/route.ts               POST order
components/
  book/BookProvider.tsx, BookExperience.tsx
  reader/BookReader.tsx, PageFlipReader.tsx, PdfReader.tsx,
         ReaderControls.tsx, ReaderUnavailable.tsx
  order/OrderForm.tsx, OrderSummary.tsx
  ui/BackgroundDecor.tsx, Button.tsx, GlassCard.tsx, icons.tsx
lib/
  book/config.ts, source.ts, storage-paths.ts, preview-pdf.ts
  supabase/config.ts, client.ts, admin.ts, server.ts, storage.ts
  orders/create-order.ts, validation.ts, pricing.ts
  reader/layout.ts, navigation.ts, reader-handle.ts
supabase/
  config.toml, seed.sql
  migrations/20251015000000_init.sql
  migrations/20251015000001_rls_storage.sql
types/book.ts, types/order.ts, types/database.ts
```

---

## 2. Supabase project reference

| Field | Value | Status |
| --- | --- | --- |
| Project reference (`ref`) | **`qrkzygdvckuirqmmdxcj`** | Verified |
| Organization id / slug | **`ogwirsgndidahxeprzpt`** | Verified |
| Organization name | "hscenglish38-ui's Org" | Verified |
| Project name | "hscenglish38-ui's Project" | Verified |
| Region | `ap-southeast-1` | Verified |
| Status | `ACTIVE_HEALTHY` | Verified |
| Postgres engine / version | `17` / `17.11.0.003` | Verified |
| API host | `https://qrkzygdvckuirqmmdxcj.supabase.co` | Verified |

### How it was identified and linked

- Identified with the Supabase CLI: `supabase projects list` returns exactly one
  project (the one above); `supabase orgs list` returns exactly one org. There is
  no ambiguity about which project is intended.
- The repository is linked to that ref: `supabase/.temp/project-ref` contains
  `qrkzygdvckuirqmmdxcj`, and `projects list` reports `"linked": true`.

### CLI authentication state

- **CLI authenticated: yes (verified).** After completing the interactive
  `supabase login` browser flow, `supabase projects list` succeeds with **no**
  `SUPABASE_ACCESS_TOKEN` environment variable set.
- Credential storage: the CLI stored the login token using its own secure
  handling — on macOS this is the system **Keychain** (generic-password service
  `Supabase CLI`, account `supabase`). No token was written to the repo,
  `.env.local`, docs, or Git by this process.
- **Authentication method used, current:** CLI interactive login (browser-based
  authorization) → credential held in the OS Keychain.
- **Authentication method used previously (now superseded):** a personal access
  token supplied transiently via the `SUPABASE_ACCESS_TOKEN` environment variable,
  plus the database password for `supabase link`. Those transient credentials were
  discarded and are not present anywhere in the repo. `migration list --linked`
  also connects successfully, i.e. the CLI has cached DB connection credentials
  for the linked project.

### Intended-account verification (honest)

- The CLI does not expose an account email / "whoami" command, so the operator's
  account identity was **not** independently verified by the CLI.
- What *is* verified: the credential now present was created by **the user
  personally completing the Supabase browser authorization**, and it can access
  exactly the intended org (`ogwirsgndidahxeprzpt`) and project
  (`qrkzygdvckuirqmmdxcj`). **Assumption:** therefore the credential belongs to
  the intended account; the definitive check is to view the account avatar/email
  in the Supabase Dashboard (a separate browser session).

---

## 3. Architecture summary

- **Framework:** Next.js 16.4.0 (App Router, Turbopack), React 19.3.0,
  TypeScript `^5` (strict), Tailwind CSS v4.
- **Supabase SDKs:** `@supabase/supabase-js` `^2.117.3`, `@supabase/ssr` `^0.12.7`.
- **Other notable deps:** `zod ^4.6.7` (validation), `pdf-lib ^1.17.1` (preview
  trimming), `react-pdf ^11.0.0` + `pdfjs-dist ^6.4.299`, `react-pageflip ^2.0.3`,
  `server-only ^0.0.1`.
- **Build config (`next.config.ts`):** `cacheComponents: true`,
  `partialPrefetching: true`, Turbopack CSS loader for Tailwind v4.
- **Rendering model:** `app/page.tsx` is an async server component that calls
  `loadPublishedBook()` and renders `<BookProvider>`. It exports
  `export const instant = false` so Cache Components permits the request-time DB
  read (the `/` route is therefore **dynamic**, not a static shell).
- **Client shell:** `BookExperience` (header + reader + order sidebar) consumes
  `useBook()` from `BookProvider`.
- **Live updates:** `BookProvider` subscribes to Supabase Realtime
  (`postgres_changes`) on `books` (filter `id=eq.<bookId>`) and `book_pages`
  (filter `book_id=eq.<bookId>`), refetching `GET /api/book`, with
  `visibilitychange`/`focus` and a 60s polling fallback.

### Environment variable names (names only — values are never shown)

`.env.example` documents:

- `NEXT_PUBLIC_SUPABASE_URL` — public project URL (browser-safe by design).
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — preferred browser key (`sb_publishable_…`).
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — legacy fallback browser key.
- `SUPABASE_SECRET_KEY` — server-only privileged key (`sb_secret_…`).
- `SUPABASE_SERVICE_ROLE_KEY` — legacy fallback server-only key.
- `SUPABASE_BOOK_BUCKET` — optional; defaults to `book-assets`.

Reader logic in `lib/supabase/config.ts` prefers the publishable/secret names and
falls back to the anon/service_role names. `.env.local` (gitignored) currently
sets `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SECRET_KEY`, and `SUPABASE_BOOK_BUCKET="book-assets"`.

### API routes and responsibilities (verified)

| Route | Method | Responsibility |
| --- | --- | --- |
| `/api/book` | GET | Returns the published `BookConfig` via `loadPublishedBook(bookId?)` (signed asset URLs; unpublished content stripped). |
| `/api/book/preview-pdf` | GET | Streams a **trimmed** preview PDF (pre-generated `preview.pdf` if present, else trims the private full PDF with `pdf-lib`). The full PDF is never returned. Returns 404 when the book is unpublished or the backend is unconfigured. |
| `/api/orders` | POST | JSON body, 10 KB limit, per-IP rate limit 5/min → 429, maps errors; calls `createOrder()`. |

### Book-reader implementation

- `components/reader/BookReader.tsx` orchestrates modes. **Book Mode** =
  `PageFlipReader` (react-pageflip): realistic dual-page spread on desktop
  (≥1024 px), single page on mobile. **PDF Mode** = `PdfReader` (react-pdf, loaded
  via `next/dynamic` `ssr:false`) pointed at `/api/book/preview-pdf`.
- Features: zoom in/out/reset, fit-page/fit-width, pinch-zoom, keyboard
  (ArrowLeft/Right) and swipe navigation, progress, reading-position persisted to
  `localStorage` (`book-reader-state`).
- Preview is limited to `previewPageCount` (default `DEFAULT_PREVIEW_PAGE_COUNT = 4`
  in `lib/book/config.ts`); at the limit the reader shows a Bangla "free preview
  finished — order now" prompt and an accessible `End of free preview` live region.
- Content states: real content if present; dev-preview fixtures only when
  `NODE_ENV=development` and no content; otherwise a graceful unavailable state.
  No "sample/dev" labels appear in the public UI.

### Order-submission implementation

- `components/order/OrderForm.tsx` collects name, BD phone, address; client-side
  validation + in-flight ref guard + disabled button on submit; posts to
  `/api/orders`.
- `lib/orders/validation.ts` — Zod schema + Bangladeshi phone normalization to
  E.164 `+8801XXXXXXXXX` (accepts `01…`, `1…`, `8801…`, `+8801…`; requires
  `^01[3-9]\d{8}$`).
- `lib/orders/pricing.ts` — **server-authoritative** totals (`offerPrice ?? price`
  + `deliveryCharge`, integer BDT).
- `lib/orders/create-order.ts` — validates, loads the book server-side via
  `loadPublishedBook`, verifies optional `bookId`, requires `isPublished` (else
  409), requires Supabase admin config (else 503), ignores any client-supplied
  price, and inserts into `orders` with the service-role client; returns 201 only
  after a confirmed insert.

---

## 4. Database and Storage summary

### Tables and columns (verified from the live PostgREST schema of the linked project)

- **`books`**: `id` (text, PK), `title`, `author`, `description`,
  `cover_image_path`, `content_mode` (`page-images`|`pdf`),
  `pdf_storage_path`, `is_published`, `price` `numeric(10,2)`,
  `offer_price` `numeric(10,2)`, `delivery_charge` `numeric(10,2)`, `currency`,
  `preview_page_count`, `default_mode` (`flip`|`pdf`), `page_aspect_ratio`
  `numeric(8,4)`, `flip_enabled`, `pdf_enabled`, `min_zoom` `numeric(6,3)`,
  `max_zoom` `numeric(6,3)`, `market_country`, `phone_region`,
  `created_at`, `updated_at`.
- **`book_pages`**: `id` (uuid, PK, `gen_random_uuid()`), `book_id` (FK →
  `books.id` `on delete cascade`), `storage_path`, `page_number`,
  `is_available`, `alt`, `created_at`, `updated_at`.
- **`orders`**: `id` (uuid, PK), `book_id` (FK → `books.id`
  `on delete restrict`), `book_title`, `customer_name`, `customer_phone`,
  `customer_address`, `book_price`, `delivery_charge`, `total_amount`,
  `currency`, `payment_method` (check `cod`), `status` (check
  `pending|confirmed|packed|shipped|delivered|cancelled`), `created_at`,
  `updated_at`.
- **`admin_users`**: `user_id` (uuid, PK, FK → `auth.users.id`
  `on delete cascade`), `created_at`.

### Constraints, indexes, triggers, functions, RLS

- Constraints: `book_pages` unique `(book_id, page_number)` and unique
  `(book_id, storage_path)`; check constraints on `content_mode`, `default_mode`,
  `payment_method`, `status`, non-negative prices/amounts, `max_zoom >= min_zoom`,
  and positive `page_aspect_ratio`/`min_zoom`/`page_number`.
- Indexes: `book_pages_book_id_page_number_idx`, `orders_book_id_idx`,
  `orders_status_idx`, `orders_created_at_idx` (desc), `books_is_published_idx`.
- Trigger function `public.set_updated_at()` (plpgsql) applied via BEFORE UPDATE
  triggers on `books`, `book_pages`, `orders`.
- Function `public.is_admin()` — `stable security definer set search_path = public`;
  returns whether `auth.uid()` exists in `admin_users`; execute granted to
  `anon, authenticated` (revoked from `public`).
- RLS enabled on `books`, `book_pages`, `orders`, `admin_users`.
  - `books_public_read_published` (anon/authenticated SELECT where `is_published`),
    `books_admin_all` (authenticated ALL where `is_admin()`).
  - `book_pages_public_read_available` (anon/authenticated SELECT where
    `is_available` and parent book published), `book_pages_admin_all`.
  - `orders_admin_all` (authenticated ALL where `is_admin()`) — no public access;
    server inserts happen with the service-role key, which bypasses RLS.
- Realtime: publication `supabase_realtime` includes `books` and `book_pages`;
  `replica identity full` set on `books`, `book_pages`, `orders`.
- `pgcrypto` extension created (for `gen_random_uuid()`).

### Current database state (verified read-only)

- `books`: **0 rows** (catalog empty).
- `book_pages`: **0 rows**.
- `orders`: **0 rows**.
- `admin_users`: **0 rows** (no admin account seeded).
- Storage objects in `book-assets`: **0**.

### Local migration files vs remote (verified)

- Local files: `20251015000000_init.sql`, `20251015000001_rls_storage.sql`.
- `supabase migration list --linked` shows **local == remote** for both versions
  (`20251015000000`, `20251015000001`) → **no pending migrations, no drift detected**.
- The live PostgREST schema exactly matches the columns defined in the local
  migration files. **No schema difference was detected.**

---

## 5. Storage and security status

### Buckets

- **`book-assets` — PRIVATE** (`public: false`, verified via the Storage API
  metadata endpoint). Created by the migration. This is the only bucket used.

### Storage policies (admin-only; from the migration)

- `book_assets_admin_select` / `insert` / `update` / `delete` on `storage.objects`,
  each restricted to `bucket_id = 'book-assets' and public.is_admin()`, for the
  `authenticated` role.

### Object-path conventions (`lib/book/storage-paths.ts`)

```
books/{bookId}/cover.{ext}          cover image
books/{bookId}/book.pdf             full book PDF (never served publicly)
books/{bookId}/preview.pdf          optional pre-trimmed preview PDF
books/{bookId}/pages/{n}.{ext}      individual page images (zero-padded)
```

### How PDFs / page images are stored and delivered

- Admin uploads the full PDF and page images into the private `book-assets`
  bucket. Public visitors never receive raw bucket access.
- Cover and page images are delivered to the browser as **short-lived signed
  URLs** (default TTL 24 h, `DEFAULT_SIGNED_URL_TTL_SECONDS` in
  `lib/supabase/storage.ts`), minted server-side with the secret key.
- **The entire original PDF cannot be accessed by a public visitor.** PDF Mode is
  served only through `/api/book/preview-pdf`, which returns a cached
  `preview.pdf` if present, otherwise trims the full PDF to `previewPageCount`
  pages in memory (`lib/book/preview-pdf.ts`, pdf-lib) and streams that. Page
  images are likewise limited to the first `previewPageCount` available pages.

### Free-preview enforcement (defense in depth)

1. DB: `book_pages` public read only for `is_available` pages of a published book
   (RLS).
2. Server: `loadPublishedBook` selects at most `preview_page_count` pages and only
   signs those URLs; unpublished books return no content.
3. PDF: server-side trim to `previewPageCount`.
4. UI: reader clamps to the preview count and shows the end-of-preview prompt.

### Admin authorization

- Implemented at the data layer: `admin_users` allow-list + `is_admin()`
  security-definer function + admin-only RLS on tables and the private bucket.
- **Incomplete:** there is no Admin UI (Phase 1 excludes it) and **no row exists
  in `admin_users`**, so no one can currently act as admin. Creating the first
  admin requires inserting into `admin_users` (matching an `auth.users.id`).

### Secrets handling

- Only `NEXT_PUBLIC_*` values reach the browser; `SUPABASE_SECRET_KEY` is
  server-only (`lib/supabase/admin.ts` imports `server-only`). `.env*` is
  gitignored except `.env.example`.

---

## 6. Migration status

| Migration | Applied locally | Applied remotely | Notes |
| --- | --- | --- | --- |
| `20251015000000_init.sql` | yes | **yes** | tables, indexes, triggers, `is_admin()`, RLS enable |
| `20251015000001_rls_storage.sql` | yes | **yes** | RLS policies, private bucket, storage policies, realtime |

- Remote state verified with `supabase migration list --linked`: both versions
  present remotely and equal to local. **Nothing pending.**
- `supabase/seed.sql` is entirely commented out; no seed data was applied.

---

## 7. Security status (summary)

- RLS enabled on all app tables; public can read only published books + their
  available pages; `orders` and all writes are admin-only.
- Private `book-assets` bucket; admin-only storage policies; full PDF never
  exposed; assets via signed URLs.
- Server-authoritative pricing; client prices ignored; 503 when backend
  unconfigured (never fake success); 409 when unpublished.
- Endpoint hardening: POST-only, JSON parse, 10 KB body limit, per-IP rate limit
  5/min → 429, mapped errors.
- **Known gaps / risks:** rate limiting is in-memory and per-instance (not
  distributed); no idempotency key; no admin user seeded; `admin_users` is
  currently empty; transitive `npm audit` advisories (eslint tooling) documented
  but not force-fixed.
- No credentials are stored in the repository.

---

## 8. Verified test results

Executed during this handoff (2026-10-15), local machine:

| Command | Result |
| --- | --- |
| `npm run lint` | **Pass** (exit 0) |
| `npm run typecheck` | **Pass** (exit 0, `tsc --noEmit`) |
| `npm test` | **Pass** — 8 files, **50 tests** |
| `npm run build` | **Success** (Next.js 16.4.0, Turbopack) |

Build route table:

```
┌ ƒ /                        (Dynamic — server-rendered on demand)
├ ○ /_not-found
├ ƒ /api/book
├ ƒ /api/book/preview-pdf
└ ƒ /api/orders
```

Runtime / live-backend results previously verified (and consistent with the
current read-only checks):

- `GET /` → 200; the reader + order UI renders ("HSC English Last Hour").
- `GET /api/book` → 200 with a published `BookConfig`.
- `POST /api/orders` → **201** with a real row inserted into the live `orders`
  table, then that test row (and other test data) was removed. Anon cannot read
  `orders` (0 rows). The catalog is now empty by design.
- Storage: the private bucket rejects anonymous access; a signed URL fetch
  returned 200 while it existed.

Note: `CURRENT_STATUS.md` currently says `/` is "static"; after adding
`export const instant = false` the route is **dynamic (`ƒ`)**, as shown above.
`CURRENT_STATUS.md` should be refreshed.

### Not tested

- **Supabase Realtime has not been live-tested** in a browser (subscriptions are
  implemented; confirming an edit to a `books`/`book_pages` row triggers a live
  refresh is still pending).

---

## 9. Current application status

| Item | Status |
| --- | --- |
| `GET /` | Works (200) |
| `GET /api/book` | Works (200) |
| `POST /api/orders` | Works — verified persisting a real order (201); ignores client pricing |
| Supabase Realtime | Implemented; **not live-tested** |
| Admin Panel | **Not built** (intentionally out of Phase 1 scope); admin RLS/`is_admin()` exist but no admin UI and no admin user seeded |
| Book catalog | **Empty** — no `books` row, no pages, no assets |
| Content fallback | Production shows graceful "preview coming soon"; dev uses neutral fixtures |
| Preview restriction | Enforced (RLS + server slicing + PDF trim + UI clamp) |

### Remaining configuration tasks before production use

1. **Add real content:** insert the `books` row (id `hscenglishlasthour`) and
   `book_pages` rows, upload `cover.*`, `pages/*`, and `book.pdf` (and optionally
   `preview.pdf`) into the private `book-assets` bucket, then set
   `is_published = true`.
2. **Seed the first admin:** insert a row into `admin_users` referencing an
   `auth.users.id` so admin RLS/storage become usable (and build the Admin UI in
   Phase 2).
3. **Confirm Realtime** in a browser while editing the published row.
4. **Decide on Storage limits:** `supabase/config.toml` sets a local
   `file_size_limit = 50MiB` and no allowed MIME types; the remote bucket reports
   `file_size_limit: null` and `allowed_mime_types: null` (verified), so bucket
   limits may need to be set remotely if desired.
5. Refresh `CURRENT_STATUS.md` (route is dynamic, not static).
6. Optional hardening: distributed rate limiting and an idempotency key.

---

## 10. Exact information ChatGPT needs to continue

- **Target project:** ref `qrkzygdvckuirqmmdxcj` (org `ogwirsgndidahxeprzpt`).
  Connect using the same Supabase account that owns org "hscenglish38-ui's Org".
  Do **not** create a new project; do **not** delete existing data.
- **Schema is already applied and in sync** (both migrations, local == remote).
  Any further change should be a **new timestamped migration** in
  `supabase/migrations/`, then `supabase db push` (never edit applied migrations).
- **Bucket** `book-assets` is private; keep it private. Upload only via admin
  (service-role) server code or the Dashboard as an authenticated admin.
- **Key tables and the columns they expect** — see §4. The application reads
  `books` + `book_pages` and writes `orders`. Column names/types must match
  `types/database.ts` (generated from this project).
- **Book id is fixed:** `hscenglishlasthour`.
- **Content must be real** — no fabricated marketing text; leave `is_published =
  false` until real assets exist.
- **Storage paths are deterministic** — see §5 (e.g.
  `books/hscenglishlasthour/book.pdf`, `books/hscenglishlasthour/pages/001.webp`).
- **First admin:** create an `auth.users` user, add its id to `admin_users`.
- **Secrets:** keep the secret/service-role key server-only; use only the
  publishable/anon key in the browser. Never commit credentials. Do not paste
  signed URLs anywhere permanent.
- **Verification commands to run after changes:** `npm run lint`,
  `npm run typecheck`, `npm test`, `npm run build`, and
  `supabase migration list --linked` (expect local == remote).

---

### Provenance

- Live facts gathered via the authenticated Supabase CLI and read-only REST/
  Storage API calls against `qrkzygdvckuirqmmdxcj`.
- No migrations were run, no resources created, and no data modified or deleted
  during this handoff.
