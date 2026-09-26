create table if not exists public.feed_post_reposts (
  id bigserial primary key,
  post_id bigint not null references public.feed_posts(id) on delete cascade,
  user_email text not null,
  created_at timestamptz not null default now(),
  unique (post_id, user_email)
);

create index if not exists feed_post_reposts_post_idx on public.feed_post_reposts(post_id, created_at desc);
create index if not exists feed_post_reposts_user_idx on public.feed_post_reposts(lower(user_email), created_at desc);

alter table public.feed_post_reposts enable row level security;

drop policy if exists "feed_post_reposts_select" on public.feed_post_reposts;
create policy "feed_post_reposts_select" on public.feed_post_reposts for select using (true);

drop policy if exists "feed_post_reposts_insert" on public.feed_post_reposts;
create policy "feed_post_reposts_insert" on public.feed_post_reposts for insert with check (true);

drop policy if exists "feed_post_reposts_delete" on public.feed_post_reposts;
create policy "feed_post_reposts_delete" on public.feed_post_reposts for delete using (true);
