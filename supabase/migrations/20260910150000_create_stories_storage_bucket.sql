-- Stories media is uploaded by the Worker with the Supabase service role.
-- Keep the bucket public so story media URLs can be rendered directly by the app.
insert into storage.buckets (id, name, public)
values ('stories', 'stories', true)
on conflict (id) do update set public = true;
