create or replace function public.create_feed_notification()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recipient text;
  actor text;
  target_post text;
  notification_type text;
begin
  actor := '';
  recipient := '';
  target_post := null;
  notification_type := null;

  if TG_TABLE_NAME = 'feed_user_follows' then
    actor := lower(coalesce(new.follower_email, ''));
    recipient := lower(coalesce(new.followed_email, ''));
    notification_type := 'follow';
  elsif TG_TABLE_NAME = 'feed_post_likes' then
    actor := lower(coalesce(new.user_email, ''));
    select lower(p.user_email), 'p:' || p.id::text into recipient, target_post
      from public.feed_posts p where p.id = new.post_id;
    notification_type := 'like';
  elsif TG_TABLE_NAME = 'feed_post_comments' then
    actor := lower(coalesce(new.user_email, ''));
    select lower(p.user_email), 'p:' || p.id::text into recipient, target_post
      from public.feed_posts p where p.id = new.post_id;
    notification_type := 'reply';
  else
    return new;
  end if;

  if recipient = '' or actor = '' or recipient = actor then return new; end if;

  insert into public.notifications(recipient_email, actor_email, type, post_id, body)
  values (
    recipient,
    actor,
    notification_type,
    target_post,
    case when notification_type = 'reply' then left(coalesce(new.body, ''), 500) else '' end
  );
  return new;
end;
$$;
