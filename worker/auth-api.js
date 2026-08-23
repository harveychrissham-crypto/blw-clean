import jwt from 'jsonwebtoken';
import { hashPassword, verifyPassword } from '../server/utils/crypto.js';
import { corsHeaders } from './security.js';
import { sendEmail, welcomeEmail } from './email.js';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
});

const sanitizeString = (value) => {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/<[^>]*>/g, '').replace(/[<>\"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
};
const sanitizeEmail = (value) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const cookie = (token) => `blw_auth_token=${encodeURIComponent(token)}; Max-Age=604800; Path=/; HttpOnly; SameSite=Strict; Secure`;
const clearCookie = 'blw_auth_token=; Max-Age=0; Path=/; HttpOnly; SameSite=Strict; Secure';
const bearerToken = (request) => {
  const authorization = request.headers.get('Authorization') || request.headers.get('authorization') || '';
  if (authorization.startsWith('Bearer ')) return authorization.slice(7).trim();
  const raw = request.headers.get('Cookie') || request.headers.get('cookie') || '';
  const match = raw.split(';').map((part) => part.trim()).find((part) => part.startsWith('blw_auth_token='));
  return match ? decodeURIComponent(match.slice('blw_auth_token='.length)) : '';
};

async function db(env, fn) {
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || '';
  if (!connectionString) throw new Error('Database connection is not configured.');
  const { Client } = await import('pg');
  const client = new Client({ connectionString });
  await client.connect();
  try { return await fn(client); } finally { await client.end().catch(() => {}); }
}

function secret(env) {
  const value = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';
  if (!value) throw new Error('JWT_SECRET is required for authentication.');
  return value;
}

function signUser(user, env) {
  return jwt.sign({ user }, secret(env), { expiresIn: '7d' });
}

async function ensurePasswordChangedColumn(client) {
  await client.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE');
}

async function authenticatedUser(request, env, client) {
  const token = bearerToken(request);
  if (!token) return { error: 'Authorization token missing.', status: 401 };
  try {
    const payload = jwt.verify(token, secret(env));
    const email = sanitizeEmail(payload?.user?.email);
    if (!email) return { error: 'Invalid authentication token.', status: 401 };
    await ensurePasswordChangedColumn(client);
    const result = await client.query('SELECT password_changed_at FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1', [email]);
    if (!result.rows.length) return { error: 'Account no longer exists.', status: 401 };
    const passwordChangedAt = result.rows[0].password_changed_at ? new Date(result.rows[0].password_changed_at).getTime() / 1000 : 0;
    if (passwordChangedAt && (!payload.iat || Number(payload.iat) < passwordChangedAt)) return { error: 'Your session has expired. Please sign in again.', status: 401 };
    return { user: payload.user, token };
  } catch (error) {
    if (error?.name === 'JsonWebTokenError' || error?.name === 'TokenExpiredError') return { error: 'Invalid or expired token.', status: 401 };
    throw error;
  }
}

function payloadUser(row, isAdmin = false) {
  return {
    email: row.email,
    name: row.full_name,
    phone: row.phone,
    campusZone: row.campus_zone,
    chapter: row.chapter,
    country: row.country,
    residence: row.residence,
    birthday: row.birthday,
    invitedBy: row.invited_by,
    gender: row.gender,
    membershipId: row.membership_id,
    badge: row.badge,
    status: row.status,
    isAdmin,
  };
}

export async function handleAuth(request, env, ctx) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/auth')) return null;
  const headers = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  try {
    if (url.pathname === '/api/auth/health' && request.method === 'GET') {
      return json({ status: 'ok', message: 'Auth service ready' }, 200, headers);
    }

    if (url.pathname === '/api/auth/logout') {
      if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, headers);
      return json({ status: 'ok' }, 200, { ...headers, 'set-cookie': clearCookie });
    }

    const database = await db(env, async (client) => {
      if (url.pathname === '/api/auth/me') {
        if (request.method !== 'GET') return { response: json({ error: 'Method not allowed.' }, 405, headers) };
        const auth = await authenticatedUser(request, env, client);
        if (auth.error) return { response: json({ error: auth.error }, auth.status, headers) };
        const freshToken = signUser(auth.user, env);
        return { response: json({ user: auth.user, token: freshToken }, 200, { ...headers, 'set-cookie': cookie(freshToken) }) };
      }

      if (url.pathname === '/api/auth/account' || url.pathname === '/api/auth/account/delete') {
        if (request.method !== 'POST' && request.method !== 'DELETE') return { response: json({ error: 'Method not allowed.' }, 405, headers) };
        const auth = await authenticatedUser(request, env, client);
        if (auth.error) return { response: json({ error: auth.error }, auth.status, headers) };
        const deleted = await client.query('DELETE FROM users WHERE LOWER(email)=LOWER($1) RETURNING email', [sanitizeEmail(auth.user.email)]);
        if (!deleted.rows.length) return { response: json({ error: 'Account not found.' }, 404, headers) };
        return { response: json({ status: 'ok', message: 'Account deleted successfully.' }, 200, { ...headers, 'set-cookie': clearCookie }) };
      }

      if (url.pathname !== '/api/auth/register' && url.pathname !== '/api/auth/login') return null;
      if (request.method !== 'POST') return { response: json({ error: 'Method not allowed.' }, 405, headers) };
      const body = await request.json().catch(() => null);
      if (!body) return { response: json({ error: 'Invalid JSON request body.' }, 400, headers) };

      if (url.pathname === '/api/auth/register') {
        const fullName = sanitizeString(body.fullName);
        const email = sanitizeEmail(body.email);
        const password = body.password;
        const phone = sanitizeString(body.phone);
        const campusZone = sanitizeString(body.campusZone);
        const chapter = sanitizeString(body.chapter);
        const country = sanitizeString(body.country);
        const residence = sanitizeString(body.residence);
        const birthday = sanitizeString(body.birthday);
        const invitedBy = sanitizeString(body.invitedBy);
        const gender = sanitizeString(body.gender);
        if (!fullName || !email || !password || !phone || !campusZone || !chapter || !country || !residence || !invitedBy || !gender) return { response: json({ error: 'Missing required registration fields.' }, 400, headers) };
        if (!/^([^\s@]+)@([^\s@]+)\.([^\s@]+)$/.test(email)) return { response: json({ error: 'Invalid email format.' }, 400, headers) };
        if (password.length < 8) return { response: json({ error: 'Password must be at least 8 characters.' }, 400, headers) };

        const duplicate = await client.query('SELECT 1 FROM users WHERE LOWER(email)=LOWER($1) OR phone=$2 LIMIT 1', [email, phone]);
        if (duplicate.rows.length) return { response: json({ error: 'An account with that email or phone already exists.' }, 409, headers) };
        await ensurePasswordChangedColumn(client);
        const hashedPassword = await hashPassword(password);
        const membershipId = `M-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const badge = `BLW-2026-${Math.floor(100 + Math.random() * 900)}`;
        const inserted = await client.query(`INSERT INTO users (full_name,email,password_hash,phone,campus_zone,chapter,country,residence,birthday,invited_by,gender,membership_id,badge,status,password_changed_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'Verified',NOW()) RETURNING email,full_name,phone,campus_zone,chapter,country,residence,birthday,invited_by,gender,membership_id,badge,status`, [fullName, email, hashedPassword, phone, campusZone, chapter, country, residence, birthday || null, invitedBy, gender, membershipId, badge]);
        const user = payloadUser(inserted.rows[0], false);
        const token = signUser(user, env);
        if (ctx?.waitUntil) ctx.waitUntil((async () => { try { await sendEmail(env, { to: user.email, ...welcomeEmail(user) }); } catch (error) { console.error('[email] welcome email failed', error); } })());
        return { response: json({ user, token }, 201, { ...headers, 'set-cookie': cookie(token) }) };
      }

      const email = sanitizeEmail(body.email);
      const password = body.password;
      if (!email || !password) return { response: json({ error: 'Email and password are required.' }, 400, headers) };
      if (!/^([^\s@]+)@([^\s@]+)\.[^\s@]+$/.test(email)) return { response: json({ error: 'Invalid email format.' }, 400, headers) };
      const result = await client.query(`SELECT full_name,email,phone,campus_zone,chapter,country,residence,birthday,invited_by,gender,membership_id,badge,status,password_hash,is_admin FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1`, [email]);
      if (!result.rows.length) return { response: json({ error: 'Invalid email or password.' }, 401, headers) };
      const row = result.rows[0];
      if (!(await verifyPassword(password, row.password_hash))) return { response: json({ error: 'Invalid email or password.' }, 401, headers) };
      const user = payloadUser(row, !!row.is_admin);
      const token = signUser(user, env);
      return { response: json({ user, token }, 200, { ...headers, 'set-cookie': cookie(token) }) };
    });

    if (database?.response) return database.response;
    return null;
  } catch (error) {
    console.error('[worker] auth API failed', { message: error?.message, code: error?.code });
    return json({ error: 'Unable to process authentication at this time.' }, 500, headers);
  }
}
