-- Staff, sales and admin functions (service_role only) and the change broadcast.

create or replace function public.order_json(p_order public.orders) returns json
language sql stable security definer set search_path = public
as $$
  select json_build_object(
    'id', p_order.id,
    'number', p_order.number,
    'status', p_order.status,
    'createdAt', p_order.created_at,
    'readyAt', p_order.ready_at,
    'items', coalesce((
      select json_agg(json_build_object('name', oi.name, 'quantity', oi.quantity)
                      order by m.sort_order, m.created_at, oi.name)
      from order_items oi join menu_items m on m.id = oi.menu_item_id
      where oi.order_id = p_order.id), '[]'::json),
    'totalTickets', (select coalesce(sum(price_tickets * quantity), 0)::int
                     from order_items where order_id = p_order.id)
  )
$$;

create or replace function public.staff_list_orders() returns json
language sql stable security definer set search_path = public
as $$
  select json_build_object(
    'cooking', coalesce((select json_agg(order_json(o) order by o.number) from orders o
                         where o.business_date = app_today() and o.status = 'cooking'), '[]'::json),
    'ready', coalesce((select json_agg(order_json(o) order by o.number) from orders o
                       where o.business_date = app_today() and o.status = 'ready'), '[]'::json)
  )
$$;

create or replace function public.staff_update_order(p_id uuid, p_action text) returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_new text;
begin
  case p_action
    when 'complete' then
      update orders set status = 'ready', ready_at = now()
      where id = p_id and status = 'cooking' returning status into v_new;
    when 'deliver' then
      update orders set status = 'delivered', delivered_at = now()
      where id = p_id and status = 'ready' returning status into v_new;
    when 'revert' then
      update orders set status = 'cooking', ready_at = null
      where id = p_id and status = 'ready' returning status into v_new;
    when 'cancel' then
      update orders set status = 'cancelled', cancelled_at = now()
      where id = p_id and status in ('cooking', 'ready') returning status into v_new;
    else
      v_new := null;
  end case;
  if v_new is null then
    raise exception 'invalid_transition';
  end if;
  return v_new;
end;
$$;

create or replace function public.sales_summary(p_date date) returns json
language sql stable security definer set search_path = public
as $$
  with scoped as (
    select * from orders where p_date is null or business_date = p_date
  ),
  delivered_lines as (
    select oi.* from order_items oi join scoped o on o.id = oi.order_id where o.status = 'delivered'
  )
  select json_build_object(
    'ticketsTotal', (select coalesce(sum(price_tickets * quantity), 0)::int from delivered_lines),
    'deliveredCount', (select count(*)::int from scoped where status = 'delivered'),
    'cancelledCount', (select count(*)::int from scoped where status = 'cancelled'),
    'items', coalesce((
      select json_agg(json_build_object('name', name, 'quantity', qty, 'tickets', tickets)
                      order by qty desc, name)
      from (select name, sum(quantity)::int as qty, sum(price_tickets * quantity)::int as tickets
            from delivered_lines group by name) s), '[]'::json),
    'dates', coalesce((
      select json_agg(to_char(d, 'YYYY-MM-DD') order by d desc)
      from (select distinct business_date as d from orders) ds), '[]'::json)
  )
$$;

create or replace function public.admin_delete_menu_item(p_id uuid) returns text
language plpgsql security definer set search_path = public
as $$
begin
  if exists (select 1 from order_items where menu_item_id = p_id) then
    update menu_items set is_visible = false where id = p_id;
    return 'hidden';
  end if;
  delete from menu_items where id = p_id;
  return 'deleted';
end;
$$;

create or replace function public.admin_reorder_menu(p_ids uuid[]) returns void
language sql security definer set search_path = public
as $$
  update menu_items m set sort_order = x.ord - 1
  from unnest(p_ids) with ordinality as x(id, ord)
  where m.id = x.id
$$;

revoke all on function
  public.order_json(public.orders), public.staff_list_orders(), public.staff_update_order(uuid, text),
  public.sales_summary(date), public.admin_delete_menu_item(uuid), public.admin_reorder_menu(uuid[])
  from public, anon, authenticated;
grant execute on function
  public.order_json(public.orders), public.staff_list_orders(), public.staff_update_order(uuid, text),
  public.sales_summary(date), public.admin_delete_menu_item(uuid), public.admin_reorder_menu(uuid[])
  to service_role;

-- Broadcast a content-free "something changed" signal on the public channel `shop`.
-- Clients refetch through the paths they are allowed to use.
create or replace function public.notify_shop_change() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  perform realtime.send(jsonb_build_object('table', tg_table_name), 'changed', 'shop', false);
  return null;
end;
$$;
revoke all on function public.notify_shop_change() from public, anon, authenticated;

create trigger orders_changed after insert or update or delete on public.orders
  for each statement execute function public.notify_shop_change();
create trigger menu_items_changed after insert or update or delete on public.menu_items
  for each statement execute function public.notify_shop_change();
create trigger settings_changed after insert or update or delete on public.settings
  for each statement execute function public.notify_shop_change();
