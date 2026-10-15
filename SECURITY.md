# Security

## Secrets
- `.env*` gitignored; only `.env.example` committed (variable names only). Admin creds not `NEXT_PUBLIC_*`; never exposed to client.

## Order authority
- Server recomputes totals from active book config; ignores client prices.
- Checks `book.isPublished`; validates optional `bookId`.
- Success only after confirmed Supabase insert; 503 when Supabase unconfigured.

## Endpoint hardening
- POST-only; JSON parse; body size limit 10KB; per-IP rate limit 5/min → 429. Errors mapped; unexpected → 500.

## Supabase RLS / Storage policies
- Row Level Security is enabled on `books`, `book_pages`, `orders`, `admin_users` (`supabase/migrations/20251015000001_rls_storage.sql`).
- Public (anon) may read only published books and their available pages; `orders` and all writes are admin-only (`is_admin()` security-definer function).
- **Hardening (`20261014224523`, `20261014224544`, `20261014224600`):** anonymous/authenticated reads are limited to an explicit column list (internal `pdf_storage_path` / `cover_image_path` / `book_pages.storage_path` are **not** granted), the public pages policy also enforces `page_number <= preview_page_count`, anonymous privileges on `orders` and anonymous+authenticated privileges on `admin_users` are revoked, anonymous execution of `is_admin()` is revoked, and `set_updated_at()` has a fixed `search_path`. The service-role server client is unaffected; the public catalog REST surface is intentionally limited.
- Storage bucket `book-assets` is **private**; only admins may read/write. The full PDF is never exposed — PDF Mode is served through `/api/book/preview-pdf` (server trims to the preview page count). Cover/page images are delivered as short-lived signed URLs.
- The service-role key is server-only (`SUPABASE_SECRET_KEY`), never `NEXT_PUBLIC_*`; the browser uses the publishable key only and is bound by RLS.
- Realtime `postgres_changes` subscriptions with the publishable key are accepted after the column-grant change; the client also refreshes via the server `/api/book` route on focus/visibility and a 60s poll, so live updates do not depend solely on Realtime.

## Duplicate submissions
- Client: in-flight ref guard + disabled button. Server: rate limiting.

## Known
- Rate limiting in-memory/per-instance (not distributed).
- No idempotency key (documented).
- Transitive `npm audit` advisories documented; not force-fixed.
