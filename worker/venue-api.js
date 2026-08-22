import jwt from 'jsonwebtoken';
import { corsHeaders } from './security.js';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
});

const getToken = (request) => {
  const header = request.headers.get('Authorization') || request.headers.get('authorization') || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  const cookie = request.headers.get('Cookie') || request.headers.get('cookie') || '';
  const match = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith('blw_auth_token='));
  return match ? decodeURIComponent(match.slice('blw_auth_token='.length)) : '';
};

async function isAdmin(request, env) {
  const token = getToken(request);
  const secret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';
  if (!token || !secret) return false;
  try {
    const payload = jwt.verify(token, secret);
    const email = typeof payload?.user?.email === 'string' ? payload.user.email.trim().toLowerCase() : '';
    if (!email) return false;
    const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || '';
    if (!connectionString) return false;
    const { Client } = await import('pg');
    const client = new Client({ connectionString });
    await client.connect();
    try {
      const result = await client.query('SELECT is_admin FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1', [email]);
      return result.rows[0]?.is_admin === true;
    } finally { await client.end().catch(() => {}); }
  } catch { return false; }
}

async function db(env, fn) {
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || '';
  if (!connectionString) throw new Error('Database connection is not configured.');
  const { Client } = await import('pg');
  const client = new Client({ connectionString });
  await client.connect();
  try { return await fn(client); } finally { await client.end().catch(() => {}); }
}

const toVenue = (row) => ({ id: row.id, chapter: row.chapter, venue: row.venue, serviceTime: row.service_time || '', updatedAt: row.updated_at });

export async function handleVenues(request, env, url) {
  if (!url.pathname.startsWith('/api/venues')) return null;
  const headers = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  try {
    const chapterMatch = url.pathname.match(/^\/api\/venues\/([^/]+)$/);
    const chapter = chapterMatch ? decodeURIComponent(chapterMatch[1]) : '';

    if (request.method === 'GET') {
      const result = await db(env, async (client) => {
        if (!chapterMatch) {
          const rows = await client.query('SELECT * FROM chapter_venues ORDER BY chapter ASC');
          return { status: 200, body: { venues: rows.rows.map(toVenue) } };
        }
        const rows = await client.query('SELECT * FROM chapter_venues WHERE LOWER(chapter)=LOWER($1) LIMIT 1', [chapter]);
        if (!rows.rows.length) return { status: 404, body: { error: 'No venue set for this chapter yet.' } };
        return { status: 200, body: { venue: toVenue(rows.rows[0]) } };
      });
      return json(result.body, result.status, headers);
    }

    if (!(await isAdmin(request, env))) return json({ error: 'Administrator authorization is required.' }, 403, headers);
    if (!chapterMatch) return json({ error: 'Chapter is required.' }, 400, headers);

    if (request.method === 'PUT') {
      const body = await request.json().catch(() => null);
      const venue = typeof body?.venue === 'string' ? body.venue.trim() : '';
      const serviceTime = typeof body?.serviceTime === 'string' ? body.serviceTime.trim() : '';
      if (!chapter || !venue) return json({ error: 'Chapter and venue are required.' }, 400, headers);
      const result = await db(env, async (client) => client.query(`INSERT INTO chapter_venues (chapter, venue, service_time, updated_at) VALUES ($1,$2,$3,NOW()) ON CONFLICT (chapter) DO UPDATE SET venue=EXCLUDED.venue, service_time=EXCLUDED.service_time, updated_at=NOW() RETURNING *`, [chapter, venue, serviceTime]));
      return json({ venue: toVenue(result.rows[0]) }, 200, headers);
    }

    if (request.method === 'DELETE') {
      const result = await db(env, async (client) => client.query('DELETE FROM chapter_venues WHERE LOWER(chapter)=LOWER($1) RETURNING id', [chapter]));
      if (!result.rows.length) return json({ error: 'No venue set for this chapter.' }, 404, headers);
      return json({ deleted: true }, 200, headers);
    }

    return json({ error: 'Method not allowed.' }, 405, headers);
  } catch (error) {
    console.error('[worker] venue API failed', { message: error?.message, code: error?.code, path: url.pathname });
    return json({ error: 'Unable to access service venues right now.' }, 503, headers);
  }
}
