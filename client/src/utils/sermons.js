// Helpers for talking to the /api/sermons endpoints (Postgres/Supabase-backed).

async function handle(res) {
  let body = null;
  try { body = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body;
}

export async function fetchSermons() {
  const res = await fetch('/api/sermons');
  const body = await handle(res);
  return body.sermons || [];
}

export async function createSermon(payload) {
  const res = await fetch('/api/sermons', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await handle(res);
  return body.sermon;
}

export async function updateSermon(id, payload) {
  const res = await fetch(`/api/sermons/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await handle(res);
  return body.sermon;
}

export async function deleteSermon(id) {
  const res = await fetch(`/api/sermons/${id}`, { method: 'DELETE' });
  return handle(res);
}

export async function setFeaturedSermon(id) {
  const res = await fetch(`/api/sermons/${id}/feature`, { method: 'PUT' });
  const body = await handle(res);
  return body.sermon;
}
