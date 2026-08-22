import { corsHeaders } from './security.js';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });

async function db(env, fn) {
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || '';
  if (!connectionString) throw new Error('Database connection is not configured.');
  const { Client } = await import('pg');
  const client = new Client({ connectionString });
  await client.connect();
  try { return await fn(client); } finally { await client.end().catch(() => {}); }
}

const clean = (value, max = 10000) => typeof value === 'string' ? value.trim().replace(/[<>]/g, '').slice(0, max) : '';
const storyDto = (row) => ({ id: row.id, tag: row.tag || '', title: row.title, subtitle: row.subtitle || '', body: row.body || '', imageUrl: row.image_url || '' });

export async function handleOutreach(request, env, url) {
  if (!url.pathname.startsWith('/api/outreach-stories')) return null;
  const headers = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  try {
    const result = await db(env, async (client) => {
      if (url.pathname === '/api/outreach-stories' && request.method === 'GET') {
        const r = await client.query('SELECT * FROM outreach_stories ORDER BY id DESC');
        return { status: 200, body: { stories: r.rows.map(storyDto) } };
      }
      if (url.pathname === '/api/outreach-stories' && request.method === 'POST') {
        const body = await request.json().catch(() => null) || {};
        const tag = clean(body.tag, 120);
        const title = clean(body.title, 240);
        const subtitle = clean(body.subtitle, 500);
        const storyBody = clean(body.body, 12000);
        const imageUrl = clean(body.imageUrl, 1000);
        if (!title) return { status: 400, body: { error: 'Title is required.' } };
        const r = await client.query(`INSERT INTO outreach_stories (tag,title,subtitle,body,image_url) VALUES ($1,$2,$3,$4,$5) RETURNING *`, [tag, title, subtitle, storyBody, imageUrl]);
        return { status: 201, body: { story: storyDto(r.rows[0]) } };
      }
      const match = url.pathname.match(/^\/api\/outreach-stories\/(\d+)$/);
      if (!match) return { status: 405, body: { error: 'Method not allowed.' } };
      const id = Number(match[1]);
      if (request.method === 'PUT' || request.method === 'PATCH') {
        const body = await request.json().catch(() => null) || {};
        const tag = clean(body.tag, 120);
        const title = clean(body.title, 240);
        const subtitle = clean(body.subtitle, 500);
        const storyBody = clean(body.body, 12000);
        const imageUrl = clean(body.imageUrl, 1000);
        if (!title) return { status: 400, body: { error: 'Title is required.' } };
        const r = await client.query(`UPDATE outreach_stories SET tag=$1,title=$2,subtitle=$3,body=$4,image_url=$5 WHERE id=$6 RETURNING *`, [tag, title, subtitle, storyBody, imageUrl, id]);
        return r.rows.length ? { status: 200, body: { story: storyDto(r.rows[0]) } } : { status: 404, body: { error: 'Story not found.' } };
      }
      if (request.method === 'DELETE') {
        const r = await client.query('DELETE FROM outreach_stories WHERE id=$1 RETURNING id', [id]);
        return r.rows.length ? { status: 200, body: { deleted: true } } : { status: 404, body: { error: 'Story not found.' } };
      }
      return { status: 405, body: { error: 'Method not allowed.' } };
    });
    return json(result.body, result.status, headers);
  } catch (error) {
    console.error('[worker] outreach API failed', { message: error?.message, code: error?.code });
    return json({ error: 'Unable to access outreach stories right now.' }, 503, headers);
  }
}
