import { httpServerHandler } from 'cloudflare:node';

let expressHandlerPromise;

const json = (body, status = 200, extraHeaders = {}) => new Response(
  JSON.stringify(body),
  { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extraHeaders } }
);

const sanitizeString = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/<[^>]*>/g, '').replace(/[<>\"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
};
const sanitizeEmail = (value) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const createMembershipId = () => `M-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
const createBadge = () => `BLW-2026-${Math.floor(100 + Math.random() * 900)}`;

async function withDb(workerEnv, callback) {
  const connectionString = workerEnv.HYPERDRIVE?.connectionString || workerEnv.DATABASE_URL || '';
  if (!connectionString) throw new Error('HYPERDRIVE/DATABASE_URL is required for the API.');
  const { Client } = await import('pg');
  const client = new Client({ connectionString });
  await client.connect();
  try { return await callback(client); } finally { await client.end().catch(() => {}); }
}

async function ensureUsersTable(client) {
  await client.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, full_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL, phone TEXT NOT NULL UNIQUE, campus_zone TEXT NOT NULL,
    chapter TEXT NOT NULL, country TEXT NOT NULL, residence TEXT NOT NULL, birthday DATE,
    invited_by TEXT NOT NULL, gender TEXT NOT NULL, membership_id TEXT NOT NULL UNIQUE,
    badge TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Pending',
    joined_date DATE NOT NULL DEFAULT CURRENT_DATE, created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  )`);
}

function authCorsHeaders(origin) {
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-credentials': 'true',
    'access-control-allow-methods': 'GET,POST,DELETE,OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization',
    vary: 'Origin',
  };
}

function getBearerToken(request) {
  const authorization = request.headers.get('Authorization') || request.headers.get('authorization');
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7).trim();
  const cookie = request.headers.get('Cookie') || request.headers.get('cookie') || '';
  const match = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('blw_auth_token='));
  return match ? decodeURIComponent(match.slice('blw_auth_token='.length)) : '';
}

async function handleAccountDelete(request, workerEnv, url) {
  const corsHeaders = authCorsHeaders(url.origin);
  if (url.pathname !== '/api/auth/account/delete' && url.pathname !== '/api/auth/account') return null;
  if (request.method !== 'POST' && request.method !== 'DELETE') return json({ error: 'Method not allowed.' }, 405, corsHeaders);
  const databaseUrl = workerEnv.HYPERDRIVE?.connectionString || workerEnv.DATABASE_URL || '';
  const jwtSecret = workerEnv.JWT_SECRET || databaseUrl || '';
  if (!databaseUrl) return json({ error: 'Database connection is not configured.' }, 503, corsHeaders);
  if (!jwtSecret) return json({ error: 'Authentication is not configured.' }, 503, corsHeaders);
  const token = getBearerToken(request);
  if (!token) return json({ error: 'Authorization token missing.' }, 401, corsHeaders);
  try {
    const { default: jwt } = await import('jsonwebtoken');
    const decoded = jwt.verify(token, jwtSecret);
    const email = sanitizeEmail(decoded?.user?.email);
    if (!email) return json({ error: 'Invalid authentication token.' }, 401, corsHeaders);
    const result = await withDb(workerEnv, async (client) => {
      await ensureUsersTable(client);
      return client.query('DELETE FROM users WHERE LOWER(email) = LOWER($1) RETURNING email', [email]);
    });
    if (!result.rows.length) return json({ error: 'Account not found.' }, 404, corsHeaders);
    return json({ status: 'ok', message: 'Account deleted successfully.' }, 200, {
      ...corsHeaders,
      'set-cookie': 'blw_auth_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure',
    });
  } catch (error) {
    console.error('[worker] direct account deletion failed', error);
    if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') return json({ error: 'Invalid or expired token.' }, 401, corsHeaders);
    return json({ error: 'Unable to delete account at this time.' }, 500, corsHeaders);
  }
}

