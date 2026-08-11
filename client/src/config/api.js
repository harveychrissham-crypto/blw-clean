import { getToken } from '../utils/authToken';

/**
 * The mobile app is bundled locally, so relative /api/... URLs do not reach
 * the Cloudflare Worker. Keep the live Worker URL as the production fallback.
 * VITE_API_BASE_URL can still override it for development or another backend.
 */
export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  'https://blw-kenya-zone.harveychrissham.workers.dev'
).replace(/\/$/, '');

export function apiUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

/**
 * Drop-in replacement for fetch().
 * Adds the stored Bearer token when available so API requests work from the
 * local Capacitor bundle as well as the deployed website.
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
