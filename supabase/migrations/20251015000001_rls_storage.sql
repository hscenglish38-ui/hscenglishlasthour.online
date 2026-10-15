-- 20251015_000001_rls_storage.sql
-- RLS policies + storage bucket + realtime

-- RLS
alter table public.books enable row level security;
alter table public.book_pages enable row level security;
alter table public.orders enable row level security;

-- books
drop policy if exists "books_public_read_published" on public.books;
create policy "books_public_read_published" on public.books for select to anon, authenticated using (is_published = true);
drop policy if exists "books_admin_all" on public.books;
create policy "books_admin_all" on public.books for all to authenticated using (is_admin()) with check (is_admin());

-- book_pages
drop policy if exists "book_pages_public_read_available" on public.book_pages;
create policy "book_pages_public_read_available" on public.book_pages for select to anon, authenticated
  using (is_available = true and exists (select 1 from public.books b where b.id = book_id and b.is_published = true));
drop policy if exists "book_pages_admin_all" on public.book_pages;
create policy "book_pages_admin_all" on public.book_pages for all to authenticated using (is_admin()) with check (is_admin());

-- orders (no public access; only admin manages; inserts via service role bypass RLS)
drop policy if exists "orders_admin_all" on public.orders;
create policy "orders_admin_all" on public.orders for all to authenticated using (is_admin()) with check (is_admin());

-- storage bucket: private book-assets
insert into storage.buckets (id, name, public) values ('book-assets', 'book-assets', false)
on conflict (id) do nothing;

-- storage policies (admin-only)
drop policy if exists "book_assets_admin_select" on storage.objects;
create policy "book_assets_admin_select" on storage.objects for select to authenticated using (bucket_id = 'book-assets' and public.is_admin());
drop policy if exists "book_assets_admin_insert" on storage.objects;
create policy "book_assets_admin_insert" on storage.objects for insert to authenticated with check (bucket_id = 'book-assets' and public.is_admin());
drop policy if exists "book_assets_admin_update" on storage.objects;
create policy "book_assets_admin_update" on storage.objects for update to authenticated using (bucket_id = 'book-assets' and public.is_admin()) with check (bucket_id = 'book-assets' and public.is_admin());
drop policy if exists "book_assets_admin_delete" on storage.objects;
create policy "book_assets_admin_delete" on storage.objects for delete to authenticated using (bucket_id = 'book-assets' and public.is_admin());

-- realtime publication
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end
$$;
alter publication supabase_realtime add table public.books;
alter publication supabase_realtime add table public.book_pages;

-- replica identity full for RLS-aware postgres_changes
alter table public.books replica identity full;
alter table public.book_pages replica identity full;
alter table public.orders replica identity full;
