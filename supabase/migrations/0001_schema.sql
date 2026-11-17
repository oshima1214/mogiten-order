-- Tables, row level security and grants.
-- Supabase grants anon/authenticated broad privileges on public tables by default,
-- so every grant here is explicit: revoke all, then allow only what customers need.

create or replace function public.app_today() returns date
language sql stable
as $$ select (now() at time zone 'Asia/Tokyo')::date $$;

create table public.settings (
  id int primary key check (id = 1),
  shop_name text not null default '模擬店'
);
insert into public.settings (id) values (1);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  price_tickets int not null check (price_tickets between 1 and 99),
  sort_order int not null default 0,
  image_path text,
  is_visible boolean not null default true,
  is_sold_out boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  business_date date not null default public.app_today(),
  number int not null,
  token uuid not null unique default gen_random_uuid(),
  status text not null default 'cooking'
    check (status in ('cooking', 'ready', 'delivered', 'cancelled')),
  created_at timestamptz not null default now(),
  ready_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  unique (business_date, number)
);
create index orders_day_status_idx on public.orders (business_date, status, number);

create table public.order_items (
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid not null references public.menu_items (id),
  name text not null,
  price_tickets int not null,
  quantity int not null check (quantity between 1 and 10),
  primary key (order_id, menu_item_id)
);

create table public.order_counters (
  business_date date primary key,
  last_number int not null
);

alter table public.settings enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_counters enable row level security;

revoke all on public.settings, public.menu_items, public.orders, public.order_items, public.order_counters
  from anon, authenticated;
grant all on public.settings, public.menu_items, public.orders, public.order_items, public.order_counters
  to service_role;

grant select on public.settings, public.menu_items to anon, authenticated;
create policy settings_read on public.settings for select to anon, authenticated using (true);
create policy menu_read_visible on public.menu_items for select to anon, authenticated using (is_visible);
