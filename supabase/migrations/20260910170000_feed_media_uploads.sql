ALTER TABLE public.feed_posts ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.feed_posts ADD COLUMN IF NOT EXISTS media_type TEXT;
DO $$ BEGIN
  ALTER TABLE public.feed_posts ADD CONSTRAINT feed_posts_media_type_check CHECK (media_type IS NULL OR media_type IN ('image','video'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
INSERT INTO storage.buckets (id, name, public)
VALUES ('feed-media', 'feed-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;
CREATE POLICY "Public can read feed media" ON storage.objects FOR SELECT USING (bucket_id = 'feed-media');
