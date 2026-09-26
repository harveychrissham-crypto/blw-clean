ALTER TABLE public.feed_posts
  ADD COLUMN IF NOT EXISTS quoted_post_id bigint REFERENCES public.feed_posts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_feed_posts_quoted_post_id
  ON public.feed_posts(quoted_post_id);
