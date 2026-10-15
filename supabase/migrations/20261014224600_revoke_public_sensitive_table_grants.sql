-- Orders are written by the trusted server using service_role; anon needs no direct table privileges.
REVOKE ALL PRIVILEGES ON TABLE public.orders FROM anon;
-- Admin membership is only consulted inside public.is_admin(); direct Data API access is unnecessary.
REVOKE ALL PRIVILEGES ON TABLE public.admin_users FROM anon, authenticated;
