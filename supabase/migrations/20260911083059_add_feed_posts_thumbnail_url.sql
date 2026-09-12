-- Feed images were always downloaded/decoded at full display size (up to
-- 2200px) even for the small scrolling feed view — the same file used
-- for both the inline card and the full-screen preview. This adds a slot
-- for a separate, much smaller thumbnail generated client-side at
-- upload time, so the feed list can load that instead and only fetch
-- the full image when someone actually opens it.

alter table public.feed_posts
  add column if not exists thumbnail_url text;
