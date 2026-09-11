-- The Feed's "Liked by X, Y and N others" line runs a correlated
-- subquery per post (ORDER BY created_at DESC LIMIT 2) to find the
-- most recent likers. The existing indexes only cover post_id/sermon_id
-- alone, so that subquery has to sort every like for a post in memory
-- on every single feed page load. These composite indexes let Postgres
-- walk straight to the newest likes without sorting, which matters most
-- on popular posts with a lot of likes.

create index if not exists feed_post_likes_post_id_created_at_idx
  on public.feed_post_likes (post_id, created_at desc);

create index if not exists feed_likes_sermon_id_created_at_idx
  on public.feed_likes (sermon_id, created_at desc);
