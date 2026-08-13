import app from './api-entry.js';
import jwt from 'jsonwebtoken';

const DEFAULT_LEADER_ACCESS_CODE = '1120363';

const json = (body, status = 200, origin = '') => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization',
    vary: 'Origin',
  },
});

const authSecret = (env) => {
  const configured = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';
  const code = typeof env.FELLOWSHIP_ADMIN_ACCESS_CODE === 'string' && env.FELLOWSHIP_ADMIN_ACCESS_CODE.trim()
    ? env.FELLOWSHIP_ADMIN_ACCESS_CODE.trim()
    : DEFAULT_LEADER_ACCESS_CODE;
  return configured || `blw-leader-auth:${code}`;
};

function isLeader(request, env) {
  try {
    const header = request.headers.get('Authorization') || request.headers.get('authorization') || '';
    if (!header.startsWith('Bearer ')) return false;
    const token = header.slice(7).trim();
    if (!token) return false;
    return jwt.verify(token, authSecret(env))?.leaderAdmin === true;
  } catch {
    return false;
  }
}

function needsLeader(request, url) {
  const { pathname } = url;
  if (pathname === '/api/members/search') return false;
  if (pathname === '/api/members/self-checkin') return false;
  if (pathname.startsWith('/api/members')) return true;
  if (pathname.startsWith('/api/fellowships/admin')) return false; // fellowship-api already authenticates itself
  if (pathname.startsWith('/api/events') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return true;
  if (pathname.startsWith('/api/outreach-stories') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return true;
  if (pathname.startsWith('/api/sermons') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return true;
  if (pathname.startsWith('/api/venues') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return true;
  if (pathname === '/api/live' && request.method !== 'GET' && request.method !== 'OPTIONS') return true;
  if (pathname === '/api/live/viewers' && request.method === 'GET') return true;
  if (pathname.startsWith('/api/uploads') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return true;
  return false;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS' || !url.pathname.startsWith('/api/')) {
      return app.fetch(request, env, ctx);
    }
    if (needsLeader(request, url) && !isLeader(request, env)) {
      return json({ error: 'Leadership authorization is required.' }, 403, request.headers.get('Origin') || url.origin);
    }
    return app.fetch(request, env, ctx);
  },
  async scheduled(controller, env, ctx) {
    if (typeof app.scheduled === 'function') return app.scheduled(controller, env, ctx);
  },
};
