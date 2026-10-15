-- Anonymous visitors only need the explicitly granted safe read columns.
-- Remove inherited broad table grants so RLS is not the only write barrier.
REVOKE ALL PRIVILEGES ON TABLE public.books FROM anon;
REVOKE ALL PRIVILEGES ON TABLE public.book_pages FROM anon;

GRANT SELECT (
  id, title, author, description, content_mode, is_published,
  price, offer_price, delivery_charge, currency, preview_page_count,
  default_mode, page_aspect_ratio, flip_enabled, pdf_enabled,
  min_zoom, max_zoom, market_country, phone_region, created_at, updated_at
) ON TABLE public.books TO anon;

GRANT SELECT (
  id, book_id, page_number, is_available, alt, created_at, updated_at
) ON TABLE public.book_pages TO anon;
