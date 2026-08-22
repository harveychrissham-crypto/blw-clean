import app from './api-entry.js';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { corsHeaders, rateLimit } from './security.js';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
});

function getJwtSecret(env) {
  const secret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';
  if (!secret) throw new Error('JWT_SECRET is not configured.');
  return secret;
}

function getBearerToken(request) {
  const header = request.headers.get('Authorization') || request.headers.get('authorization') || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  const cookie = request.headers.get('Cookie') || request.headers.get('cookie') || '';
  const match = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('blw_auth_token='));
  return match ? decodeURIComponent(match.slice('blw_auth_token='.length)) : '';
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
    } finally { await client.end().catch(() => {}); }
  } catch { return { authenticated: false, isAdmin: false }; }
}

async function registerPushToken(request, env, headers) {
  const bearer = getBearerToken(request);
  if (!bearer) return json({ error: 'Authorization token missing.' }, 401, headers);
  let payload;
  try { payload = jwt.verify(bearer, getJwtSecret(env)); } catch { return json({ error: 'Invalid authentication token.' }, 401, headers); }
  const email = typeof payload?.user?.email === 'string' ? payload.user.email.trim().toLowerCase() : '';
  if (!email) return json({ error: 'Invalid authentication token.' }, 401, headers);
  const body = await request.clone().json().catch(() => null);
  const deviceToken = typeof body?.token === 'string' ? body.token.trim() : '';
  const platformValue = typeof body?.platform === 'string' ? body.platform.trim().toLowerCase() : 'android';
  const platform = ['ios', 'android', 'web'].includes(platformValue) ? platformValue : 'android';
  if (!deviceToken) return json({ error: 'A device token is required.' }, 400, headers);
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || '';
  if (!connectionString) return json({ error: 'Database connection is not configured.' }, 503, headers);
  try {
    const { Client } = await import('pg'); const client = new Client({ connectionString }); await client.connect();
    try {
      await client.query(`CREATE TABLE IF NOT EXISTS push_tokens (id SERIAL PRIMARY KEY,user_email TEXT NOT NULL,token TEXT NOT NULL UNIQUE,platform TEXT NOT NULL DEFAULT 'android',created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW())`);
      await client.query(`INSERT INTO push_tokens (user_email, token, platform, updated_at) VALUES ($1, $2, $3, NOW()) ON CONFLICT (token) DO UPDATE SET user_email = EXCLUDED.user_email, platform = EXCLUDED.platform, updated_at = NOW()`, [email, deviceToken, platform]);
    } finally { await client.end().catch(() => {}); }
    return json({ status: 'ok' }, 200, headers);
  } catch (error) { console.error('[worker] direct push token registration failed', { message: error?.message, code: error?.code }); return json({ error: 'Unable to register for push notifications right now.' }, 503, headers); }
}

