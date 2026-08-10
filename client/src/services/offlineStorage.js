import { Preferences } from '@capacitor/preferences';

export async function saveOfflineData(key, data) {
  try {
    await Preferences.set({
      key,
      value: JSON.stringify(data),
    });

    return true;
  } catch (error) {
    console.error(`Failed to save offline data: ${key}`, error);
    return false;
  }
}

export async function getOfflineData(key, fallback = null) {
  try {
    const { value } = await Preferences.get({ key });

    if (!value) {
      return fallback;
    }

    return JSON.parse(value);
  } catch (error) {
    console.error(`Failed to read offline data: ${key}`, error);
    return fallback;
  }
}

export async function removeOfflineData(key) {
  try {
    await Preferences.remove({ key });
  } catch (error) {
    console.error(`Failed to remove offline data: ${key}`, error);
  }
}