import { apiFetch } from '../config/api';

const LEADER_TOKEN_KEY = 'blw_leader_admin_token';

async function handle(res) {
  let body = null;
  try { body = await res.json(); } catch { /* no body */ }
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body;
}

async function leaderToken() {
  const existing = sessionStorage.getItem(LEADER_TOKEN_KEY);
  if (existing) return existing;

  const response = await apiFetch('/api/fellowships/admin/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessCode: '1120363' }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(body.error || 'Leadership authorization is required.');
  sessionStorage.setItem(LEADER_TOKEN_KEY, body.token);
  return body.token;
}

async function leaderFetch(path, options = {}) {
  const token = await leaderToken();
  return apiFetch(path, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  });
}

export async function fetchAllMembers() {
  const res = await leaderFetch('/api/members');
  const body = await handle(res);
  return body.members || [];
}

export async function searchMembers(q) {
  const res = await leaderFetch(`/api/members/search?q=${encodeURIComponent(q)}`);
  if (res.status === 404) return [];
  const body = await handle(res);
  return body.members || [];
}

export async function checkInMember(membershipId) {
  const res = await leaderFetch(`/api/members/${encodeURIComponent(membershipId)}/checkin`, {
    method: 'POST',
  });
  const body = await handle(res);
  return body.member;
}
