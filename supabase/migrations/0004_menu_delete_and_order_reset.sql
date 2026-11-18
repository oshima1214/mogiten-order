-- Menu items can be deleted even when orders reference them (order lines keep their
-- own copy of name and price), and staff can wipe all order data before the real event.
-- Safe to run once on a project that already has 0001–0003.

-- 1. Order lines no longer require their menu item to exist.
alter table public.order_items drop constraint order_items_pkey;
alter table public.order_items add column id bigint generated always as identity primary key;
alter table public.order_items add constraint order_items_order_menu_unique unique (order_id, menu_item_id);
alter table public.order_items alter column menu_item_id drop not null;
alter table public.order_items drop constraint order_items_menu_item_id_fkey;
alter table public.order_items add constraint order_items_menu_item_id_fkey
  foreign key (menu_item_id) references public.menu_items (id) on delete set null;

-- 2. Order lines as JSON, in menu order; deleted items last.
create or replace function public.order_lines_json(p_order_id uuid) returns json
language sql stable security definer set search_path = public
as $$
  select coalesce(json_agg(json_build_object('name', oi.name, 'quantity', oi.quantity)
                           order by m.sort_order nulls last, m.created_at, oi.name), '[]'::json)
  from order_items oi left join menu_items m on m.id = oi.menu_item_id
  where oi.order_id = p_order_id
$$;
revoke all on function public.order_lines_json(uuid) from public, anon, authenticated;
grant execute on function public.order_lines_json(uuid) to service_role;

create or replace function public.order_json(p_order public.orders) returns json
language sql stable security definer set search_path = public
as $$
  select json_build_object(
    'id', p_order.id,
    'number', p_order.number,
    'status', p_order.status,
    'createdAt', p_order.created_at,
    'readyAt', p_order.ready_at,
    'items', order_lines_json(p_order.id),
    'totalTickets', (select coalesce(sum(price_tickets * quantity), 0)::int
                     from order_items where order_id = p_order.id)
  )
$$;

create or replace function public.get_my_order(p_token uuid) returns json
language plpgsql stable security definer set search_path = public
as $$
declare
  v_order orders%rowtype;
begin
  -- Finished orders (delivered/cancelled) are reported too, so the phone can tell a
  -- staff cancellation apart from a normal hand-over before it forgets the token.
  select * into v_order from orders
  where token = p_token and business_date = app_today();
  if not found then
    return null;
  end if;

  return json_build_object(
    'number', v_order.number,
    'status', v_order.status,
    'items', order_lines_json(v_order.id),
    'totalTickets', (select coalesce(sum(price_tickets * quantity), 0)::int
                     from order_items where order_id = v_order.id),
    'aheadCount', case when v_order.status = 'cooking' then (
      select count(*)::int from orders
      where business_date = v_order.business_date and status = 'cooking' and number < v_order.number)
      else 0 end,
    'waitingTotal', (select count(*)::int from orders
                     where business_date = v_order.business_date and status = 'cooking')
  );
end;
$$;

-- Customers cannot cancel (staff only). Drop it in case an older 0002 created it.
drop function if exists public.cancel_my_order(uuid);

-- 3. Deleting a menu item always deletes it now.
create or replace function public.admin_delete_menu_item(p_id uuid) returns text
language plpgsql security definer set search_path = public
as $$
begin
  delete from menu_items where id = p_id;
  return 'deleted';
end;
$$;

-- 4. Wipe all orders, lines and numbering (menu, photos and settings stay).
-- DELETE needs a WHERE clause: Supabase's safeupdate rejects unqualified deletes from the API.
create or replace function public.admin_reset_orders() returns void
language plpgsql security definer set search_path = public
as $$
begin
  delete from orders where true;          -- order_items go with them (on delete cascade)
  delete from order_counters where true;
end;
$$;
revoke all on function public.admin_reset_orders() from public, anon, authenticated;
grant execute on function public.admin_reset_orders() to service_role;
