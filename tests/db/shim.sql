-- Minimal stand-in for what a Supabase project provides, so migrations run in PGlite.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema realtime;
create table realtime.sent_log (
  id bigserial primary key,
  payload jsonb,
  event text,
  topic text,
  private boolean,
  sent_at timestamptz default now()
);
create function realtime.send(payload jsonb, event text, topic text, private boolean default true)
returns void language sql as $$
  insert into realtime.sent_log(payload, event, topic, private) values (payload, event, topic, private);
$$;
grant usage on schema realtime to anon, authenticated, service_role;
grant insert on realtime.sent_log to anon, authenticated, service_role;
grant usage on sequence realtime.sent_log_id_seq to anon, authenticated, service_role;

grant usage on schema public to anon, authenticated, service_role;
