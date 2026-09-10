import jwt from 'jsonwebtoken';
import { corsHeaders } from './security.js';
import { uploadImageToStorage } from './upload-api.js';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
});

const bearerToken = (request) => {
  const header = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
};

async function authEmail(request, env) {
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

async function db(env, fn) {
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || '';
  if (!connectionString) throw new Error('Database connection is not configured.');
  const { Client } = await import('pg');
  const client = new Client({ connectionString });
  await client.connect();
  try { return await fn(client); } finally { await client.end().catch(() => {}); }
}

const storyDto = (row, viewerEmail) => ({
  id: String(row.id),
  authorEmail: row.author_email,
  authorName: row.full_name || row.author_email,
  authorAvatarUrl: row.avatar_url || null,
  mediaUrl: row.media_url,
  mediaType: row.media_type,
  caption: row.caption || '',
  createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  viewed: row.viewer_email != null || (viewerEmail && row.author_email?.toLowerCase() === viewerEmail),
});

export async function handleStories(request, env, url) {
  if (!url.pathname.startsWith('/api/stories')) return null;
  const headers = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  const email = await authEmail(request, env);
  if (!email) return json({ error: 'Sign in required.' }, 401, headers);

  try {
    if (url.pathname === '/api/stories' && request.method === 'GET') {
      const rows = await db(env, (client) => client.query(
        `SELECT s.id, s.author_email, s.media_url, s.media_type, s.caption, s.created_at,
                u.full_name, u.avatar_url,
                v.viewer_email
         FROM public.stories s
         LEFT JOIN users u ON LOWER(u.email) = LOWER(s.author_email)
         LEFT JOIN public.story_views v ON v.story_id = s.id AND LOWER(v.viewer_email) = LOWER($1)
         WHERE s.expires_at > now()
         ORDER BY s.created_at ASC`,
        [email],
      ));
      return json({ stories: rows.rows.map((row) => storyDto(row, email)) }, 200, headers);
    }

    const viewerMatch = url.pathname.match(/^\/api\/stories\/([^/]+)\/viewers$/);
    if (viewerMatch && request.method === 'GET') {
      const storyId = viewerMatch[1];
      const rows = await db(env, (client) => client.query(
        `SELECT v.viewer_email, v.created_at, u.full_name, u.avatar_url
         FROM public.story_views v
         JOIN public.stories s ON s.id = v.story_id
         LEFT JOIN users u ON LOWER(u.email) = LOWER(v.viewer_email)
         WHERE v.story_id = $1
           AND LOWER(s.author_email) = LOWER($2)
           AND LOWER(v.viewer_email) <> LOWER(s.author_email)
         ORDER BY v.created_at DESC`,
        [storyId, email],
      ));
      return json({
        viewers: rows.rows.map((row) => ({
          email: row.viewer_email,
          name: row.full_name || row.viewer_email,
          avatarUrl: row.avatar_url || null,
          viewedAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
        })),
      }, 200, headers);
    }

    if (url.pathname === '/api/stories' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const mediaUrl = typeof body?.mediaUrl === 'string' ? body.mediaUrl.trim() : '';
      const mediaType = body?.mediaType === 'video' ? 'video' : 'image';
      const caption = typeof body?.caption === 'string' ? body.caption.trim().slice(0, 280) : '';
      if (!mediaUrl) return json({ error: 'A media URL is required.' }, 400, headers);
      const inserted = await db(env, (client) => client.query(
        `INSERT INTO public.stories (author_email, media_url, media_type, caption)
         VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
        [email, mediaUrl, mediaType, caption || null],
      ));
      return json({ id: String(inserted.rows[0].id), createdAt: inserted.rows[0].created_at }, 201, headers);
    }

    const viewMatch = url.pathname.match(/^\/api\/stories\/([^/]+)\/view$/);
    if (viewMatch && request.method === 'POST') {
      const storyId = viewMatch[1];
      await db(env, (client) => client.query(
        `INSERT INTO public.story_views (story_id, viewer_email) VALUES ($1, $2)
         ON CONFLICT (story_id, viewer_email) DO NOTHING`,
        [storyId, email],
      ));
      return json({ ok: true }, 200, headers);
    }

    const deleteMatch = url.pathname.match(/^\/api\/stories\/([^/]+)$/);
    if (deleteMatch && request.method === 'DELETE') {
      const storyId = deleteMatch[1];
      const result = await db(env, (client) => client.query(
        `DELETE FROM public.stories WHERE id = $1 AND LOWER(author_email) = LOWER($2) RETURNING id`,
        [storyId, email],
      ));
      if (!result.rows.length) return json({ error: 'Story not found, or it is not yours to delete.' }, 404, headers);
      return json({ ok: true }, 200, headers);
    }

    return json({ error: 'Not found.' }, 404, headers);
  } catch (error) {
    console.error('[worker] stories API failed', { message: error?.message, path: url.pathname });
    return json({ error: 'Something went wrong loading stories.' }, 500, headers);
  }
}

export async function handleStoryUpload(request, env, url) {
  if (url.pathname !== '/api/stories/upload' || request.method !== 'POST') return null;
  const headers = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  const email = await authEmail(request, env);
  if (!email) return json({ error: 'Sign in required.' }, 401, headers);
  try {
    const bucket = typeof env.SUPABASE_STORIES_BUCKET === 'string' && env.SUPABASE_STORIES_BUCKET.trim() ? env.SUPABASE_STORIES_BUCKET.trim() : 'stories';
    const result = await uploadImageToStorage(request, env, { bucket, fieldName: 'media', allowVideo: true });
    if (result.error) return json({ error: result.error }, result.status, headers);
    return json({ url: result.url }, 201, headers);
  } catch (error) {
    console.error('[worker] story upload failed', { message: error?.message });
    return json({ error: 'Unable to upload that right now.' }, 500, headers);
  }
}
