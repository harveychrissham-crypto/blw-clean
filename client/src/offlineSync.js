import { fetchEvents } from './utils/events';
import { fetchSermons } from './utils/sermons';
import { fetchOutreachStories } from './utils/outreachStories';
import { fetchVenues } from './utils/venues';

let syncing = false;

export async function syncOfflineContent() {
  if (syncing) return;

  if (!navigator.onLine) {
    console.log('Offline - skipping content sync.');
    return;
  }

  syncing = true;

  try {
    console.log('Starting offline content sync...');

    await Promise.allSettled([
      fetchEvents(),
      fetchSermons(),
      fetchOutreachStories(),
      fetchVenues(),
    ]);

    console.log('Offline content sync complete.');
  } catch (error) {
    console.warn('Offline content sync failed:', error);
  } finally {
    syncing = false;
  }
}