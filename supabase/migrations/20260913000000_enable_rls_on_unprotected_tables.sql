-- These 7 tables were created without row level security, unlike their
-- sibling tables (feed_posts/feed_post_likes/feed_post_saves/
-- feed_post_comments, message_conversations/message_participants/messages,
-- feed_user_follows) which all correctly enabled it from the start.
--
-- This app never talks to these tables through Supabase's PostgREST/anon-key
-- layer -- every read and write goes through the Cloudflare Worker's own
-- authenticated API, using a direct Postgres connection (pg.Client via
-- Hyperdrive/DATABASE_URL) as the table owner, which bypasses RLS
-- regardless of policies. So enabling RLS here with zero policies changes
-- nothing about how the app itself behaves.
--
-- What it does change: today, if this Supabase project's anon key is ever
-- discoverable (which Supabase's own security model assumes is possible --
-- the anon key is designed to be public, RLS is the actual boundary), any
-- of these 7 tables could be read, inserted into, or deleted from directly
-- via the project's REST API with no authentication at all. That's a real
-- gap for push_tokens (harvesting every member's email + FCM token) and
-- feed_content_reports (exposing who reported what, or tampering with open
-- reports) in particular, plus arbitrary manipulation of story views and
-- sermon-post likes/saves/comments.
alter table public.push_tokens enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
alter table public.feed_content_reports enable row level security;
alter table public.feed_likes enable row level security;
alter table public.feed_saves enable row level security;
alter table public.feed_comments enable row level security;
