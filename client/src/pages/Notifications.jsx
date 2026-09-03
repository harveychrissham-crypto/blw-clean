import { useEffect, useState } from 'react';
import { FiBell, FiCheck } from 'react-icons/fi';
import { loadNotifications, markAsRead, markAllAsRead, onNotificationsUpdated } from '../utils/notificationStorage';

const formatTimestamp = (iso) => {
  try {
    const date = new Date(iso);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
};

export default function Notifications() {
  const [notifications, setNotifications] = useState(() => loadNotifications());

  useEffect(() => {
    const refresh = () => setNotifications(loadNotifications());
    refresh();
    return onNotificationsUpdated(refresh);
  }, []);

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return (
    <section className="mx-auto max-w-2xl px-5 py-12">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.08] text-gold-500"><FiBell className="h-7 w-7" /></div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/40">Inbox</p>
            <h1 className="text-3xl font-extrabold text-white">Notifications</h1>
            {unreadCount > 0 && <p className="mt-1 text-sm text-white/50">{unreadCount} unread</p>}
          </div>
        </div>
        {unreadCount > 0 && <button type="button" onClick={markAllAsRead} className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-xs font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"><FiCheck className="h-3.5 w-3.5" /> Mark all as read</button>}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-10 text-center"><FiBell className="mx-auto h-8 w-8 text-white/25" /><p className="mt-4 text-sm text-white/45">Nothing here yet. Ministry updates and announcements will show up as they arrive.</p></div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <button key={notification.id} type="button" onClick={() => markAsRead(notification.id)} className={`w-full rounded-2xl border p-4 text-left transition ${notification.read ? 'border-white/8 bg-white/[0.03]' : 'border-gold-500/25 bg-gold-500/8'}`}>
              <div className="flex items-start gap-3">
                <img src="/logo.png" alt="BLW Campus Ministry" className={`h-11 w-11 shrink-0 rounded-2xl object-cover transition ${notification.read ? 'opacity-45 grayscale' : 'opacity-100'}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`truncate text-sm ${notification.read ? 'font-medium text-white/80' : 'font-bold text-white'}`}>{notification.title}</h3>
                    {!notification.read && <span className="h-2 w-2 shrink-0 rounded-full bg-gold-500" aria-hidden="true" />}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-white/55">{notification.body}</p>
                  <p className="mt-2 text-xs text-white/30">{formatTimestamp(notification.receivedAt)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
