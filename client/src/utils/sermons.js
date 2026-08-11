import { Preferences } from '@capacitor/preferences';
import { apiFetch } from '../config/api';

const SERMONS_CACHE_KEY = 'offline_sermons';

async function handle(res) {
  let body = null;

  try {
    body = await res.json();
  } catch {
    // No JSON response.
  }

  if (!res.ok) {
    throw new Error(
      body?.error || `Request failed (${res.status})`
    );
  }

  return body;
}

/**
 * Fetch sermons from the API.
 *
 * The API currently returns:
 *
 * {
 *   sermons: [...]
 * }
 *
 * The latest successful response is cached locally
 * so sermons can still be displayed offline.
 */
export async function fetchSermons() {
  try {
    const res = await apiFetch('/api/sermons', {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/json',
      },
    });

    const body = await handle(res);

    const sermons = Array.isArray(body?.sermons)
      ? body.sermons
      : [];

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
        const cached = JSON.parse(value);

        if (Array.isArray(cached)) {
          return cached;
        }
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
 */
export async function createSermon(payload) {
  const res = await apiFetch('/api/sermons', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await handle(res);

  return body.sermon;
}

/**
 * Update a sermon.
 */
export async function updateSermon(id, payload) {
  const res = await apiFetch(`/api/sermons/${id}`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await handle(res);

  return body.sermon;
}

/**
 * Delete a sermon.
 */
export async function deleteSermon(id) {
  const res = await apiFetch(`/api/sermons/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  return handle(res);
}

/**
 * Set a sermon as featured.
 */
export async function setFeaturedSermon(id) {
  const res = await apiFetch(`/api/sermons/${id}/feature`, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
    },
  });

  const body = await handle(res);

  return body.sermon;
}