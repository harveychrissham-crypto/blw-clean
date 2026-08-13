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
 * Drop-in replacement for fetch(). Adds the normal member token and, while a
 * leader session is open, the short-lived leader-admin token used by the
 * management tools. This keeps manager requests authenticated without adding
 * another login prompt to every individual tool.
 */
export async function apiFetch(path, options = {}) {
  const token = await getToken();
  let leaderToken = '';
  try {
    leaderToken = sessionStorage.getItem('blw_leader_admin_token') || '';
  } catch {
    leaderToken = '';
  }

  const headers = {
    ...(options.headers || {}),
  };

  if (!headers.Authorization) {
    headers.Authorization = leaderToken ? `Bearer ${leaderToken}` : (token ? `Bearer ${token}` : '');
  }
  if (!headers.Authorization) delete headers.Authorization;

  return fetch(apiUrl(path), {
    ...options,
    headers,
  });
}
