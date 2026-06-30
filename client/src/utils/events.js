// Helpers for talking to the real /api/events endpoints (Postgres/Supabase-backed).

async function handle(res) {
  let body = null;
  try { body = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body;
}

export async function fetchEvents() {
  const res = await fetch('/api/events');
  const body = await handle(res);
  return body.events || [];
}

export async function createEvent(payload) {
  const res = await fetch('/api/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await handle(res);
  return body.event;
}

export async function updateEvent(id, payload) {
  const res = await fetch(`/api/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await handle(res);
  return body.event;
}

export async function deleteEvent(id) {
  const res = await fetch(`/api/events/${id}`, { method: 'DELETE' });
  return handle(res);
}
