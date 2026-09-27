import { getToken } from '../utils/authToken';
import { Capacitor, CapacitorHttp } from '@capacitor/core';

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
 *
 * Always bounded by a timeout (default 30s, overridable per-call) so a slow
 * or hung backend shows an error instead of leaving a "Sending..." button
 * stuck forever with no feedback. A caller-supplied `signal` is still
 * respected and composed with the timeout, not replaced by it.
 */
export async function apiFetch(path, options = {}) {
  const token = await getToken();
  const { authMode = 'member', timeoutMs = 30000, signal: callerSignal, ...fetchOptions } = options;
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

  const controller = new AbortController();
  const timeoutId = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
  if (callerSignal) {
    if (callerSignal.aborted) controller.abort();
    else callerSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  try {
    const requestUrl = apiUrl(path);
    const isNativeLogin = Capacitor.isNativePlatform()
      && new URL(requestUrl).pathname === '/api/auth/login';

    if (isNativeLogin) {
      // Android's bundled WebView and the Worker are different origins.
      // Use Capacitor's native HTTP transport for login so WebView CORS
      // preflight behavior cannot prevent the request from reaching Emet.
      const nativeResponse = await CapacitorHttp.request({
        url: requestUrl,
        method: fetchOptions.method || 'GET',
        headers,
        data: fetchOptions.body,
        connectTimeout: timeoutMs,
        readTimeout: timeoutMs,
        responseType: 'json',
      });
      const responseHeaders = new Headers(nativeResponse.headers || {});
      if (!responseHeaders.has('content-type')) {
        responseHeaders.set('content-type', 'application/json; charset=utf-8');
      }
      const responseBody = typeof nativeResponse.data === 'string'
        ? nativeResponse.data
        : JSON.stringify(nativeResponse.data ?? null);
      return new Response(responseBody, {
        status: nativeResponse.status,
        headers: responseHeaders,
      });
    }

    return await fetch(requestUrl, {
      ...fetchOptions,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError' && !callerSignal?.aborted) {
      const timeoutError = new Error('That took too long and timed out. Check your connection and try again.');
      timeoutError.isTimeout = true;
      timeoutError.cause = err;
      throw timeoutError;
    }
    const offlineError = new Error(
      'Unable to reach the Emet service. Check your connection or try again.'
    );
    offlineError.isOffline = true;
    offlineError.cause = err;
    throw offlineError;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
