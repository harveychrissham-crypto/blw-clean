import app from './api-entry.js';
import jwt from 'jsonwebtoken';

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

function getJwtSecret(env) {
  const secret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';
  if (!secret) throw new Error('JWT_SECRET is not configured.');
  return secret;
}

function getBearerToken(request) {
  const header = request.headers.get('Authorization') || request.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

async function adminStatus(request, env) {
  const token = getBearerToken(request);
  if (!token) return { authenticated: false, isAdmin: false };
  try {
    const payload = jwt.verify(token, getJwtSecret(env));
    const email = typeof payload?.user?.email === 'string' ? payload.user.email.trim().toLowerCase() : '';
    if (!email) return { authenticated: false, isAdmin: false };
    const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || '';
    if (!connectionString) return { authenticated: true, isAdmin: false };
    const { Client } = await import('pg');
    const client = new Client({ connectionString });
    await client.connect();
    try {
      const result = await client.query('SELECT is_admin FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1', [email]);
      return { authenticated: true, isAdmin: result.rows[0]?.is_admin === true };
    } finally {
      await client.end().catch(() => {});
    }
  } catch {
    return { authenticated: false, isAdmin: false };
  }
}

function needsLeader(request, url) {
  const { pathname } = url;
  if (pathname === '/api/auth/admin-status') return false;
  if (pathname === '/api/members/search' || pathname === '/api/members/self-checkin') return false;
  if (pathname.startsWith('/api/members')) return true;
  if (pathname.startsWith('/api/fellowships/admin')) return true;
  if (pathname.startsWith('/api/events') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return true;
  if (pathname.startsWith('/api/outreach-stories') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return true;
  if (pathname.startsWith('/api/sermons') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return true;
  if (pathname.startsWith('/api/venues') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return true;
  if (pathname === '/api/live' && request.method !== 'GET' && request.method !== 'OPTIONS') return true;
  if (pathname === '/api/live/viewers' && request.method === 'GET') return true;
  if (pathname.startsWith('/api/uploads') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return true;
  if (pathname === '/api/push/send' && request.method === 'POST') return true;
  return false;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin') || url.origin;
    if (request.method === 'OPTIONS' || !url.pathname.startsWith('/api/')) return app.fetch(request, env, ctx);
    if (url.pathname === '/api/auth/admin-status' && request.method === 'GET') return json(await adminStatus(request, env), 200, origin);
    if (needsLeader(request, url) && !(await adminStatus(request, env)).isAdmin) return json({ error: 'Administrator authorization is required.' }, 403, origin);
    return app.fetch(request, env, ctx);
  },
  async scheduled(controller, env, ctx) {
    if (typeof app.scheduled === 'function') return app.scheduled(controller, env, ctx);
  },
};
