import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiAtSign,
  FiBell,
  FiCheck,
  FiHeart,
  FiMessageCircle,
  FiRepeat,
  FiUserPlus,
} from 'react-icons/fi';
import { apiFetch } from '../config/api';

const formatTimestamp = (iso) => {
  try {
    const date = new Date(iso);
    const diffMs = Math.max(0, Date.now() - date.getTime());
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return 'now';
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

const getNotificationType = (notification) => {
  const data = notification?.data && typeof notification.data === 'object' ? notification.data : {};
  const raw = String(data.type || notification?.type || '').toLowerCase();

  if (raw.includes('like')) return 'like';
  if (raw.includes('reply') || raw.includes('comment')) return 'reply';
  if (raw.includes('follow')) return 'follow';
  if (raw.includes('mention')) return 'mention';
  if (raw.includes('repost') || raw.includes('retweet')) return 'repost';
  if (raw.includes('quote')) return 'quote';
  return 'default';
};

const getFeedTarget = (notification) => {
  const data = notification?.data && typeof notification.data === 'object' ? notification.data : {};
  const postId =
    data.postId ??
    data.post_id ??
    data.feedPostId ??
    data.feed_post_id ??
    data.targetPostId ??
    data.target_post_id ??
    data.id;

  return postId ? String(postId) : null;
};

const typeMeta = {
  like: { Icon: FiHeart, label: 'liked your post' },
  reply: { Icon: FiMessageCircle, label: 'replied to your post' },
  follow: { Icon: FiUserPlus, label: 'followed you' },
  mention: { Icon: FiAtSign, label: 'mentioned you' },
  repost: { Icon: FiRepeat, label: 'reposted your post' },
  quote: { Icon: FiRepeat, label: 'quoted your post' },
  default: { Icon: FiBell, label: '' },
};

const filters = ['All', 'Mentions', 'Likes', 'Follows', 'Reposts'];

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(() => loadNotifications());
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const refresh = () => setNotifications(loadNotifications());
    refresh();
    return onNotificationsUpdated(refresh);
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  const filtered = useMemo(() => {
    return notifications.filter((notification) => {
      if (filter === 'All') return true;
      const type = getNotificationType(notification);
      if (filter === 'Mentions') return type === 'mention';
      if (filter === 'Likes') return type === 'like';
      if (filter === 'Follows') return type === 'follow';
      return type === 'repost' || type === 'quote';
    });
  }, [notifications, filter]);

  const openNotification = (notification) => {
    markAsRead(notification.id);
    const target = getFeedTarget(notification);
    if (target) navigate(`/feed?notificationId=${encodeURIComponent(target)}`);
  };

  const markEverythingRead = () => {
    markAllAsRead();
    setNotifications(loadNotifications());
  };

  return (
    <main className="min-h-screen bg-[#0B0F14] text-white pb-24">
      <div className="mx-auto w-full max-w-2xl border-x border-white/[.06]">
        <header className="sticky top-0 z-20 border-b border-white/[.07] bg-[#0B0F14]/92 px-4 pt-4 backdrop-blur-xl sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold tracking-tight">Notifications</h1>
              <p className="mt-1 text-xs text-white/35">
                {unreadCount ? `${unreadCount} unread` : 'You’re all caught up'}
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markEverythingRead}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-white/10 px-3.5 py-2.5 text-xs font-semibold hover:border-[#3B82F6]/40 text-white/65 transition hover:border-white/20 hover:bg-white/[.05] hover:text-white"
              >
                <FiCheck />
                Mark all read
              </button>
            )}
          </div>

          <div className="mt-4 flex overflow-x-auto" role="tablist" aria-label="Notification filters">
            {filters.map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={filter === item}
                onClick={() => setFilter(item)}
                className={`relative shrink-0 px-4 py-3 text-sm font-semibold transition ${
                  filter === item ? 'text-white' : 'text-white/35 hover:text-white/70'
                }`}
              >
                {item}
                {filter === item && (
                  <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-[#3B82F6]" />
                )}
              </button>
            ))}
          </div>
        </header>

        {filtered.length ? (
          <section aria-label="Notifications">
            {filtered.map((notification) => {
              const type = getNotificationType(notification);
              const meta = typeMeta[type];
              const Icon = meta.Icon;
              const data = notification?.data && typeof notification.data === 'object' ? notification.data : {};
              const avatar = data.avatarUrl || data.avatar || data.actorAvatarUrl;
              const actor = data.actorName || data.userName || notification.title || 'Emet member';

              return (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => openNotification(notification)}
                  className={`flex w-full gap-3 border-b border-white/[.06] px-4 py-4 text-left transition hover:bg-white/[.025] sm:px-6 ${
                    notification.read ? '' : 'bg-white/[.025]'
                  }`}
                >
                  <div className="relative shrink-0">
                    {avatar ? (
                      <img
                        src={avatar}
                        alt=""
                        className="h-11 w-11 rounded-full object-cover"
                      />
                    ) : (
                      <div className="grid h-11 w-11 place-items-center rounded-full border border-white/[.08] bg-white/[.05] text-white/65">
                        <Icon className="h-5 w-5" />
                      </div>
                    )}
                    {!notification.read && (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-[#3B82F6] ring-2 ring-[#0B0F14]" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-6 text-white/70">
                      <span className="font-bold text-white">{actor}</span>
                      {meta.label && <span> {meta.label}</span>}
                    </p>
                    {notification.body && (
                      <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-white/40">
                        {notification.body}
                      </p>
                    )}
                    <p className="mt-1.5 text-xs text-white/25">
                      {formatTimestamp(notification.receivedAt)}
                    </p>
                  </div>
                </button>
              );
            })}
          </section>
        ) : (
          <div className="px-6 py-24 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-white/[.08] bg-white/[.04] text-white/40">
              <FiBell />
            </div>
            <h2 className="mt-4 text-base font-bold text-white">
              {filter === 'All' ? 'Nothing here yet' : `No ${filter.toLowerCase()} yet`}
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-white/35">
              When people interact with you, you’ll see it here.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
