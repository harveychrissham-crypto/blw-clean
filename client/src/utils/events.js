import { Preferences } from '@capacitor/preferences';

const EVENTS_CACHE_KEY = 'offline_events';

async function handle(res) {
  let body = null;

  try {
    body = await res.json();
  } catch {
    // No JSON response body.
  }

  if (!res.ok) {
    throw new Error(
      body?.error || `Request failed (${res.status})`
    );
  }

  return body;
}

export async function fetchEvents() {
  try {
    const res = await fetch('/api/events');
    const body = await handle(res);

    const events = body.events || [];

    // Save the latest successful events response.
    await Preferences.set({
      key: EVENTS_CACHE_KEY,
      value: JSON.stringify(events),
    });

    return events;
  } catch (error) {
    console.warn(
      'Unable to fetch events online. Trying offline cache.',
      error
    );

    try {
      const { value } = await Preferences.get({
        key: EVENTS_CACHE_KEY,
      });

      if (value) {
        return JSON.parse(value);
      }
    } catch (cacheError) {
      console.error(
        'Unable to read cached events:',
        cacheError
      );
    }

    return [];
  }
}

export async function createEvent(payload) {
  const res = await fetch('/api/events', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await handle(res);

  return body.event;
}

export async function updateEvent(id, payload) {
  const res = await fetch(`/api/events/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await handle(res);

  return body.event;
}

export async function deleteEvent(id) {
  const res = await fetch(`/api/events/${id}`, {
    method: 'DELETE',
  });

  return handle(res);
}