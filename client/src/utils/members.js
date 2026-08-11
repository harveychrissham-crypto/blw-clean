import { apiFetch } from '../config/api';
// Helpers for talking to the real /api/members endpoints (Postgres/Supabase-backed).
// Replaces the old hardcoded MOCK_MEMBERS array in LeadersForum.jsx.

async function handle(res) {
  let body = null;
  try { body = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body;
}

export async function fetchAllMembers() {
  const res = await apiFetch('/api/members');
  const body = await handle(res);
  return body.members || [];
}

export async function searchMembers(q) {
  const res = await apiFetch(`/api/members/search?q=${encodeURIComponent(q)}`);
  if (res.status === 404) return []; // no matches — not an error state
  const body = await handle(res);
  return body.members || [];
}

export async function checkInMember(membershipId) {
  const res = await apiFetch(`/api/members/${encodeURIComponent(membershipId)}/checkin`, {
    method: 'POST',
  });
  const body = await handle(res);
  return body.member;
}
