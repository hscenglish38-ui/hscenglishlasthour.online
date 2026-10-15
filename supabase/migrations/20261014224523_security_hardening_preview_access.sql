-- Restrict direct Data API reads to published metadata and permitted preview pages.
-- Internal Storage paths remain server-only; the application API uses its server-side client.
REVOKE SELECT ON TABLE public.books FROM anon, authenticated;
GRANT SELECT (
  id, title, author, description, content_mode, is_published,
  price, offer_price, delivery_charge, currency, preview_page_count,
  default_mode, page_aspect_ratio, flip_enabled, pdf_enabled,
  min_zoom, max_zoom, market_country, phone_region, created_at, updated_at
) ON TABLE public.books TO anon, authenticated;

REVOKE SELECT ON TABLE public.book_pages FROM anon, authenticated;
GRANT SELECT (
  id, book_id, page_number, is_available, alt, created_at, updated_at
) ON TABLE public.book_pages TO anon, authenticated;

DROP POLICY IF EXISTS book_pages_public_read_available ON public.book_pages;
CREATE POLICY book_pages_public_read_available
ON public.book_pages
FOR SELECT
TO anon, authenticated
USING (
  is_available = true
  AND EXISTS (
    SELECT 1
    FROM public.books AS b
    WHERE b.id = book_pages.book_id
      AND b.is_published = true
      AND book_pages.page_number <= b.preview_page_count
  )
);

-- The policy function is used by authenticated admin policies, not anonymous callers.
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon;

-- Pin the trigger function's search_path to avoid mutable-path resolution.
ALTER FUNCTION public.set_updated_at() SET search_path = pg_catalog;
