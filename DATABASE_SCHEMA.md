# Database Schema (Supabase / Postgres)

Migrations live in `supabase/migrations/` (`20251015000000_init.sql`, `20251015000001_rls_storage.sql`,
`20261014224523_security_hardening_preview_access.sql`, `20261014224544_restrict_anonymous_catalog_privileges.sql`,
`20261014224600_revoke_public_sensitive_table_grants.sql`, `20261015120000_add_orders_quantity.sql`).
Seed data (optional, commented) in `supabase/seed.sql`.

## Table: `books`
Single-row-per-book catalog. Document id is a stable slug, e.g. `hscenglishlasthour`.
Read on the server by `lib/book/source.ts` (`loadPublishedBook`) via the service-role client.

| Column | Type | Notes |
|---|---|---|
| id | text PK | Slug, e.g. `hscenglishlasthour` |
| title | text not null | Display title |
| author | text | |
| description | text | |
| cover_image_path | text | Storage path in `book-assets`, e.g. `books/{id}/cover.webp` |
| content_mode | text | `page-images` \| `pdf` (default `page-images`) |
| pdf_storage_path | text | Full PDF path (never exposed publicly) |
| is_published | boolean | Default `false`; loader fails closed |
| price | numeric(10,2) | Integer BDT |
| offer_price | numeric(10,2) | When set, the charged amount |
| delivery_charge | numeric(10,2) | Integer BDT |
| currency | text | `BDT` |
| preview_page_count | integer | Free preview pages. App ceiling `MAX_PREVIEW_PAGE_COUNT = 10`; DB default 4, live row set to 10 |
| default_mode | text | `flip` \| `pdf` |
| page_aspect_ratio | numeric(8,4) | Default 1.4 |
| flip_enabled | boolean | Default true |
| pdf_enabled | boolean | Default true |
| min_zoom / max_zoom | numeric | Reader zoom bounds |
| market_country | text | Default `Bangladesh` |
| phone_region | text | Default `BD` |
| created_at / updated_at | timestamptz | `updated_at` via `set_updated_at()` trigger |

## Table: `book_pages`
Page images for Book Mode. Unique `(book_id, page_number)` and `(book_id, storage_path)`.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| book_id | text FK → books(id) | `on delete cascade` |
| storage_path | text not null | e.g. `books/{id}/pages/001.webp` |
| page_number | integer | `> 0`, 1-based |
| is_available | boolean | Default true |
| alt | text | Alt text |
| created_at / updated_at | timestamptz | Trigger-managed |

## Table: `orders`
COD orders. Written only by the server (`createOrder`) via the service-role client (bypasses RLS).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | `gen_random_uuid()` |
| book_id | text FK → books(id) | `on delete restrict` |
| book_title | text | Snapshot at order time |
| customer_name / customer_phone / customer_address | text | Trimmed; phone E.164 `+8801XXXXXXXXX` |
| quantity | integer | Copies ordered, `check (quantity between 1 and 20)`, default `1` (added `20261015120000`) |
| book_price / delivery_charge / total_amount | numeric(10,2) | Integer BDT (server-authoritative). `book_price` is the unit price; `total_amount = book_price * quantity + delivery_charge` |
| currency | text | `BDT` |
| payment_method | text | `cod` only |
| status | text | `pending` (then confirmed/packed/shipped/delivered/cancelled) |
| created_at / updated_at | timestamptz | Trigger-managed |

## Table: `admin_users`
`user_id uuid PK → auth.users(id)`. Membership grants admin via `is_admin()`.

## Indexes
- `book_pages_book_id_page_number_idx`
- `orders_book_id_idx`, `orders_status_idx`, `orders_created_at_idx`
- `books_is_published_idx`

## RLS / Security
See `SECURITY.md`. Summary: public may read `books` where `is_published = true` and
`book_pages` where `is_available` and the parent book is published; `orders` and all
writes are admin-only (`is_admin()` security-definer function). Storage bucket
`book-assets` is private, admin-only. Public asset access is via short-lived signed URLs.
Realtime is enabled on `books` and `book_pages` (`replica identity full`).
