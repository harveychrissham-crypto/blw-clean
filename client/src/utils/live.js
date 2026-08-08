// Helpers for talking to /api/live — the single admin-managed live stream
// setting shown on the public Live page.

async function handle(res) {
  let body = null;
  try { body = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body;
}

export async function fetchLiveStream() {
  const res = await fetch('/api/live');
  const body = await handle(res);
  return body.live;
}

export async function updateLiveStream(payload) {
  const res = await fetch('/api/live', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await handle(res);
  return body.live;
}
