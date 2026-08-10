// Helpers for talking to the /api/sermons endpoints
// (Postgres/Supabase-backed).

import { Preferences } from '@capacitor/preferences';

const SERMONS_CACHE_KEY = 'offline_sermons';

async function handle(res) {
  let body = null;

  try {
    body = await res.json();
  } catch {
    // Response has no JSON body.
  }

  if (!res.ok) {
    throw new Error(
      body?.error || `Request failed (${res.status})`
    );
  }

  return body;
}

/**
 * Fetch sermons.
 *
 * Online:
 *   API → save latest sermons locally → return sermons
 *
 * Offline/API unavailable:
 *   Local cache → return previously saved sermons
 */
export async function fetchSermons() {
  try {
    const res = await fetch('/api/sermons');
    const body = await handle(res);

    const sermons = body.sermons || [];

    await Preferences.set({
      key: SERMONS_CACHE_KEY,
      value: JSON.stringify(sermons),
    });

    return sermons;
  } catch (error) {
    console.warn(
      'Unable to fetch sermons online. Trying offline cache.',
      error
    );

    try {
      const { value } = await Preferences.get({
        key: SERMONS_CACHE_KEY,
      });

      if (value) {
        return JSON.parse(value);
      }
    } catch (cacheError) {
      console.error(
        'Unable to read cached sermons:',
        cacheError
      );
    }

    return [];
  }
}

/**
 * Create a sermon.
 * Requires an internet connection.
 */
export async function createSermon(payload) {
  const res = await fetch('/api/sermons', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await handle(res);

  return body.sermon;
}

/**
 * Update a sermon.
 * Requires an internet connection.
 */
export async function updateSermon(id, payload) {
  const res = await fetch(`/api/sermons/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await handle(res);

  return body.sermon;
}

/**
 * Delete a sermon.
 * Requires an internet connection.
 */
export async function deleteSermon(id) {
  const res = await fetch(`/api/sermons/${id}`, {
    method: 'DELETE',
  });

  return handle(res);
}

/**
 * Set a sermon as featured.
 * Requires an internet connection.
 */
export async function setFeaturedSermon(id) {
  const res = await fetch(`/api/sermons/${id}/feature`, {
    method: 'PUT',
  });

  const body = await handle(res);

  return body.sermon;
}