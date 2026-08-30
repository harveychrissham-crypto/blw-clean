import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { AccessToken, LiveKitAPI, S3Upload, SegmentedFileOutput, SegmentedFileProtocol } from 'livekit-server-sdk';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
});

function bearer(request) {
  const header = request.headers.get('Authorization') || request.headers.get('authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

function authUser(request, env) {
  const token = bearer(request);
  if (!token || !env.JWT_SECRET) return null;
  try { return jwt.verify(token, String(env.JWT_SECRET).trim()); } catch { return null; }
}

function memberEmail(auth) {
  return typeof auth?.user?.email === 'string' ? auth.user.email.trim().toLowerCase() : '';
}

function identityFor(email) {
  return `member-${crypto.createHash('sha256').update(email).digest('hex').slice(0, 24)}`;
}

function safeRoom(value) {
  return String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

function isLeader(auth) {
  const user = auth?.user || auth || {};
  const roles = Array.isArray(user.roles) ? user.roles : [];
  const role = String(user.role || user.user_role || user.admin_role || '').toLowerCase();
  return Boolean(user.is_admin || user.isAdmin || user.is_leader || user.isLeader)
    || ['admin', 'administrator', 'leader', 'superadmin', 'super_admin'].includes(role)
    || roles.some((item) => ['admin', 'administrator', 'leader', 'superadmin', 'super_admin'].includes(String(item).toLowerCase()));
}

function livekit(env) {
  const host = String(env.LIVEKIT_URL || '').trim();
  const key = String(env.LIVEKIT_API_KEY || '').trim();
  const secret = String(env.LIVEKIT_API_SECRET || '').trim();
  if (!host || !key || !secret) throw new Error('LiveKit is not configured. Add LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.');
  return { host, key, secret, api: new LiveKitAPI(host, key, secret) };
}

async function syncLiveState(env, values) {
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || '';
  if (!connectionString) throw new Error('Database connection is not configured.');
  const { Client } = await import('pg');
  const client = new Client({ connectionString });
  await client.connect();
  try {
    await client.query(`CREATE TABLE IF NOT EXISTS live_stream (
      id INTEGER PRIMARY KEY DEFAULT 1,
      title TEXT NOT NULL DEFAULT '',
      youtube_url TEXT NOT NULL DEFAULT '',
      is_live BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
      CONSTRAINT live_stream_singleton CHECK (id = 1)
    )`);
    await client.query(`ALTER TABLE live_stream ADD COLUMN IF NOT EXISTS google_meet_url TEXT NOT NULL DEFAULT ''`);
    await client.query(`ALTER TABLE live_stream ADD COLUMN IF NOT EXISTS daily_room_url TEXT NOT NULL DEFAULT ''`);
    await client.query(`ALTER TABLE live_stream ADD COLUMN IF NOT EXISTS hls_playback_url TEXT NOT NULL DEFAULT ''`);
    await client.query(`ALTER TABLE live_stream ADD COLUMN IF NOT EXISTS livekit_room TEXT NOT NULL DEFAULT ''`);
    await client.query(`ALTER TABLE live_stream ADD COLUMN IF NOT EXISTS livekit_egress_id TEXT NOT NULL DEFAULT ''`);
    await client.query(`INSERT INTO live_stream (id) VALUES (1) ON CONFLICT (id) DO NOTHING`);
    await client.query(`UPDATE live_stream SET title=$1,is_live=$2,hls_playback_url=$3,livekit_room=$4,livekit_egress_id=$5,updated_at=NOW() WHERE id=1`, [values.title || '', !!values.isLive, values.playbackUrl || '', values.room || '', values.egressId || '']);
  } finally { await client.end().catch(() => {}); }
}

async function tokenResponse(request, env, headers) {
  const auth = authUser(request, env);
  if (!auth) return json({ error: 'Invalid authentication token.' }, 401, headers);
  const email = memberEmail(auth);
  if (!email) return json({ error: 'Authenticated member identity is missing.' }, 401, headers);
  const body = await request.clone().json().catch(() => ({}));
  const room = safeRoom(body?.room_name || body?.room);
  if (!room) return json({ error: 'A valid room name is required.' }, 400, headers);
  const participantName = String(body?.participant_name || 'BLW Member').trim().slice(0, 80) || 'BLW Member';
  const canPublish = body?.role !== 'viewer';
  const { host, key, secret } = livekit(env);
  const identity = identityFor(email);
  const access = new AccessToken(key, secret, { identity, name: participantName, ttl: '1h' });
  access.addGrant({ roomJoin: true, room, canPublish, canSubscribe: true, canPublishData: true });
  return json({ server_url: host, participant_token: await access.toJwt(), participant_identity: identity, participant_name: participantName, room }, 201, headers);
}

async function createRoom(request, env, headers) {
  const auth = authUser(request, env);
  if (!auth) return json({ error: 'Authentication required.' }, 401, headers);
  if (!memberEmail(auth)) return json({ error: 'Authenticated member identity is missing.' }, 401, headers);
  const body = await request.clone().json().catch(() => ({}));
  const room = safeRoom(body?.name) || `meeting-${crypto.randomUUID().slice(0, 8)}`;
  const { api } = livekit(env);
  await api.room.createRoom({ name: room, emptyTimeout: 300, maxParticipants: 100 });
  return json({ room, join_url: `/meetings?room=${encodeURIComponent(room)}` }, 201, headers);
}

async function listRooms(request, env, headers) {
  const auth = authUser(request, env);
  if (!auth) return json({ error: 'Authentication required.' }, 401, headers);
  if (!isLeader(auth)) return json({ error: 'Leader access required.' }, 403, headers);
  const { api } = livekit(env);
  const rooms = await api.room.listRooms();
  const result = await Promise.all(rooms.map(async (room) => {
    const participants = await api.room.listParticipants(room.name);
    return { room: room.name, participantCount: participants.length, participants: participants.map((p) => ({ identity: p.identity, name: p.name || 'BLW Member' })) };
  }));
  return json({ rooms: result }, 200, headers);
}

async function deleteRoom(request, env, headers, room) {
  const auth = authUser(request, env);
  if (!auth) return json({ error: 'Authentication required.' }, 401, headers);
  if (!isLeader(auth)) return json({ error: 'Leader access required.' }, 403, headers);
  const { api } = livekit(env);
  await api.room.deleteRoom(safeRoom(room));
  return json({ ok: true }, 200, headers);
}

async function startBroadcast(request, env, headers) {
  const auth = authUser(request, env);
  if (!auth) return json({ error: 'Authentication required.' }, 401, headers);
  if (!isLeader(auth)) return json({ error: 'Leader access required.' }, 403, headers);
  const publicUrl = String(env.LIVEKIT_HLS_PUBLIC_URL || '').trim().replace(/\/$/, '');
  const accessKey = String(env.LIVEKIT_HLS_S3_ACCESS_KEY || '').trim();
  const secret = String(env.LIVEKIT_HLS_S3_SECRET || '').trim();
  const bucket = String(env.LIVEKIT_HLS_S3_BUCKET || '').trim();
  const endpoint = String(env.LIVEKIT_HLS_S3_ENDPOINT || '').trim();
  const region = String(env.LIVEKIT_HLS_S3_REGION || 'auto').trim();
  if (!publicUrl || !accessKey || !secret || !bucket || !endpoint) return json({ error: 'HLS storage is not configured.' }, 503, headers);
  const body = await request.clone().json().catch(() => ({}));
  const room = safeRoom(body?.room_name || body?.name) || `live-${crypto.randomUUID().slice(0, 8)}`;
  const title = String(body?.title || 'BLW Live Service').trim().slice(0, 160) || 'BLW Live Service';
  const { api } = livekit(env);
  await api.room.createRoom({ name: room, emptyTimeout: 300, maxParticipants: 100 });
  const prefix = `live/${room}`;
  const output = new SegmentedFileOutput({
    protocol: SegmentedFileProtocol.HLS_PROTOCOL,
    filenamePrefix: `${prefix}/segment`,
    playlistName: `${prefix}/index.m3u8`,
    livePlaylistName: `${prefix}/live.m3u8`,
    segmentDuration: 2,
    output: { case: 's3', value: new S3Upload({ accessKey, secret, bucket, endpoint, region, forcePathStyle: true }) },
  });
  let egress;
  try { egress = await api.egress.startRoomCompositeEgress(room, output, { layout: 'grid' }); }
  catch (error) { await api.room.deleteRoom(room).catch(() => {}); throw error; }
  const playbackUrl = `${publicUrl}/${prefix}/live.m3u8`;
  try { await syncLiveState(env, { title, isLive: true, playbackUrl, room, egressId: egress.egressId }); }
  catch (error) { await api.egress.stopEgress(egress.egressId).catch(() => {}); await api.room.deleteRoom(room).catch(() => {}); throw error; }
  return json({ room, egress_id: egress.egressId, playback_url: playbackUrl, title }, 201, headers);
}

async function stopBroadcast(request, env, headers) {
  const auth = authUser(request, env);
  if (!auth) return json({ error: 'Authentication required.' }, 401, headers);
  if (!isLeader(auth)) return json({ error: 'Leader access required.' }, 403, headers);
  const body = await request.clone().json().catch(() => ({}));
  const room = safeRoom(body?.room_name || body?.room);
  const egressId = String(body?.egress_id || '').trim();
  const { api } = livekit(env);
  if (egressId) await api.egress.stopEgress(egressId);
  if (room) await api.room.deleteRoom(room);
  await syncLiveState(env, { title: '', isLive: false, playbackUrl: '', room: '', egressId: '' });
  return json({ ok: true }, 200, headers);
}

export async function handleLiveKitToken(request, env, headers) {
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, headers);
  return tokenResponse(request, env, headers);
}

export async function handleVideoApi(request, env, url, headers) {
  if (!url.pathname.startsWith('/api/video')) return null;
  try {
    if (url.pathname === '/api/video/token' && request.method === 'POST') return await tokenResponse(request, env, headers);
    if (url.pathname === '/api/video/rooms' && request.method === 'POST') return await createRoom(request, env, headers);
    if (url.pathname === '/api/video/rooms' && request.method === 'GET') return await listRooms(request, env, headers);
    const roomMatch = url.pathname.match(/^\/api\/video\/rooms\/([^/]+)$/);
    if (roomMatch && request.method === 'DELETE') return await deleteRoom(request, env, headers, decodeURIComponent(roomMatch[1]));
    if (url.pathname === '/api/video/broadcast/start' && request.method === 'POST') return await startBroadcast(request, env, headers);
    if (url.pathname === '/api/video/broadcast/stop' && request.method === 'POST') return await stopBroadcast(request, env, headers);
    return json({ error: 'Not found.' }, 404, headers);
  } catch (error) {
    console.error('[worker] LiveKit API error', error);
    return json({ error: error?.message || 'Video service unavailable.' }, 503, headers);
  }
}
