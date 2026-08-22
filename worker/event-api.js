import jwt from 'jsonwebtoken';
import { corsHeaders } from './security.js';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
});

function bearerToken(request) {
  const header = request.headers.get('Authorization') || request.headers.get('authorization') || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return '';
}

function jwtSecret(env) {
  const secret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';
  if (!secret) throw new Error('JWT_SECRET is required for authentication.');
  return secret;
}

async function db(env, fn) {
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || '';
  if (!connectionString) throw new Error('Database connection is not configured.');
  const { Client } = await import('pg');
  const client = new Client({ connectionString });
  await client.connect();
  try { return await fn(client); } finally { await client.end().catch(() => {}); }
}

async function isAdmin(request, env, client) {
  const token = bearerToken(request);
  if (!token) return false;
  try {
    const payload = jwt.verify(token, jwtSecret(env));
    const email = typeof payload?.user?.email === 'string' ? payload.user.email.trim().toLowerCase() : '';
    if (!email) return false;
    const result = await client.query('SELECT is_admin FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1', [email]);
    return result.rows[0]?.is_admin === true;
  } catch {
    return false;
  }
}

const toEvent = (event) => ({
  id: event.id,
  title: event.title,
  category: event.category,
  date: event.event_date?.toISOString().slice(0, 10) || '',
  time: event.event_time || '',
  location: event.location || '',
  description: event.description || '',
});

export async function handleEvents(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/events')) return null;
  const headers = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  const match = url.pathname.match(/^\/api\/events(?:\/(\d+))?$/);
  if (!match) return null;
  const id = match[1] ? Number(match[1]) : null;

  try {
    return await db(env, async (client) => {
      if (request.method === 'GET' && id === null) {
        const result = await client.query('SELECT * FROM events ORDER BY event_date ASC, id ASC');
        return json({ events: result.rows.map(toEvent) }, 200, headers);
      }

      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
        if (!(await isAdmin(request, env, client))) return json({ error: 'Administrator authorization is required.' }, 403, headers);
      }

      if (request.method === 'POST' && id === null) {
        const body = await request.json().catch(() => null);
        const title = typeof body?.title === 'string' ? body.title.trim() : '';
        const date = typeof body?.date === 'string' ? body.date.trim() : '';
        if (!title || !date) return json({ error: 'Title and date are required.' }, 400, headers);
        const result = await client.query(`INSERT INTO events (title,category,event_date,event_time,location,description) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [title, typeof body.category === 'string' && body.category.trim() ? body.category.trim() : 'General', date, typeof body.time === 'string' ? body.time.trim() : '', typeof body.location === 'string' ? body.location.trim() : '', typeof body.description === 'string' ? body.description.trim() : '']);
        return json({ event: toEvent(result.rows[0]) }, 201, headers);
      }

      if (['PUT', 'PATCH'].includes(request.method) && id !== null) {
        const body = await request.json().catch(() => null);
        const title = typeof body?.title === 'string' ? body.title.trim() : '';
        const date = typeof body?.date === 'string' ? body.date.trim() : '';
        if (!title || !date) return json({ error: 'Title and date are required.' }, 400, headers);
        const result = await client.query(`UPDATE events SET title=$1,category=$2,event_date=$3,event_time=$4,location=$5,description=$6 WHERE id=$7 RETURNING *`, [title, typeof body.category === 'string' && body.category.trim() ? body.category.trim() : 'General', date, typeof body.time === 'string' ? body.time.trim() : '', typeof body.location === 'string' ? body.location.trim() : '', typeof body.description === 'string' ? body.description.trim() : '', id]);
        if (!result.rows.length) return json({ error: 'Event not found.' }, 404, headers);
        return json({ event: toEvent(result.rows[0]) }, 200, headers);
      }

      if (request.method === 'DELETE' && id !== null) {
        const result = await client.query('DELETE FROM events WHERE id=$1 RETURNING id', [id]);
        if (!result.rows.length) return json({ error: 'Event not found.' }, 404, headers);
        return json({ deleted: true }, 200, headers);
      }

      return json({ error: 'Method not allowed.' }, 405, headers);
    });
  } catch (error) {
    console.error('[worker] events API failed', { message: error?.message, code: error?.code });
    return json({ error: 'Unable to access events right now.' }, 503, headers);
  }
}
