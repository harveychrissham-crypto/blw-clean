import secureWorker from './secure-entry.js';
import { sendPushNotification } from './push-send.js';
import { corsHeaders } from './security.js';
import { handleAttendance } from './attendance-api.js';
import { handleAuth } from './auth-api.js';
import { handleEvents } from './event-api.js';

function normalizeResponse(request, env, response) {
  const headers = new Headers(response.headers);
  headers.delete('access-control-allow-origin');
  headers.delete('access-control-allow-credentials');
  headers.delete('access-control-allow-methods');
  headers.delete('access-control-allow-headers');
  headers.delete('vary');

  const normalizedCors = corsHeaders(request, env);
  for (const [key, value] of Object.entries(normalizedCors)) headers.set(key, value);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function applyRateLimit(request, env, bindingName, key, fallbackLimit) {
  const limiter = env[bindingName];
  if (limiter?.limit) {
    const { success } = await limiter.limit({ key });
    return success;
  }
  const now = Math.floor(Date.now() / 60000);
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const fallbackKey = `${bindingName}:${ip}:${now}`;
  if (!globalThis.__blwRateFallback) globalThis.__blwRateFallback = new Map();
  const current = globalThis.__blwRateFallback.get(fallbackKey) || 0;
  if (current >= fallbackLimit) return false;
  globalThis.__blwRateFallback.set(fallbackKey, current + 1);
  return true;
}

function rateLimitedResponse(request, env) {
  return normalizeResponse(request, env, new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
    status: 429,
    headers: { 'content-type': 'application/json; charset=utf-8', 'retry-after': '60' },
  }));
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/push/send' && (request.method === 'POST' || request.method === 'OPTIONS')) {
      return normalizeResponse(request, env, await sendPushNotification(request, env));
    }

    if (url.pathname.startsWith('/api/members')) {
      const response = await handleAttendance(request, env);
      if (response) return normalizeResponse(request, env, response);
    }

    if ((url.pathname === '/api/auth/login' || url.pathname === '/api/auth/register') && request.method === 'POST') {
      const isRegister = url.pathname.endsWith('/register');
      const allowed = await applyRateLimit(request, env, isRegister ? 'AUTH_REGISTER_LIMITER' : 'AUTH_LOGIN_LIMITER', `${isRegister ? 'register' : 'login'}:${request.headers.get('CF-Connecting-IP') || 'unknown'}`, isRegister ? 5 : 10);
      if (!allowed) return rateLimitedResponse(request, env);
    }

    if ((url.pathname === '/api/live/viewers' && (request.method === 'POST' || request.method === 'PATCH'))) {
      const allowed = await applyRateLimit(request, env, 'LIVE_VIEWER_LIMITER', `viewer:${request.headers.get('CF-Connecting-IP') || 'unknown'}`, 60);
      if (!allowed) return rateLimitedResponse(request, env);
    }

    if (url.pathname.startsWith('/api/auth')) {
      const response = await handleAuth(request, env, ctx);
      if (response) return normalizeResponse(request, env, response);
    }

    if (url.pathname.startsWith('/api/events')) {
      const response = await handleEvents(request, env);
      if (response) return normalizeResponse(request, env, response);
    }

    return normalizeResponse(request, env, await secureWorker.fetch(request, env, ctx));
  },

  async scheduled(controller, env, ctx) {
    if (typeof secureWorker.scheduled === 'function') {
      return secureWorker.scheduled(controller, env, ctx);
    }
  },
};
