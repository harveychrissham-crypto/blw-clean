import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';
import { corsHeaders } from './security.js';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
});

const clean = (value, max = 120) => typeof value === 'string' ? value.trim().slice(0, max) : '';

function livekit(env) {
  const url = clean(env.LIVEKIT_URL, 500);
  const key = clean(env.LIVEKIT_API_KEY, 200);
  const secret = clean(env.LIVEKIT_API_SECRET, 500);
  if (!url || !key || !secret) throw new Error('LiveKit configuration is missing.');
  return { url, key, secret, rooms: new RoomServiceClient(url, key, secret) };
}

async function auth(request, env) {
  const header = request.headers.get('Authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  const secret = env.JWT_SECRET || env.SUPABASE_JWT_SECRET || '';
  if (!secret) return null;
  const { jwtVerify } = await import('jose');
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ['HS256'] });
    return { id: String(payload.sub || payload.user_id || ''), email: String(payload.email || '') };
  } catch { return null; }
}

function identity(user) { return user.id || user.email || `member-${crypto.randomUUID()}`; }
function roomName(value) { return clean(value, 80).replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || `meeting-${crypto.randomUUID().slice(0, 8)}`; }

async function issueToken(lk, user, room, canPublish = true) {
  const token = new AccessToken(lk.key, lk.secret, { identity: identity(user), name: user.email || 'BLW Member', ttl: '1h' });
  token.addGrant({ roomJoin: true, room, canPublish, canSubscribe: true, canPublishData: true });
  return token.toJwt();
}

export async function handleVideo(request, env, url) {
  if (!url.pathname.startsWith('/api/video')) return null;
  const headers = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  try {
    const user = await auth(request, env);
    if (!user) return json({ error: 'Authentication required.' }, 401, headers);
    const lk = livekit(env);

    if (url.pathname === '/api/video/token' && request.method === 'POST') {
      const body = await request.json().catch(() => null);
      const room = roomName(body?.room);
      const token = await issueToken(lk, user, room, body?.role !== 'viewer');
      return json({ token, url: lk.url, room }, 200, headers);
    }

    if (url.pathname === '/api/video/rooms' && request.method === 'POST') {
      const body = await request.json().catch(() => null);
      const room = roomName(body?.name);
      await lk.rooms.createRoom({ name: room, emptyTimeout: 300, maxParticipants: 100 });
      return json({ room, joinPath: `/meetings?room=${encodeURIComponent(room)}` }, 201, headers);
    }

    if (url.pathname === '/api/video/rooms' && request.method === 'GET') {
      const rooms = await lk.rooms.listRooms();
      const active = await Promise.all(rooms.map(async (r) => {
        const participants = await lk.rooms.listParticipants(r.name);
        return { room: r.name, participantCount: participants.length, participants: participants.map(p => ({ identity: p.identity, name: p.name || '' })) };
      }));
      return json({ rooms: active }, 200, headers);
    }

    const match = url.pathname.match(/^\/api\/video\/rooms\/([^/]+)$/);
    if (match && request.method === 'DELETE') {
      await lk.rooms.deleteRoom(decodeURIComponent(match[1]));
      return json({ ok: true }, 200, headers);
    }

    return json({ error: 'Not found.' }, 404, headers);
  } catch (error) {
    console.error('[worker] video API failed', error);
    return json({ error: error.message || 'Video service unavailable.' }, 503, headers);
  }
}
