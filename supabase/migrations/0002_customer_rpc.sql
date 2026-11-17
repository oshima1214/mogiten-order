-- Customer-facing functions. They run as the owner (security definer) so customers
-- never need direct access to the orders tables; the token is the only key to an order.

create or replace function public.place_order(p_items jsonb) returns json
language plpgsql security definer set search_path = public
as $$
declare
  v_today date := app_today();
  v_number int;
  v_order orders%rowtype;
  v_line record;
  v_item menu_items%rowtype;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'empty_order';
  end if;

  for v_line in
    select (e->>'menu_item_id')::uuid as menu_item_id, (e->>'quantity')::int as quantity
    from jsonb_array_elements(p_items) e
  loop
    if v_line.quantity is null or v_line.quantity < 1 or v_line.quantity > 10 then
      raise exception 'invalid_quantity';
    end if;
    select * into v_item from menu_items where id = v_line.menu_item_id for share;
    if not found or not v_item.is_visible then
      raise exception 'item_unavailable';
    end if;
    if v_item.is_sold_out then
      raise exception 'sold_out';
    end if;
  end loop;

  insert into order_counters (business_date, last_number) values (v_today, 1)
  on conflict (business_date) do update set last_number = order_counters.last_number + 1
  returning last_number into v_number;

  insert into orders (business_date, number) values (v_today, v_number) returning * into v_order;

  insert into order_items (order_id, menu_item_id, name, price_tickets, quantity)
  select v_order.id, m.id, m.name, m.price_tickets, sum(l.quantity)::int
  from (
    select (e->>'menu_item_id')::uuid as menu_item_id, (e->>'quantity')::int as quantity
    from jsonb_array_elements(p_items) e
  ) l
  join menu_items m on m.id = l.menu_item_id
  group by m.id, m.name, m.price_tickets;

  if exists (select 1 from order_items where order_id = v_order.id and quantity > 10) then
    raise exception 'invalid_quantity';
  end if;

  return json_build_object('token', v_order.token, 'number', v_order.number);
end;
$$;

create or replace function public.get_my_order(p_token uuid) returns json
language plpgsql stable security definer set search_path = public
as $$
declare
  v_order orders%rowtype;
begin
  select * into v_order from orders
  where token = p_token and business_date = app_today() and status in ('cooking', 'ready');
  if not found then
    return null;
  end if;

  return json_build_object(
    'number', v_order.number,
    'status', v_order.status,
    'items', coalesce((
      select json_agg(json_build_object('name', oi.name, 'quantity', oi.quantity)
                      order by m.sort_order, m.created_at, oi.name)
      from order_items oi join menu_items m on m.id = oi.menu_item_id
      where oi.order_id = v_order.id), '[]'::json),
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

create or replace function public.cancel_my_order(p_token uuid) returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status from orders where token = p_token for update;
  if not found then
    return 'not_found';
  end if;
  if v_status <> 'cooking' then
    return 'not_cancellable';
  end if;
  update orders set status = 'cancelled', cancelled_at = now() where token = p_token;
  return 'cancelled';
end;
$$;

revoke all on function public.place_order(jsonb), public.get_my_order(uuid), public.cancel_my_order(uuid) from public;
grant execute on function public.place_order(jsonb), public.get_my_order(uuid), public.cancel_my_order(uuid)
  to anon, authenticated, service_role;
