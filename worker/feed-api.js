import jwt from 'jsonwebtoken';
import { corsHeaders } from './security.js';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
});

function bearerToken(request) {
  const header = request.headers.get('authorization') || request.headers.get('Authorization') || '';
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
  const client = new Client({ connectionString });
  await client.connect();
  return client;
}

function parseId(value) {
  const id = Number.parseInt(String(value), 10);
  return Number.isSafeInteger(id) && id > 0 ? id : 0;
}

export async function handleFeed(request, env, url) {
  if (!url.pathname.startsWith('/api/feed')) return null;
  const headers = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  try {
    const email = getEmail(request, env);

    if (url.pathname === '/api/feed' && request.method === 'GET') {
      const client = await getDb(env);
      try {
        const result = await client.query(
          `SELECT
             s.id, s.title, s.speaker, s.description, s.youtube_url, s.created_at, s.is_featured,
             COALESCE(l.like_count, 0)::int AS like_count,
             COALESCE(c.comment_count, 0)::int AS comment_count,
             COALESCE(sa.save_count, 0)::int AS save_count,
             CASE WHEN $1 <> '' AND EXISTS (
               SELECT 1 FROM public.feed_likes x WHERE x.sermon_id = s.id AND LOWER(x.user_email) = $1
             ) THEN true ELSE false END AS liked,
             CASE WHEN $1 <> '' AND EXISTS (
               SELECT 1 FROM public.feed_saves x WHERE x.sermon_id = s.id AND LOWER(x.user_email) = $1
             ) THEN true ELSE false END AS saved
           FROM public.sermons s
           LEFT JOIN (
             SELECT sermon_id, COUNT(*) AS like_count FROM public.feed_likes GROUP BY sermon_id
           ) l ON l.sermon_id = s.id
           LEFT JOIN (
             SELECT sermon_id, COUNT(*) AS comment_count FROM public.feed_comments GROUP BY sermon_id
           ) c ON c.sermon_id = s.id
           LEFT JOIN (
             SELECT sermon_id, COUNT(*) AS save_count FROM public.feed_saves GROUP BY sermon_id
           ) sa ON sa.sermon_id = s.id
           ORDER BY s.created_at DESC, s.id DESC`,
          [email],
        );
        return json({ posts: result.rows });
      } finally {
        await client.end().catch(() => {});
      }
    }

    const match = url.pathname.match(/^\/api\/feed\/posts\/([^/]+)(?:\/(like|save|comments))?$/);
    if (!match) return json({ error: 'Not found.' }, 404, headers);

    const sermonId = parseId(match[1]);
    const action = match[2] || '';
    if (!sermonId) return json({ error: 'Invalid post.' }, 400, headers);

    const client = await getDb(env);
    try {
      const exists = await client.query('SELECT id FROM public.sermons WHERE id = $1 LIMIT 1', [sermonId]);
      if (!exists.rows.length) return json({ error: 'Post not found.' }, 404, headers);

      if (action === 'like' && request.method === 'POST') {
        if (!email) return json({ error: 'Sign in required to like posts.' }, 401, headers);
        const current = await client.query('SELECT 1 FROM public.feed_likes WHERE sermon_id = $1 AND LOWER(user_email) = $2 LIMIT 1', [sermonId, email]);
        if (current.rows.length) {
          await client.query('DELETE FROM public.feed_likes WHERE sermon_id = $1 AND LOWER(user_email) = $2', [sermonId, email]);
        } else {
          await client.query('INSERT INTO public.feed_likes (sermon_id, user_email) VALUES ($1, $2) ON CONFLICT (sermon_id, user_email) DO NOTHING', [sermonId, email]);
        }
        const count = await client.query('SELECT COUNT(*)::int AS count FROM public.feed_likes WHERE sermon_id = $1', [sermonId]);
        const liked = await client.query('SELECT 1 FROM public.feed_likes WHERE sermon_id = $1 AND LOWER(user_email) = $2 LIMIT 1', [sermonId, email]);
        return json({ liked: liked.rows.length > 0, likeCount: count.rows[0].count });
      }

      if (action === 'save' && request.method === 'POST') {
        if (!email) return json({ error: 'Sign in required to save posts.' }, 401, headers);
        const current = await client.query('SELECT 1 FROM public.feed_saves WHERE sermon_id = $1 AND LOWER(user_email) = $2 LIMIT 1', [sermonId, email]);
        if (current.rows.length) {
          await client.query('DELETE FROM public.feed_saves WHERE sermon_id = $1 AND LOWER(user_email) = $2', [sermonId, email]);
        } else {
          await client.query('INSERT INTO public.feed_saves (sermon_id, user_email) VALUES ($1, $2) ON CONFLICT (sermon_id, user_email) DO NOTHING', [sermonId, email]);
        }
        const count = await client.query('SELECT COUNT(*)::int AS count FROM public.feed_saves WHERE sermon_id = $1', [sermonId]);
        const saved = await client.query('SELECT 1 FROM public.feed_saves WHERE sermon_id = $1 AND LOWER(user_email) = $2 LIMIT 1', [sermonId, email]);
        return json({ saved: saved.rows.length > 0, saveCount: count.rows[0].count });
      }

      if (action === 'comments' && request.method === 'GET') {
        const result = await client.query(
          `SELECT id, user_email, author_name, body, created_at
           FROM public.feed_comments
           WHERE sermon_id = $1
           ORDER BY created_at ASC, id ASC
           LIMIT 100`,
          [sermonId],
        );
        return json({ comments: result.rows });
      }

      if (action === 'comments' && request.method === 'POST') {
        if (!email) return json({ error: 'Sign in required to comment.' }, 401, headers);
        const body = await request.json().catch(() => ({}));
        const text = typeof body?.body === 'string' ? body.body.trim().slice(0, 1000) : '';
        if (!text) return json({ error: 'Comment cannot be empty.' }, 400, headers);
        const userResult = await client.query('SELECT full_name FROM public.users WHERE LOWER(email) = $1 LIMIT 1', [email]);
        const authorName = String(userResult.rows[0]?.full_name || email).trim().slice(0, 120);
        const inserted = await client.query(
          `INSERT INTO public.feed_comments (sermon_id, user_email, author_name, body)
           VALUES ($1, $2, $3, $4)
           RETURNING id, user_email, author_name, body, created_at`,
          [sermonId, email, authorName, text],
        );
        return json({ comment: inserted.rows[0] }, 201, headers);
      }

      if (action === 'comments' && request.method === 'DELETE') {
        if (!email) return json({ error: 'Sign in required.' }, 401, headers);
        const commentId = parseId(url.searchParams.get('commentId'));
        if (!commentId) return json({ error: 'Invalid comment.' }, 400, headers);
        const deleted = await client.query(
          'DELETE FROM public.feed_comments WHERE id = $1 AND LOWER(user_email) = $2 RETURNING id',
          [commentId, email],
        );
        if (!deleted.rows.length) return json({ error: 'Comment not found, or it is not yours to delete.' }, 404, headers);
        return json({ ok: true }, 200, headers);
      }

      return json({ error: 'Method not allowed.' }, 405, headers);
    } finally {
      await client.end().catch(() => {});
    }
  } catch (error) {
    console.error('[worker] feed API failed', { message: error?.message, path: url.pathname });
    return json({ error: 'Unable to load Feed right now.' }, 503, headers);
  }
}
