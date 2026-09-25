import jwt from 'jsonwebtoken';
import { corsHeaders } from './security.js';

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
  });

function bearerToken(request) {
  const header = request.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function getEmail(request, env) {
  const token = bearerToken(request);
  const secret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';
  if (!token || !secret) return '';
  try {
    const payload = jwt.verify(token, secret);
    return typeof payload?.user?.email === 'string' ? payload.user.email.trim().toLowerCase() : '';
  } catch {
    return '';
  }
}

async function getDb(env) {
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || '';
  if (!connectionString) throw new Error('Database connection is not configured.');
  const { Client } = await import('pg');
  const client = new Client({ connectionString, connectionTimeoutMillis: 8000, query_timeout: 10000 });
  await client.connect();
  return client;
}

function slugify(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
}

async function authorName(client, email) {
  const result = await client.query('SELECT full_name FROM public.users WHERE LOWER(email)=LOWER($1) LIMIT 1', [email]);
  return String(result.rows[0]?.full_name || email).trim().slice(0, 120);
}

export async function handleCommunities(request, env, url) {
  if (!url.pathname.startsWith('/api/communities')) return null;
  const headers = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  try {
    const email = getEmail(request, env);
    const client = await getDb(env);

    try {
      if (url.pathname === '/api/communities' && request.method === 'GET') {
        const query = String(url.searchParams.get('q') || '').trim().slice(0, 80);
        const category = String(url.searchParams.get('category') || '').trim().slice(0, 40);
        const result = await client.query(
          `SELECT c.id,c.slug,c.name,c.description,c.category,c.icon_url,c.banner_url,c.created_at,
            COUNT(cm.id)::int AS member_count,
            EXISTS(SELECT 1 FROM public.community_members me WHERE me.community_id=c.id AND LOWER(me.user_email)=LOWER($1)) AS joined
           FROM public.communities c
           LEFT JOIN public.community_members cm ON cm.community_id=c.id
           WHERE ($2='' OR LOWER(c.name) LIKE '%' || LOWER($2) || '%' OR LOWER(c.description) LIKE '%' || LOWER($2) || '%' OR LOWER(c.category) LIKE '%' || LOWER($2) || '%')
             AND ($3='' OR c.category=$3)
           GROUP BY c.id
           ORDER BY member_count DESC,c.created_at DESC,c.id DESC
           LIMIT 100`,
          [email || '', query, category]
        );
        return json({ communities: result.rows }, 200, headers);
      }

      if (url.pathname === '/api/communities' && request.method === 'POST') {
        if (!email) return json({ error: 'Sign in required to create a community.' }, 401, headers);
        const body = await request.json().catch(() => ({}));
        const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 80) : '';
        const description = typeof body?.description === 'string' ? body.description.trim().slice(0, 500) : '';
        const category = typeof body?.category === 'string' ? body.category.trim().slice(0, 40) : 'General';
        const slug = slugify(name);
        if (!name || !slug) return json({ error: 'Community name is required.' }, 400, headers);
        if (!description) return json({ error: 'Add a short description.' }, 400, headers);
        const existing = await client.query('SELECT id FROM public.communities WHERE slug=$1 LIMIT 1', [slug]);
        if (existing.rows.length) return json({ error: 'A community with that name already exists.' }, 409, headers);
        const created = await client.query(
          'INSERT INTO public.communities(slug,name,description,category,created_by) VALUES($1,$2,$3,$4,$5) RETURNING id,slug,name,description,category,icon_url,banner_url,created_at',
          [slug, name, description, category || 'General', email]
        );
        const community = created.rows[0];
        await client.query(
          'INSERT INTO public.community_members(community_id,user_email,role) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
          [community.id, email, 'owner']
        );
        return json({ community: { ...community, member_count: 1, joined: true } }, 201, headers);
      }

      const detailMatch = url.pathname.match(/^\/api\/communities\/([^/]+)$/);
      if (detailMatch && request.method === 'GET') {
        const id = Number.parseInt(detailMatch[1], 10);
        if (!Number.isSafeInteger(id) || id <= 0) return json({ error: 'Invalid community.' }, 400, headers);
        const result = await client.query(
          `SELECT c.id,c.slug,c.name,c.description,c.category,c.icon_url,c.banner_url,c.created_at,
            COUNT(cm.id)::int AS member_count,
            EXISTS(SELECT 1 FROM public.community_members me WHERE me.community_id=c.id AND LOWER(me.user_email)=LOWER($2)) AS joined
           FROM public.communities c
           LEFT JOIN public.community_members cm ON cm.community_id=c.id
           WHERE c.id=$1 GROUP BY c.id LIMIT 1`,
          [id, email || '']
        );
        if (!result.rows.length) return json({ error: 'Community not found.' }, 404, headers);
        const posts = await client.query(
          'SELECT id,user_email,author_name,body,created_at FROM public.community_posts WHERE community_id=$1 ORDER BY created_at DESC,id DESC LIMIT 50',
          [id]
        );
        return json({ community: result.rows[0], posts: posts.rows }, 200, headers);
      }

      const joinMatch = url.pathname.match(/^\/api\/communities\/([^/]+)\/join$/);
      if (joinMatch && request.method === 'POST') {
        if (!email) return json({ error: 'Sign in required to join communities.' }, 401, headers);
        const id = Number.parseInt(joinMatch[1], 10);
        if (!Number.isSafeInteger(id) || id <= 0) return json({ error: 'Invalid community.' }, 400, headers);
        const exists = await client.query('SELECT 1 FROM public.communities WHERE id=$1 LIMIT 1', [id]);
        if (!exists.rows.length) return json({ error: 'Community not found.' }, 404, headers);
        const current = await client.query('SELECT 1 FROM public.community_members WHERE community_id=$1 AND LOWER(user_email)=LOWER($2) LIMIT 1', [id, email]);
        if (current.rows.length) {
          await client.query('DELETE FROM public.community_members WHERE community_id=$1 AND LOWER(user_email)=LOWER($2)', [id, email]);
        } else {
          await client.query('INSERT INTO public.community_members(community_id,user_email,role) VALUES($1,$2,$3) ON CONFLICT DO NOTHING', [id, email, 'member']);
        }
        const count = await client.query('SELECT COUNT(*)::int AS count FROM public.community_members WHERE community_id=$1', [id]);
        return json({ joined: !current.rows.length, memberCount: count.rows[0].count }, 200, headers);
      }

      const postMatch = url.pathname.match(/^\/api\/communities\/([^/]+)\/posts$/);
      if (postMatch && request.method === 'POST') {
        if (!email) return json({ error: 'Sign in required to post in a community.' }, 401, headers);
        const id = Number.parseInt(postMatch[1], 10);
        const body = await request.json().catch(() => ({}));
        const text = typeof body?.body === 'string' ? body.body.trim().slice(0, 5000) : '';
        if (!Number.isSafeInteger(id) || id <= 0 || !text) return json({ error: 'Write something before posting.' }, 400, headers);
        const member = await client.query('SELECT 1 FROM public.community_members WHERE community_id=$1 AND LOWER(user_email)=LOWER($2) LIMIT 1', [id, email]);
        if (!member.rows.length) return json({ error: 'Join this community before posting.' }, 403, headers);
        const name = await authorName(client, email);
        const created = await client.query(
          'INSERT INTO public.community_posts(community_id,user_email,author_name,body) VALUES($1,$2,$3,$4) RETURNING id,user_email,author_name,body,created_at',
          [id, email, name, text]
        );
        return json({ post: created.rows[0] }, 201, headers);
      }

      return json({ error: 'Not found.' }, 404, headers);
    } finally {
      await client.end().catch(() => {});
    }
  } catch (error) {
    console.error('[worker] communities API failed', { message: error?.message, path: url.pathname });
    return json({ error: 'Unable to load Communities right now.' }, 503, headers);
  }
}