async function handleAuthApi(request, workerEnv, url) {
  const corsHeaders = authCorsHeaders(url.origin);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  const accountDeleteResponse = await handleAccountDelete(request, workerEnv, url);
  if (accountDeleteResponse) return accountDeleteResponse;
  if (url.pathname === '/api/auth/health' && request.method === 'GET') return json({ status: 'ok', message: 'Auth service ready' }, 200, corsHeaders);
  if (url.pathname !== '/api/auth/register' && url.pathname !== '/api/auth/login') return null;
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, corsHeaders);
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: 'Invalid JSON request body.' }, 400, corsHeaders);
  const databaseUrl = workerEnv.HYPERDRIVE?.connectionString || workerEnv.DATABASE_URL || '';
  const jwtSecret = workerEnv.JWT_SECRET || databaseUrl || '';
  if (!databaseUrl) return json({ error: 'Database connection is not configured.' }, 503, corsHeaders);
  if (!jwtSecret) return json({ error: 'Authentication is not configured.' }, 503, corsHeaders);
  const { default: jwt } = await import('jsonwebtoken');
  const { hashPassword, verifyPassword } = await import('../server/utils/crypto.js');

  if (url.pathname === '/api/auth/register') {
    const fullName = sanitizeString(body.fullName), email = sanitizeEmail(body.email), password = body.password;
    const phone = sanitizeString(body.phone), campusZone = sanitizeString(body.campusZone), chapter = sanitizeString(body.chapter);
    const country = sanitizeString(body.country), residence = sanitizeString(body.residence), birthday = sanitizeString(body.birthday);
    const invitedBy = sanitizeString(body.invitedBy), gender = sanitizeString(body.gender);
    if (!fullName || !email || !password || !phone || !campusZone || !chapter || !country || !residence || !invitedBy || !gender) return json({ error: 'Missing required registration fields.' }, 400, corsHeaders);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Invalid email format.' }, 400, corsHeaders);
    if (password.length < 8) return json({ error: 'Password must be at least 8 characters.' }, 400, corsHeaders);
    try {
      const result = await withDb(workerEnv, async (client) => {
        await ensureUsersTable(client);
        const duplicate = await client.query('SELECT 1 FROM users WHERE LOWER(email) = LOWER($1) OR phone = $2 LIMIT 1', [email, phone]);
        if (duplicate.rows.length) return { duplicate: true };
        const hashedPassword = await hashPassword(password);
        const membershipId = createMembershipId(), badge = createBadge();
        const inserted = await client.query(`INSERT INTO users (
          full_name, email, password_hash, phone, campus_zone, chapter, country, residence,
          birthday, invited_by, gender, membership_id, badge, status
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Verified')
        RETURNING email, full_name, phone, campus_zone, chapter, country, residence, birthday,
          invited_by, gender, membership_id, badge, status`,
          [fullName, email, hashedPassword, phone, campusZone, chapter, country, residence, birthday || null, invitedBy, gender, membershipId, badge]);
        return { user: inserted.rows[0] };
      });
      if (result.duplicate) return json({ error: 'An account with that email or phone already exists.' }, 409, corsHeaders);
      const user = result.user;
      const payloadUser = { email: user.email, name: user.full_name, phone: user.phone, campusZone: user.campus_zone, chapter: user.chapter, country: user.country, residence: user.residence, birthday: user.birthday, invitedBy: user.invited_by, gender: user.gender, membershipId: user.membership_id, badge: user.badge, status: user.status };
      const token = jwt.sign({ user: payloadUser }, jwtSecret, { expiresIn: '7d' });
      return json({ user: payloadUser, token }, 201, { ...corsHeaders, 'set-cookie': `blw_auth_token=${encodeURIComponent(token)}; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax; Secure` });
    } catch (error) {
      console.error('[worker] direct registration failed', error);
      if (error?.code === '23505') return json({ error: 'An account with that email or phone already exists.' }, 409, corsHeaders);
      return json({ error: 'Unable to process registration at this time.' }, 500, corsHeaders);
    }
  }

  const email = sanitizeEmail(body.email), password = body.password;
  if (!email || !password) return json({ error: 'Email and password are required.' }, 400, corsHeaders);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Invalid email format.' }, 400, corsHeaders);
  try {
    const user = await withDb(workerEnv, async (client) => {
      await ensureUsersTable(client);
      const result = await client.query(`SELECT full_name, email, phone, campus_zone, chapter, country, residence, birthday, invited_by, gender, membership_id, badge, status, password_hash FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`, [email]);
      if (!result.rows.length) return null;
      const row = result.rows[0];
      if (!(await verifyPassword(password, row.password_hash))) return null;
      return row;
    });
    if (!user) return json({ error: 'Invalid email or password.' }, 401, corsHeaders);
    const payloadUser = { email: user.email, name: user.full_name, phone: user.phone, campusZone: user.campus_zone, chapter: user.chapter, country: user.country, residence: user.residence, birthday: user.birthday, invitedBy: user.invited_by, gender: user.gender, membershipId: user.membership_id, badge: user.badge, status: user.status };
    const token = jwt.sign({ user: payloadUser }, jwtSecret, { expiresIn: '7d' });
    return json({ user: payloadUser, token }, 200, { ...corsHeaders, 'set-cookie': `blw_auth_token=${encodeURIComponent(token)}; Max-Age=604800; Path=/; HttpOnly; SameSite=Lax; Secure` });
  } catch (error) {
    console.error('[worker] direct login failed', error);
    return json({ error: 'Unable to process login at this time.' }, 500, corsHeaders);
  }
}

