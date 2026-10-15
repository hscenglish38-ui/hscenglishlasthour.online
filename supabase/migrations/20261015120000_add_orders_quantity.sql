-- 20261015120000_add_orders_quantity.sql
-- Add the ordered copy count to orders. Additive and non-destructive: existing
-- rows default to 1 (they were single-copy orders), and totals on historical
-- rows are left untouched.

alter table public.orders
  add column if not exists quantity integer not null default 1;

-- Enforce the 1..20 range at the database level as well as in the application.
alter table public.orders
  drop constraint if exists orders_quantity_check;

alter table public.orders
  add constraint orders_quantity_check check (quantity >= 1 and quantity <= 20);

comment on column public.orders.quantity is
  'Number of copies ordered (1..20). book_price is the unit price; total_amount = book_price * quantity + delivery_charge.';
