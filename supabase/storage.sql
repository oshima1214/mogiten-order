-- Apply once on the real Supabase project (not used by tests).
-- Public-read bucket for menu photos; uploads happen server-side with the service_role key.
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do update set public = true;
