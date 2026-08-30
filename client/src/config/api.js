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
 * Drop-in replacement for fetch(). Member authentication is the default.
 * A stored leader-admin token is used only when a caller explicitly opts in
 * with `authMode: 'leader'`.
 */
export async function apiFetch(path, options = {}) {
  const token = await getToken();
  const { authMode = 'member', ...fetchOptions } = options;
  let leaderToken = '';

  if (authMode === 'leader') {
    try {
      leaderToken = sessionStorage.getItem('blw_leader_admin_token') || '';
    } catch {
      leaderToken = '';
    }
  }

  const headers = {
    ...(fetchOptions.headers || {}),
  };

  if (!headers.Authorization) {
    const selectedToken = authMode === 'leader' ? leaderToken : token;
    if (selectedToken) headers.Authorization = `Bearer ${selectedToken}`;
  }

  // JSON requests need an explicit content type. Without it, the Worker may
  // receive a body that cannot be parsed consistently by the video handlers.
  if (fetchOptions.body && typeof fetchOptions.body === 'string' && !headers['Content-Type'] && !headers['content-type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (!headers.Authorization) delete headers.Authorization;

  try {
    return await fetch(apiUrl(path), {
      ...fetchOptions,
      headers,
    });
  } catch (err) {
    const offlineError = new Error(
      'Unable to reach the BLW video service. Check your connection or try again.'
    );
    offlineError.isOffline = true;
    offlineError.cause = err;
    throw offlineError;
  }
}
