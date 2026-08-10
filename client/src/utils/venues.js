import { Preferences } from '@capacitor/preferences';

const VENUES_CACHE_KEY = 'offline_venues';

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

export async function fetchVenues() {
  try {
    const res = await fetch('/api/venues');
    const body = await handle(res);

    const venues = body.venues || [];

    await Preferences.set({
      key: VENUES_CACHE_KEY,
      value: JSON.stringify(venues),
    });

    return venues;
  } catch (error) {
    console.warn(
      'Unable to fetch venues online. Trying offline cache.',
      error
    );

    try {
      const { value } = await Preferences.get({
        key: VENUES_CACHE_KEY,
      });

      if (value) {
        return JSON.parse(value);
      }
    } catch (cacheError) {
      console.error(
        'Unable to read cached venues:',
        cacheError
      );
    }

    return [];
  }
}

export async function fetchVenueByChapter(chapter) {
  try {
    const res = await fetch(
      `/api/venues/${encodeURIComponent(chapter)}`
    );

    const body = await handle(res);

    const venue = body.venue || null;

    if (venue) {
      try {
        const { value } = await Preferences.get({
          key: VENUES_CACHE_KEY,
        });

        const cached = value ? JSON.parse(value) : [];

        const filtered = cached.filter(
          (item) => item.chapter !== chapter
        );

        filtered.push(venue);

        await Preferences.set({
          key: VENUES_CACHE_KEY,
          value: JSON.stringify(filtered),
        });
      } catch (cacheError) {
        console.warn(
          'Unable to update venue cache:',
          cacheError
        );
      }
    }

    return venue;
  } catch (error) {
    console.warn(
      'Unable to fetch venue online. Trying offline cache.',
      error
    );

    try {
      const { value } = await Preferences.get({
        key: VENUES_CACHE_KEY,
      });

      if (value) {
        const venues = JSON.parse(value);

        return (
          venues.find(
            (venue) => venue.chapter === chapter
          ) || null
        );
      }
    } catch (cacheError) {
      console.error(
        'Unable to read cached venues:',
        cacheError
      );
    }

    return null;
  }
}

export async function saveVenue(chapter, payload) {
  const res = await fetch(
    `/api/venues/${encodeURIComponent(chapter)}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  const body = await handle(res);

  return body.venue;
}

export async function deleteVenue(chapter) {
  const res = await fetch(
    `/api/venues/${encodeURIComponent(chapter)}`,
    {
      method: 'DELETE',
    }
  );

  return handle(res);
}