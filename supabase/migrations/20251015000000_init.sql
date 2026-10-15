-- 20251015_000000_init.sql
-- Schema: books, book_pages, orders, admin_users, triggers, RLS, functions

create extension if not exists pgcrypto;

-- books
create table if not exists public.books (
  id text primary key,
  title text not null,
  author text,
  description text,
  cover_image_path text,
  content_mode text not null default 'page-images' check (content_mode in ('page-images','pdf')),
  pdf_storage_path text,
  is_published boolean not null default false,
  price numeric(10,2) not null default 0 check (price >= 0),
  offer_price numeric(10,2) check (offer_price is null or offer_price >= 0),
  delivery_charge numeric(10,2) not null default 0 check (delivery_charge >= 0),
  currency text not null default 'BDT',
  preview_page_count integer not null default 4 check (preview_page_count >= 0),
  default_mode text not null default 'flip' check (default_mode in ('flip','pdf')),
  page_aspect_ratio numeric(8,4) not null default 1.4 check (page_aspect_ratio > 0),
  flip_enabled boolean not null default true,
  pdf_enabled boolean not null default true,
  min_zoom numeric(6,3) not null default 0.75 check (min_zoom > 0),
  max_zoom numeric(6,3) not null default 2.5 check (max_zoom >= min_zoom),
  market_country text not null default 'Bangladesh',
  phone_region text not null default 'BD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- book_pages
create table if not exists public.book_pages (
  id uuid primary key default gen_random_uuid(),
  book_id text not null references public.books(id) on delete cascade,
  storage_path text not null,
  page_number integer not null check (page_number > 0),
  is_available boolean not null default true,
  alt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, page_number),
  unique (book_id, storage_path)
);

-- orders
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  book_id text not null references public.books(id) on delete restrict,
  book_title text not null,
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  book_price numeric(10,2) not null check (book_price >= 0),
  delivery_charge numeric(10,2) not null check (delivery_charge >= 0),
  total_amount numeric(10,2) not null check (total_amount >= 0),
  currency text not null default 'BDT',
  payment_method text not null default 'cod' check (payment_method in ('cod')),
  status text not null default 'pending' check (status in ('pending','confirmed','packed','shipped','delivered','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- indexes
create index if not exists book_pages_book_id_page_number_idx on public.book_pages (book_id, page_number);
create index if not exists orders_book_id_idx on public.orders (book_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists books_is_published_idx on public.books (is_published);

-- updated_at function + triggers
create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists books_set_updated_at on public.books;
create trigger books_set_updated_at before update on public.books for each row execute function public.set_updated_at();
drop trigger if exists book_pages_set_updated_at on public.book_pages;
create trigger book_pages_set_updated_at before update on public.book_pages for each row execute function public.set_updated_at();
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();

-- admins
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

-- is_admin function
create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users a where a.user_id = auth.uid());
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
