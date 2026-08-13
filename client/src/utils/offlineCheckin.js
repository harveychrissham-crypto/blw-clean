import { Preferences } from '@capacitor/preferences';

const QUEUE_KEY = 'blw_offline_checkins_v1';

async function readQueue() {
  try {
    const { value } = await Preferences.get({ key: QUEUE_KEY });
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
}

async function writeQueue(queue) {
  await Preferences.set({ key: QUEUE_KEY, value: JSON.stringify(queue) });
}

export async function queueOfflineCheckin(member) {
  const queue = await readQueue();
  const existing = queue.find((item) => item.membershipId === member.membershipId && item.dateKey === member.dateKey);
  if (!existing) {
    queue.push({
      membershipId: member.membershipId,
      name: member.name || '',
      dateKey: member.dateKey,
      checkedInAt: member.checkedInAt || new Date().toISOString(),
      queuedAt: new Date().toISOString(),
    });
    await writeQueue(queue);
  }
  return queue;
}

export async function getOfflineCheckinQueue() {
  return readQueue();
}

export async function removeOfflineCheckins(membershipIds, dateKey) {
  const ids = new Set(membershipIds);
  const queue = await readQueue();
  const remaining = queue.filter((item) => !(ids.has(item.membershipId) && (!dateKey || item.dateKey === dateKey)));
  await writeQueue(remaining);
}
