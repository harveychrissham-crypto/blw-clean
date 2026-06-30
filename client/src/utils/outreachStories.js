// Helpers for talking to the /api/outreach-stories endpoints (Postgres/Supabase-backed).

async function handle(res) {
  let body = null;
  try { body = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body;
}

export async function fetchOutreachStories() {
  const res = await fetch('/api/outreach-stories');
  const body = await handle(res);
  return body.stories || [];
}

export async function createOutreachStory(payload) {
  const res = await fetch('/api/outreach-stories', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await handle(res);
  return body.story;
}

export async function updateOutreachStory(id, payload) {
  const res = await fetch(`/api/outreach-stories/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await handle(res);
  return body.story;
}

export async function deleteOutreachStory(id) {
  const res = await fetch(`/api/outreach-stories/${id}`, { method: 'DELETE' });
  return handle(res);
}
