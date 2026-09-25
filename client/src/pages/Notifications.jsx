import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCheck, FiHeart, FiMessageCircle, FiRepeat, FiUserPlus, FiAtSign } from 'react-icons/fi';
import { loadNotifications, markAsRead, markAllAsRead, onNotificationsUpdated } from '../utils/notificationStorage';

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
    return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
  } catch { return ''; }
};

const getNotificationType = (notification) => {
  const data = notification?.data && typeof notification.data === 'object' ? notification.data : {};
  const raw = String(data.type || notification?.type || '').toLowerCase();
  if (raw.includes('like')) return 'like';
  if (raw.includes('reply') || raw.includes('comment')) return 'reply';
  if (raw.includes('follow')) return 'follow';
  if (raw.includes('mention')) return 'mention';
  if (raw.includes('repost') || raw.includes('retweet')) return 'repost';
  return 'default';
};

const getFeedTarget = (notification) => {
  const data = notification?.data && typeof notification.data === 'object' ? notification.data : {};
  const postId = data.postId ?? data.post_id ?? data.feedPostId ?? data.feed_post_id ?? data.targetPostId ?? data.target_post_id ?? data.id;
  if (!postId) return null;
  return String(postId);
};

const typeMeta = {
  like: { Icon: FiHeart, label: 'liked your post', color: 'text-rose-300', bg: 'bg-rose-400/10' },
  reply: { Icon: FiMessageCircle, label: 'replied to your post', color: 'text-sky-300', bg: 'bg-sky-400/10' },
  follow: { Icon: FiUserPlus, label: 'followed you', color: 'text-emerald-300', bg: 'bg-emerald-400/10' },
  mention: { Icon: FiAtSign, label: 'mentioned you', color: 'text-violet-300', bg: 'bg-violet-400/10' },
  repost: { Icon: FiRepeat, label: 'reposted your post', color: 'text-cyan-300', bg: 'bg-cyan-400/10' },
  default: { Icon: FiBell, label: '', color: 'text-white/55', bg: 'bg-white/[.06]' },
};

export default function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(() => loadNotifications());
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const refresh = () => setNotifications(loadNotifications());
    refresh();
    return onNotificationsUpdated(refresh);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filters = ['All', 'Mentions', 'Likes', 'Follows'];

  const openNotification = (notification) => {
    markAsRead(notification.id);
    const target = getFeedTarget(notification);
    if (target) navigate(`/feed?notificationId=${encodeURIComponent(target)}`);
  };

  const filtered = notifications.filter((notification) => {
    if (filter === 'All') return true;
    const type = getNotificationType(notification);
    return filter === 'Mentions' ? type === 'mention'
      : filter === 'Likes' ? type === 'like'
      : type === 'follow';
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl pb-28 sm:border-x sm:border-white/[.06]">
      <header className="sticky top-0 z-20 border-b border-white/[.07] bg-[#0b0b0d]/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex items-center justify-between">
          <div><h1 className="text-lg font-bold text-white">Notifications</h1><p className="text-[11px] text-white/35">{unreadCount ? `${unreadCount} unread` : 'You’re all caught up'}</p></div>
          {unreadCount > 0 && <button type="button" onClick={() => { markAllAsRead(); setNotifications(loadNotifications()); }} className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-bold text-white/65 hover:bg-white/[.06] hover:text-white"><FiCheck /> Mark all read</button>}
        </div>
        <div className="mt-3 flex overflow-x-auto" role="tablist">
          {filters.map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`relative shrink-0 px-4 py-2.5 text-sm font-semibold ${filter === item ? 'text-white' : 'text-white/35 hover:text-white/70'}`}><span>{item}</span>{filter === item && <span className="absolute inset-x-4 bottom-0 h-1 rounded-full bg-white" />}</button>)}
        </div>
      </header>

      {filtered.length ? (
        <div>
          {filtered.map((notification) => {
            const type = getNotificationType(notification);
            const meta = typeMeta[type];
            const Icon = meta.Icon;
            return (
              <button key={notification.id} type="button" onClick={() => openNotification(notification)} className={`flex w-full gap-3 border-b border-white/[.06] px-4 py-4 text-left transition hover:bg-white/[.025] ${notification.read ? '' : 'bg-white/[.025]'}`}>
                <div className="relative shrink-0">
                  <div className={`grid h-11 w-11 place-items-center rounded-full ${meta.bg} ${meta.color}`}><Icon className="h-5 w-5" /></div>
                  {!notification.read && <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-white ring-2 ring-[#0b0b0d]" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-6 text-white/75"><span className="font-bold text-white">{notification.title || 'Emet'}</span>{meta.label && <span> {meta.label}</span>}</p>
                  {notification.body && <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-white/40">{notification.body}</p>}
                  <p className="mt-1.5 text-xs text-white/30">{formatTimestamp(notification.receivedAt)}</p>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="px-6 py-24 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white/[.06] text-white/40"><FiBell /></div><h2 className="mt-4 text-base font-bold text-white">{filter === 'All' ? 'Nothing here yet' : `No ${filter.toLowerCase()} yet`}</h2><p className="mt-1 text-sm text-white/40">When people interact with you, you’ll see it here.</p></div>
      )}
    </main>
  );
}
