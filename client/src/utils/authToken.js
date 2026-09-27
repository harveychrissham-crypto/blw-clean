import { Preferences } from '@capacitor/preferences';

const TOKEN_KEY = 'emet_auth_token';
const LEGACY_TOKEN_KEY = 'blw_auth_token';

// In-memory cache so apiFetch() doesn't hit native storage on every call.
// Kept in sync with Preferences by setToken()/clearToken() below.
let cachedToken;

export async function getToken() {
  if (cachedToken !== undefined) return cachedToken;

  try {
    let { value } = await Preferences.get({ key: TOKEN_KEY });
    if (!value) { const legacy = await Preferences.get({ key: LEGACY_TOKEN_KEY }); value = legacy.value || null; if (value) { await Preferences.set({ key: TOKEN_KEY, value }); await Preferences.remove({ key: LEGACY_TOKEN_KEY }); } }
    cachedToken = value || null;
  } catch {
    cachedToken = null;
  }

  return cachedToken;
}

export async function setToken(token) {
  cachedToken = token || null;

  try {
    if (token) {
      await Preferences.set({ key: TOKEN_KEY, value: token });
    } else {
      await Preferences.remove({ key: TOKEN_KEY });
    }
  } catch (error) {
    console.warn('Unable to persist auth token:', error);
  }
}

export async function clearToken() {
  await setToken(null);
}
