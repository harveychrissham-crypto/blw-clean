// Helpers for talking to the /api/venues endpoints (Postgres/Supabase-backed).
// Each chapter has one admin-managed service venue/time, shown on the
// member dashboard's Sunday self check-in card.

async function handle(res) {
  let body = null;
  try { body = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body;
}

export async function fetchVenues() {
  const res = await fetch('/api/venues');
  const body = await handle(res);
  return body.venues || [];
}

export async function fetchVenueByChapter(chapter) {
  const res = await fetch(`/api/venues/${encodeURIComponent(chapter)}`);
  if (res.status === 404) return null; // no venue set for this chapter yet
  const body = await handle(res);
  return body.venue || null;
}

export async function saveVenue(chapter, { venue, serviceTime }) {
  const res = await fetch(`/api/venues/${encodeURIComponent(chapter)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ venue, serviceTime }),
  });
  const body = await handle(res);
  return body.venue;
}

export async function deleteVenue(chapter) {
  const res = await fetch(`/api/venues/${encodeURIComponent(chapter)}`, { method: 'DELETE' });
  return handle(res);
}