async function getExpressHandler(workerEnv) {
  if (!expressHandlerPromise) {
    expressHandlerPromise = (async () => {
      process.env.CLOUDFLARE_WORKERS = 'true';
      const databaseUrl = workerEnv.HYPERDRIVE?.connectionString || workerEnv.DATABASE_URL || '';
      const jwtSecret = workerEnv.JWT_SECRET || databaseUrl || '';
      process.env.DATABASE_URL = databaseUrl;
      process.env.JWT_SECRET = jwtSecret;
      process.env.SUPABASE_URL = workerEnv.SUPABASE_URL || '';
      process.env.SUPABASE_SERVICE_ROLE_KEY = workerEnv.SUPABASE_SERVICE_ROLE_KEY || '';
      process.env.SUPABASE_STORAGE_BUCKET = workerEnv.SUPABASE_STORAGE_BUCKET || 'outreach-photos';
      if (!databaseUrl) throw new Error('HYPERDRIVE/DATABASE_URL is required for the API.');
      if (!jwtSecret) throw new Error('JWT_SECRET is required for authentication.');
      const { createApp } = await import('../server/server.js');
      const app = createApp({ serveStatic: false });
      app.listen(3000);
      return httpServerHandler({ port: 3000 });
    })();
  }
  return expressHandlerPromise;
}

export default {
  async fetch(request, workerEnv, ctx) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return workerEnv.ASSETS.fetch(request);
    try {
      const directAuthResponse = await handleAuthApi(request, workerEnv, url);
      if (directAuthResponse) return directAuthResponse;
    } catch (error) {
      console.error('[worker] direct auth handler failed', error);
      return json({ error: 'API service is temporarily unavailable.' }, 503, authCorsHeaders(url.origin));
    }
    process.env.ALLOWED_ORIGIN = workerEnv.ALLOWED_ORIGIN || url.origin;
    try {
      const expressHandler = await getExpressHandler(workerEnv);
      return await expressHandler.fetch(request, workerEnv, ctx);
    } catch (error) {
      console.error('[worker] API request failed', error);
      return json({ error: 'API service is temporarily unavailable.' }, 503, authCorsHeaders(url.origin));
    }
  },
};
