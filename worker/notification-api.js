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
  const client = new Client({ connectionString, connectionTimeoutMillis: 8000, query_timeout: 10000 });
  await client.connect();
  return client;
}

export async function handleNotifications(request, env, url) {
  if (!url.pathname.startsWith('/api/notifications')) return null;
  const headers = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  const email = getEmail(request, env);
  if (!email) return json({ error: 'Sign in required.' }, 401, headers);

  try {
    const client = await getDb(env);
    try {
      if (url.pathname === '/api/notifications' && request.method === 'GET') {
        const rawLimit = Number.parseInt(url.searchParams.get('limit') || '50', 10);
        const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 50, 1), 100);
        const result = await client.query(
          'SELECT n.id,n.type,n.post_id,n.body,n.created_at,n.read_at, u.full_name AS actor_name,u.avatar_url AS actor_avatar_url FROM public.notifications n LEFT JOIN public.users u ON LOWER(u.email)=LOWER(n.actor_email) WHERE LOWER(n.recipient_email)=LOWER($1) ORDER BY n.created_at DESC,n.id DESC LIMIT $2',
          [email, limit],
        );
        const unread = await client.query(
          'SELECT COUNT(*)::int AS count FROM public.notifications WHERE LOWER(recipient_email)=LOWER($1) AND read_at IS NULL',
          [email],
        );
        return json({
          notifications: result.rows.map((row) => ({
            id: String(row.id),
            type: row.type,
            title: row.actor_name || 'Emet member',
            body: row.body || '',
            receivedAt: row.created_at,
            read: Boolean(row.read_at),
            data: {
              type: row.type,
              postId: row.post_id || '',
              actorName: row.actor_name || 'Emet member',
              avatarUrl: row.actor_avatar_url || '',
            },
          })),
          unreadCount: Number(unread.rows[0]?.count || 0),
        }, 200, headers);
      }

      const readMatch = url.pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);
      if (readMatch && request.method === 'POST') {
        const id = Number.parseInt(readMatch[1], 10);
        if (!Number.isSafeInteger(id) || id <= 0) return json({ error: 'Invalid notification.' }, 400, headers);
        await client.query(
          'UPDATE public.notifications SET read_at=COALESCE(read_at,now()) WHERE id=$1 AND LOWER(recipient_email)=LOWER($2)',
          [id, email],
        );
        return json({ ok: true }, 200, headers);
      }

      if (url.pathname === '/api/notifications/read-all' && request.method === 'POST') {
        await client.query(
          'UPDATE public.notifications SET read_at=COALESCE(read_at,now()) WHERE LOWER(recipient_email)=LOWER($1) AND read_at IS NULL',
          [email],
        );
        return json({ ok: true }, 200, headers);
      }

      return json({ error: 'Not found.' }, 404, headers);
    } finally {
      await client.end().catch(() => {});
    }
  } catch (error) {
    console.error('[worker] notifications API failed', { message: error?.message, path: url.pathname });
    return json({ error: 'Unable to load notifications right now.' }, 503, headers);
  }
}
