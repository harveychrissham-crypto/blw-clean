import { apiFetch } from '../config/api';
import { Preferences } from '@capacitor/preferences';

const OUTREACH_CACHE_KEY = 'offline_outreach_stories';

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

export async function fetchOutreachStories() {
  try {
    const res = await apiFetch('/api/outreach-stories');
    const body = await handle(res);

    const stories = body.stories || [];

    await Preferences.set({
      key: OUTREACH_CACHE_KEY,
      value: JSON.stringify(stories),
    });

    return stories;
  } catch (error) {
    console.warn(
      'Unable to fetch outreach stories online. Trying offline cache.',
      error
    );

    try {
      const { value } = await Preferences.get({
        key: OUTREACH_CACHE_KEY,
      });

      if (value) {
        return JSON.parse(value);
      }
    } catch (cacheError) {
      console.error(
        'Unable to read cached outreach stories:',
        cacheError
      );
    }

    return [];
  }
}

export async function createOutreachStory(payload) {
  const res = await apiFetch('/api/outreach-stories', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await handle(res);

  return body.story;
}

export async function updateOutreachStory(id, payload) {
  const res = await apiFetch(`/api/outreach-stories/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const body = await handle(res);

  return body.story;
}

export async function deleteOutreachStory(id) {
  const res = await apiFetch(`/api/outreach-stories/${id}`, {
    method: 'DELETE',
  });

  return handle(res);
}