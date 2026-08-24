const STORAGE_KEY = 'blw-notifications';
const MAX_STORED = 100;
const UPDATED_EVENT = 'blw-notifications-updated';

const emitUpdate = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(UPDATED_EVENT));
};

export const onNotificationsUpdated = (callback) => {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(UPDATED_EVENT, callback);
  return () => window.removeEventListener(UPDATED_EVENT, callback);
};

export const loadNotifications = () => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.warn('Unable to load notifications from localStorage', error);
    return [];
  }
};

const saveNotifications = (entries) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_STORED)));
    emitUpdate();
  } catch (error) {
    console.warn('Unable to save notifications to localStorage', error);
  }
};

export const addNotification = ({ id, title, body, data } = {}) => {
  const existing = loadNotifications();
  if (id && existing.some((notification) => notification.id === id)) {
    return existing.find((notification) => notification.id === id);
  }

  const cleanTitle = typeof title === 'string' && title.trim() ? title.trim() : 'BLW Kenya Zone';
  const cleanBody = typeof body === 'string' && body.trim() ? body.trim() : 'You have a new ministry update.';
  const entry = {
    id: id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: cleanTitle,
    body: cleanBody,
    data: data || {},
    receivedAt: new Date().toISOString(),
    read: false,
  };

  saveNotifications([entry, ...existing]);
  return entry;
};

export const markAsRead = (id) => {
  const existing = loadNotifications();
  const next = existing.map((notification) => notification.id === id ? { ...notification, read: true } : notification);
  saveNotifications(next);
  return next;
};

export const markAllAsRead = () => {
  const existing = loadNotifications();
  const next = existing.map((notification) => notification.read ? notification : { ...notification, read: true });
  saveNotifications(next);
  return next;
};

export const getUnreadCount = () => loadNotifications().filter((notification) => !notification.read).length;
