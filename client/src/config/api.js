import { getToken } from '../utils/authToken';

/**
 * The app's static UI is bundled locally (see capacitor.config.ts — no
 * `server.url`), so it opens instantly with no internet connection.
 *
 * All API calls, however, must reach across to the live backend explicitly,
 * since there is no same-origin server to call a relative "/api/..." path
 * against once the UI is running from the local bundle.
 */
export const API_BASE_URL = 'https://blweastandcentralafrica.onrender.com';

export function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Drop-in replacement for fetch() that:
 *  - always targets the live backend, regardless of where the UI itself
 *    is currently loaded from (local bundle, dev server, or the live site)
 *  - attaches Authorization: Bearer <token> when a token is stored
 *    (see utils/authToken.js) — this is what keeps the user logged in
 *    across app restarts without relying on cross-origin cookies
 */
export async function apiFetch(path, options = {}) {
  const token = await getToken();

  const headers = {
    ...(options.headers || {}),
  };

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(apiUrl(path), {
    ...options,
    headers,
  });
}