function base64url(value) { return Buffer.from(value).toString('base64url'); }
function firebaseConfig(env) {
  const projectId = typeof env.FIREBASE_PROJECT_ID === 'string' && env.FIREBASE_PROJECT_ID.trim() ? env.FIREBASE_PROJECT_ID.trim() : 'blw-campus-ministry-kenya-zone';
  const clientEmail = typeof env.FIREBASE_CLIENT_EMAIL === 'string' && env.FIREBASE_CLIENT_EMAIL.trim() ? env.FIREBASE_CLIENT_EMAIL.trim() : 'firebase-adminsdk-fbsvc@blw-campus-ministry-kenya-zone.iam.gserviceaccount.com';
  const privateKey = typeof env.FIREBASE_PRIVATE_KEY === 'string' ? env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n').trim() : '';
  if (!privateKey) throw new Error('Firebase service-account configuration is incomplete. Missing: FIREBASE_PRIVATE_KEY');
  return { projectId, clientEmail, privateKey };
}
async function getFirebaseAccessToken(env) {
  const { clientEmail, privateKey } = firebaseConfig(env); const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claimSet = base64url(JSON.stringify({ iss: clientEmail, scope: 'https://www.googleapis.com/auth/firebase.messaging', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const unsignedToken = `${header}.${claimSet}`; const signer = crypto.createSign('RSA-SHA256'); signer.update(unsignedToken); signer.end();
  const assertion = `${unsignedToken}.${signer.sign(privateKey, 'base64url')}`;
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }) });
  const body = await response.json().catch(() => ({})); if (!response.ok || !body.access_token) throw new Error(body.error_description || body.error || 'Unable to obtain Firebase access token.'); return body.access_token;
}
async function sendSelfPushTest(request, env, headers) {
  const bearer = getBearerToken(request); if (!bearer) return json({ error: 'Authorization token missing.' }, 401, headers);
  let payload; try { payload = jwt.verify(bearer, getJwtSecret(env)); } catch { return json({ error: 'Invalid authentication token.' }, 401, headers); }
  const email = typeof payload?.user?.email === 'string' ? payload.user.email.trim().toLowerCase() : ''; if (!email) return json({ error: 'Invalid authentication token.' }, 401, headers);
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || ''; if (!connectionString) return json({ error: 'Database connection is not configured.' }, 503, headers);
  try {
    const { Client } = await import('pg'); const client = new Client({ connectionString }); await client.connect(); let tokens;
    try { const result = await client.query("SELECT token FROM push_tokens WHERE LOWER(user_email) = $1 AND token IS NOT NULL AND token <> ''", [email]); tokens = [...new Set(result.rows.map((row) => typeof row.token === 'string' ? row.token.trim() : '').filter(Boolean))]; } finally { await client.end().catch(() => {}); }
    if (!tokens.length) return json({ status: 'no_token', message: 'No FCM token is registered for this account yet.' }, 404, headers);
    const { projectId } = firebaseConfig(env); const accessToken = await getFirebaseAccessToken(env); let sent = 0; let failed = 0; const failures = [];
    for (const token of tokens) {
      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/messages:send`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ message: { token, notification: { title: 'BLW Kenya Zone', body: 'You have a new ministry update.' }, data: { type: 'notification', source: 'blw_notification_service' }, android: { priority: 'HIGH', notification: { channel_id: 'blw_default', sound: 'default' } } } }) });
      const body = await response.json().catch(() => ({})); if (response.ok) sent += 1; else { failed += 1; failures.push({ status: response.status, error: body?.error?.status || body?.error?.message || 'FCM send failed' }); }
    }
    if (sent > 0) return json({ status: 'ok', sent, failed, totalTokens: tokens.length }, 200, headers);
    return json({ status: 'failed', sent, failed, totalTokens: tokens.length, failures }, 503, headers);
  } catch (error) { console.error('[worker] direct FCM self-test failed', { message: error?.message, code: error?.code }); return json({ error: error?.message || 'Unable to send the notification.' }, 503, headers); }
}

function needsLeader(request, url) {
  const { pathname } = url;
  if (pathname === '/api/auth/admin-status') return false;
  if (pathname === '/api/members/self-checkin') return false;
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
    const headers = corsHeaders(request, env);
    if (!url.pathname.startsWith('/api/')) return app.fetch(request, env, ctx);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (url.pathname === '/api/auth/admin-status' && request.method === 'GET') return json(await adminStatus(request, env), 200, headers);
    if (url.pathname === '/api/push/register' && request.method === 'POST') return registerPushToken(request, env, headers);
    if (url.pathname === '/api/push/test' && request.method === 'POST') return sendSelfPushTest(request, env, headers);
    if ((url.pathname === '/api/auth/login' || url.pathname === '/api/auth/register') && request.method === 'POST') {
      const limit = url.pathname.endsWith('/register') ? 5 : 10;
      const rl = rateLimit(request, url.pathname, limit);
      if (!rl.allowed) return json({ error: 'Too many authentication attempts. Please try again later.' }, 429, { ...headers, 'retry-after': String(rl.retryAfter) });
    }
    if (needsLeader(request, url) && !(await adminStatus(request, env)).isAdmin) return json({ error: 'Administrator authorization is required.' }, 403, headers);
    return app.fetch(request, env, ctx);
  },
  async scheduled(controller, env, ctx) {
    if (typeof app.scheduled === 'function') return app.scheduled(controller, env, ctx);
  },
};
