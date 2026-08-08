// Helpers for talking to /api/live — the single admin-managed live stream
// setting shown on the public Live page.

const CLIENT_ID_KEY = 'blw_live_client_id';

// A random id generated once per browser and persisted in localStorage, so
// repeat visits from the same device are recognized as the same viewer
// instead of creating duplicate sign-ins. Not tied to any account — just
// enough to dedupe/track a single browser across visits.
export function getLiveClientId() {
  try {
    let id = window.localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = (crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      window.localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    // Private browsing / storage disabled — fall back to a per-session id
    // that at least dedupes heartbeats within this single page load.
    return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

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

// Mandatory "who's watching" sign-in from the popup on the public Live page.
// Always includes this browser's clientId so repeat visits update the same
// viewer row instead of creating a new one.
export async function submitLiveViewer(payload) {
  const res = await fetch('/api/live/viewers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, clientId: getLiveClientId() }),
  });
  const body = await handle(res);
  return body.viewer;
}

// Periodic "still watching" ping — adds `seconds` (a delta, not a running
// total) to this viewer's watch-time total. Fire-and-forget: a failed
// heartbeat just means that slice of time isn't counted, it never
// interrupts playback.
export async function sendLiveHeartbeat(seconds) {
  if (!seconds || seconds <= 0) return;
  try {
    await fetch('/api/live/viewers/heartbeat', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clientId: getLiveClientId(), seconds }),
    });
  } catch {
    // Ignore — next heartbeat (or the beacon on unload) will catch up.
  }
}

// Same as above but via sendBeacon, for the final flush on tab close/unload
// — a regular fetch can get cancelled mid-flight when the page unloads,
// sendBeacon is specifically designed to survive that.
export function sendLiveHeartbeatBeacon(seconds) {
  if (!seconds || seconds <= 0) return;
  try {
    const payload = JSON.stringify({ clientId: getLiveClientId(), seconds });
    navigator.sendBeacon?.(
      '/api/live/viewers/heartbeat',
      new Blob([payload], { type: 'application/json' })
    );
  } catch {
    // Best-effort only.
  }
}

// Leaders Forum: list of everyone who has signed in to watch live.
export async function fetchLiveViewers() {
  const res = await fetch('/api/live/viewers');
  const body = await handle(res);
  return body.viewers;
}
