import jwt from 'jsonwebtoken';
import { corsHeaders } from './security.js';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
});

const bearerToken = (request) => {
  const header = request.headers.get('authorization') || '';
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

const userDto = (row) => ({
  email: row.email,
  name: row.full_name || row.email,
  avatarUrl: row.avatar_url || null,
  title: row.title || null,
  chapter: row.chapter || null,
});

export async function handleMessages(request, env, url) {
  if (!url.pathname.startsWith('/api/messages')) return null;
  const headers = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  const email = await authEmail(request, env);
  if (!email) return json({ error: 'Sign in required.' }, 401, headers);

  try {
    if (url.pathname === '/api/messages/people' && request.method === 'GET') {
      const q = (url.searchParams.get('q') || '').trim().slice(0, 80);
      if (q.length < 2) return json({ people: [] }, 200, headers);
      const result = await db(env, (client) => client.query(
        `SELECT email, full_name, avatar_url, title, chapter
         FROM public.users
         WHERE LOWER(email) <> LOWER($1)
           AND (full_name ILIKE $2 OR email ILIKE $2)
         ORDER BY full_name NULLS LAST, email
         LIMIT 20`,
        [email, `%${q}%`],
      ));
      return json({ people: result.rows.map(userDto) }, 200, headers);
    }

    if (url.pathname === '/api/messages/conversations' && request.method === 'GET') {
      const result = await db(env, (client) => client.query(
        `SELECT c.id, c.updated_at,
                other.email AS other_email, other.full_name AS other_name, other.avatar_url AS other_avatar_url,
                other.title AS other_title, other.chapter AS other_chapter,
                lm.body AS last_body, lm.created_at AS last_created_at,
                COALESCE((SELECT count(*) FROM public.messages m2
                  WHERE m2.conversation_id = c.id
                    AND m2.sender_email <> $1
                    AND m2.created_at > COALESCE(me.last_read_at, 'epoch'::timestamptz)), 0)::int AS unread_count
         FROM public.message_conversations c
         JOIN public.message_participants me ON me.conversation_id = c.id AND LOWER(me.user_email) = LOWER($1)
         JOIN LATERAL (
           SELECT p.user_email FROM public.message_participants p
           WHERE p.conversation_id = c.id AND LOWER(p.user_email) <> LOWER($1)
           ORDER BY p.created_at LIMIT 1
         ) op ON true
         JOIN public.users other ON LOWER(other.email) = LOWER(op.user_email)
         LEFT JOIN LATERAL (
           SELECT body, created_at FROM public.messages m
           WHERE m.conversation_id = c.id ORDER BY m.created_at DESC, m.id DESC LIMIT 1
         ) lm ON true
         ORDER BY COALESCE(lm.created_at, c.updated_at) DESC`,
        [email],
      ));
      return json({ conversations: result.rows.map((row) => ({
        id: String(row.id),
        other: { email: row.other_email, name: row.other_name || row.other_email, avatarUrl: row.other_avatar_url || null, title: row.other_title || null, chapter: row.other_chapter || null },
        lastMessage: row.last_body || '',
        lastMessageAt: row.last_created_at || row.updated_at,
        unreadCount: Number(row.unread_count || 0),
      })) }, 200, headers);
    }

    const conversationMatch = url.pathname.match(/^\/api\/messages\/conversations\/([^/]+)$/);
    if (conversationMatch && request.method === 'GET') {
      const conversationId = conversationMatch[1];
      const access = await db(env, (client) => client.query(
        `SELECT 1 FROM public.message_participants WHERE conversation_id = $1 AND LOWER(user_email) = LOWER($2) LIMIT 1`,
        [conversationId, email],
      ));
      if (!access.rows.length) return json({ error: 'Conversation not found.' }, 404, headers);
      const result = await db(env, (client) => client.query(
        `SELECT m.id, m.sender_email, m.body, m.created_at, u.full_name AS sender_name, u.avatar_url AS sender_avatar_url
         FROM public.messages m
         LEFT JOIN public.users u ON LOWER(u.email) = LOWER(m.sender_email)
         WHERE m.conversation_id = $1
         ORDER BY m.created_at ASC, m.id ASC
         LIMIT 300`,
        [conversationId],
      ));
      return json({ messages: result.rows.map((row) => ({
        id: String(row.id), senderEmail: row.sender_email, senderName: row.sender_name || row.sender_email,
        senderAvatarUrl: row.sender_avatar_url || null, body: row.body, createdAt: row.created_at,
      })) }, 200, headers);
    }

    if (conversationMatch && request.method === 'POST') {
      const conversationId = conversationMatch[1];
      const body = await request.json().catch(() => ({}));
      const text = typeof body?.body === 'string' ? body.body.trim().slice(0, 2000) : '';
      if (!text) return json({ error: 'Message cannot be empty.' }, 400, headers);
      const access = await db(env, (client) => client.query(
        `SELECT 1 FROM public.message_participants WHERE conversation_id = $1 AND LOWER(user_email) = LOWER($2) LIMIT 1`,
        [conversationId, email],
      ));
      if (!access.rows.length) return json({ error: 'Conversation not found.' }, 404, headers);
      const inserted = await db(env, (client) => client.query(
        `INSERT INTO public.messages (conversation_id, sender_email, body) VALUES ($1, $2, $3) RETURNING id, created_at`,
        [conversationId, email, text],
      ));
      return json({ message: { id: String(inserted.rows[0].id), senderEmail: email, body: text, createdAt: inserted.rows[0].created_at } }, 201, headers);
    }

    if (conversationMatch && request.method === 'PATCH') {
      const conversationId = conversationMatch[1];
      const result = await db(env, (client) => client.query(
        `UPDATE public.message_participants SET last_read_at = now()
         WHERE conversation_id = $1 AND LOWER(user_email) = LOWER($2) RETURNING conversation_id`,
        [conversationId, email],
      ));
      if (!result.rows.length) return json({ error: 'Conversation not found.' }, 404, headers);
      return json({ ok: true }, 200, headers);
    }

    if (url.pathname === '/api/messages/conversations' && request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      const recipientEmail = typeof body?.recipientEmail === 'string' ? body.recipientEmail.trim().toLowerCase() : '';
      if (!recipientEmail || recipientEmail === email) return json({ error: 'Choose another member.' }, 400, headers);

      const recipient = await db(env, (client) => client.query(
        `SELECT email, full_name, avatar_url, title, chapter FROM public.users WHERE LOWER(email) = LOWER($1) LIMIT 1`,
        [recipientEmail],
      ));
      if (!recipient.rows.length) return json({ error: 'Member not found.' }, 404, headers);

      const existing = await db(env, (client) => client.query(
        `SELECT c.id FROM public.message_conversations c
         JOIN public.message_participants p1 ON p1.conversation_id = c.id AND LOWER(p1.user_email) = LOWER($1)
         JOIN public.message_participants p2 ON p2.conversation_id = c.id AND LOWER(p2.user_email) = LOWER($2)
         WHERE (SELECT count(*) FROM public.message_participants px WHERE px.conversation_id = c.id) = 2
         LIMIT 1`,
        [email, recipientEmail],
      ));
      if (existing.rows.length) return json({ conversationId: String(existing.rows[0].id), other: userDto(recipient.rows[0]) }, 200, headers);

      const created = await db(env, async (client) => {
        await client.query('BEGIN');
        try {
          const conversation = await client.query(`INSERT INTO public.message_conversations DEFAULT VALUES RETURNING id`);
          const id = conversation.rows[0].id;
          await client.query(`INSERT INTO public.message_participants (conversation_id, user_email) VALUES ($1, $2), ($1, $3)`, [id, email, recipientEmail]);
          await client.query('COMMIT');
          return id;
        } catch (error) { await client.query('ROLLBACK'); throw error; }
      });
      return json({ conversationId: String(created), other: userDto(recipient.rows[0]) }, 201, headers);
    }

    return json({ error: 'Not found.' }, 404, headers);
  } catch (error) {
    console.error('[worker] messages API failed', { message: error?.message, path: url.pathname });
    return json({ error: 'Unable to load messages right now.' }, 500, headers);
  }
}
