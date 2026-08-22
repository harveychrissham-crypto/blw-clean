import { Preferences } from '@capacitor/preferences';
import { apiFetch } from '../config/api';
import { getOfflineCheckinQueue, removeOfflineCheckins, queueOfflineCheckin } from './offlineCheckin';

const MEMBERS_CACHE_KEY = 'blw_leader_members_cache_v1';

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
    headers: {
      ...(options.headers || {}),
    },
  });
}

async function saveMembersCache(members) {
  try {
    await Preferences.set({ key: MEMBERS_CACHE_KEY, value: JSON.stringify(members) });
  } catch {
    // Cache is an enhancement; the online API remains the source of truth.
  }
}

async function readMembersCache() {
  try {
    const { value } = await Preferences.get({ key: MEMBERS_CACHE_KEY });
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

export async function getCachedMembers() {
  return readMembersCache();
}

export async function fetchAllMembers() {
  const res = await leaderFetch('/api/members');
  const body = await handle(res);
  const members = body.members || [];
  await saveMembersCache(members);
  return members;
}

export async function searchMembers(q) {
  if (!navigator.onLine) {
    const raw = String(q || '').trim().toLowerCase();
    if (!raw) return [];
    const cached = await readMembersCache();
    const matches = cached.filter((member) => [
      member.membershipId,
      member.name,
      member.email,
      member.phone,
      member.chapter,
    ].some((value) => String(value || '').toLowerCase().includes(raw)));
    return matches.slice(0, 8);
  }

  const res = await leaderFetch(`/api/members/search?q=${encodeURIComponent(q)}`);
  if (res.status === 404) return [];
  const body = await handle(res);
  return body.members || [];
}

function localDateKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function checkInMember(membershipId, memberHint = null) {
  if (!navigator.onLine) {
    const now = new Date().toISOString();
    await queueOfflineCheckin({
      membershipId,
      name: memberHint?.name || '',
      dateKey: localDateKey(),
      checkedInAt: now,
    });
    return {
      ...(memberHint || {}),
      membershipId,
      checkedIn: true,
      checkedInAt: now,
      offlineQueued: true,
    };
  }

  const res = await leaderFetch(`/api/members/${encodeURIComponent(membershipId)}/checkin`, {
    method: 'POST',
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
