import { Preferences } from '@capacitor/preferences';
import { apiFetch } from '../config/api';
import { getOfflineCheckinQueue, removeOfflineCheckins, queueOfflineCheckin } from './offlineCheckin';

const MEMBERS_CACHE_KEY = 'blw_leader_members_cache_v1';
const SELECTED_ATTENDANCE_EVENT_KEY = 'blw_selected_attendance_event_id';

async function handle(res) {
  let body = null;
  try { body = await res.json(); } catch { /* no body */ }
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
}

async function leaderFetch(path, options = {}) {
  return apiFetch(path, {
    ...options,
    credentials: 'include',
    headers: { ...(options.headers || {}) },
  });
}

const getSelectedAttendanceEventId = () => {
  try {
    return sessionStorage.getItem(SELECTED_ATTENDANCE_EVENT_KEY) || null;
  } catch {
    return null;
  }
};

const setSelectedAttendanceEventId = (eventId) => {
  try {
    if (eventId == null || eventId === '') sessionStorage.removeItem(SELECTED_ATTENDANCE_EVENT_KEY);
    else sessionStorage.setItem(SELECTED_ATTENDANCE_EVENT_KEY, String(eventId));
  } catch {
    // Session storage is optional; the explicit event argument remains authoritative.
  }
};

const resolveEventId = (eventId = null) => eventId ?? getSelectedAttendanceEventId();

const withEvent = (path, eventId) => {
  if (eventId == null || eventId === '') return path;
  return `${path}${path.includes('?') ? '&' : '?'}eventId=${encodeURIComponent(eventId)}`;
};

async function saveMembersCache(members, eventId = null) {
  try {
    await Preferences.set({ key: `${MEMBERS_CACHE_KEY}_${eventId ?? 'default'}`, value: JSON.stringify(members) });
  } catch { /* Cache is an enhancement; the online API remains the source of truth. */ }
}

async function readMembersCache(eventId = null) {
  try {
    const { value } = await Preferences.get({ key: `${MEMBERS_CACHE_KEY}_${eventId ?? 'default'}` });
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

export async function getCachedMembers(eventId = null) {
  return readMembersCache(resolveEventId(eventId));
}

export async function fetchAllMembers(eventId = null) {
  const selectedEventId = resolveEventId(eventId);
  setSelectedAttendanceEventId(selectedEventId);
  if (!selectedEventId) return [];
  const res = await leaderFetch(withEvent('/api/members', selectedEventId));
  const body = await handle(res);
  const members = body.members || [];
  await saveMembersCache(members, selectedEventId);
  return members;
}

export async function searchMembers(q, eventId = null) {
  const selectedEventId = resolveEventId(eventId);
  if (!navigator.onLine) {
    const raw = String(q || '').trim().toLowerCase();
    if (!raw) return [];
    const cached = await readMembersCache(selectedEventId);
    return cached.filter((member) => [member.membershipId, member.name, member.email, member.phone, member.chapter]
      .some((value) => String(value || '').toLowerCase().includes(raw))).slice(0, 8);
  }

  const res = await leaderFetch(withEvent(`/api/members/search?q=${encodeURIComponent(q)}`, selectedEventId));
  if (res.status === 404) return [];
  const body = await handle(res);
  return body.members || [];
}

function localDateKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export async function checkInMember(membershipId, memberHint = null, eventId = null) {
  const selectedEventId = resolveEventId(eventId ?? memberHint?.eventId ?? null);
  if (!selectedEventId) throw new Error('Select an event before checking members in.');

  if (!navigator.onLine) {
    const now = new Date().toISOString();
    await queueOfflineCheckin({
      membershipId,
      name: memberHint?.name || '',
      eventId: selectedEventId,
      dateKey: localDateKey(),
      checkedInAt: now,
    });
    return { ...(memberHint || {}), membershipId, eventId: selectedEventId, checkedIn: true, checkedInAt: now, offlineQueued: true };
  }

  const res = await leaderFetch(`/api/members/${encodeURIComponent(membershipId)}/checkin`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ eventId: selectedEventId }),
  });
  const body = await handle(res);
  return body.member;
}

export async function syncOfflineCheckins() {
  if (!navigator.onLine) return { synced: 0, remaining: (await getOfflineCheckinQueue()).length };
  const queue = await getOfflineCheckinQueue();
  if (!queue.length) return { synced: 0, remaining: 0 };

  const syncedIds = [];
  for (const item of queue) {
    try {
      await leaderFetch(`/api/members/${encodeURIComponent(item.membershipId)}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: item.eventId ?? null }),
      });
      syncedIds.push(item.membershipId);
    } catch (error) {
      console.warn('[checkin] offline sync item failed:', item.membershipId, error?.message || error);
    }
  }

  await removeOfflineCheckins(syncedIds);
  const remaining = await getOfflineCheckinQueue();
  return { synced: syncedIds.length, remaining: remaining.length };
}
