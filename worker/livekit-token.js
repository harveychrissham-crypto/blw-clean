import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { AccessToken, LiveKitAPI, StreamOutput, TrackSource, EncodedFileOutput, S3Upload } from 'livekit-server-sdk';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
function bearer(request) { const h = request.headers.get('Authorization') || request.headers.get('authorization') || ''; return h.startsWith('Bearer ') ? h.slice(7).trim() : ''; }
function authUser(request, env) { const token = bearer(request); if (!token || !env.JWT_SECRET) return null; try { return jwt.verify(token, String(env.JWT_SECRET).trim()); } catch { return null; } }
function memberEmail(auth) { return typeof auth?.user?.email === 'string' ? auth.user.email.trim().toLowerCase() : ''; }
function identityFor(email) { return `member-${crypto.createHash('sha256').update(email).digest('hex').slice(0, 24)}`; }
function safeRoom(value) { return String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 80); }
function isLeader(auth) { const user = auth?.user || auth || {}; const roles = Array.isArray(user.roles) ? user.roles : []; const role = String(user.role || user.user_role || user.admin_role || '').toLowerCase(); return Boolean(user.is_admin || user.isAdmin || user.is_leader || user.isLeader) || ['admin','administrator','leader','superadmin','super_admin'].includes(role) || roles.some((item) => ['admin','administrator','leader','superadmin','super_admin'].includes(String(item).toLowerCase())); }
function livekit(env) { const host = String(env.LIVEKIT_URL || '').trim(); const key = String(env.LIVEKIT_API_KEY || '').trim(); const secret = String(env.LIVEKIT_API_SECRET || '').trim(); if (!host || !key || !secret) throw new Error('LiveKit is not configured. Add LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.'); return { host, key, secret, api: new LiveKitAPI(host, key, secret) }; }
async function syncLiveState(env, values) { const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || ''; if (!connectionString) throw new Error('Database connection is not configured.'); const { Client } = await import('pg'); const client = new Client({ connectionString }); await client.connect(); try { await client.query(`CREATE TABLE IF NOT EXISTS live_stream (id INTEGER PRIMARY KEY DEFAULT 1,title TEXT NOT NULL DEFAULT '',youtube_url TEXT NOT NULL DEFAULT '',is_live BOOLEAN NOT NULL DEFAULT FALSE,updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),CONSTRAINT live_stream_singleton CHECK (id = 1))`); await client.query(`ALTER TABLE live_stream ADD COLUMN IF NOT EXISTS hls_playback_url TEXT NOT NULL DEFAULT ''`); await client.query(`ALTER TABLE live_stream ADD COLUMN IF NOT EXISTS livekit_room TEXT NOT NULL DEFAULT ''`); await client.query(`ALTER TABLE live_stream ADD COLUMN IF NOT EXISTS livekit_egress_id TEXT NOT NULL DEFAULT ''`); await client.query(`INSERT INTO live_stream (id) VALUES (1) ON CONFLICT (id) DO NOTHING`); await client.query(`UPDATE live_stream SET title=$1,is_live=$2,hls_playback_url=$3,livekit_room=$4,livekit_egress_id=$5,updated_at=NOW() WHERE id=1`, [values.title || '', !!values.isLive, values.playbackUrl || '', values.room || '', values.egressId || '']); } finally { await client.end().catch(() => {}); } }

// --- Room metadata helpers -------------------------------------------------
// Room metadata is a single JSON blob LiveKit stores per-room. We use it to
// hold lightweight, ephemeral coordination state (lock flag, waiting-room
// flag, active recording egress id, a short remove-cooldown map, and a
// trimmed moderation log) without needing a separate database table. This is
// a plain read-modify-write, not a compare-and-swap: two moderation actions
// landing on the same room in the same instant could race and one could
// clobber the other. For the traffic this app sees (small group calls, one
// or two leaders acting at a time) that's an acceptable tradeoff, but it's
// worth knowing this isn't atomic.
async function readRoomMeta(api, safeRoomName) { try { const rooms = await api.room.listRooms([safeRoomName]); return rooms[0]?.metadata ? JSON.parse(rooms[0].metadata) : {}; } catch { return {}; } }
async function writeRoomMeta(api, safeRoomName, meta) { await api.room.updateRoomMetadata(safeRoomName, JSON.stringify(meta)); }
function appendLog(meta, entry) { const log = Array.isArray(meta.log) ? meta.log.slice(-49) : []; log.push({ ...entry, ts: Date.now() }); return { ...meta, log }; }
const REMOVE_COOLDOWN_MS = 5 * 60 * 1000;

async function tokenResponse(request, env, headers) {
  const auth = authUser(request, env);
  if (!auth) return json({ error: 'Invalid authentication token.' }, 401, headers);
  const email = memberEmail(auth);
  if (!email) return json({ error: 'Authenticated member identity is missing.' }, 401, headers);
  const body = await request.clone().json().catch(() => ({}));
  const room = safeRoom(body?.room_name || body?.room);
  if (!room) return json({ error: 'A valid room name is required.' }, 400, headers);
  const participantName = String(body?.participant_name || 'BLW Member').trim().slice(0, 80) || 'BLW Member';
  const { host, key, secret, api } = livekit(env);
  const identity = identityFor(email);
  let waitingRoom = false;
  if (!isLeader(auth)) {
    const meta = await readRoomMeta(api, room);
    if (meta?.locked) return json({ error: 'This meeting is locked by the host.' }, 423, headers);
    const removedAt = meta?.removed?.[identity];
    if (removedAt && Date.now() - removedAt < REMOVE_COOLDOWN_MS) {
      const remainingMin = Math.max(1, Math.ceil((REMOVE_COOLDOWN_MS - (Date.now() - removedAt)) / 60000));
      return json({ error: `You were removed from this meeting by the host. Try again in about ${remainingMin} minute${remainingMin === 1 ? '' : 's'}.` }, 403, headers);
    }
    waitingRoom = Boolean(meta?.waitingRoom);
  }
  const access = new AccessToken(key, secret, { identity, name: participantName, ttl: '1h', metadata: waitingRoom ? JSON.stringify({ pending: true }) : undefined });
  access.addGrant({ roomJoin: true, room, canPublish: waitingRoom ? false : body?.role !== 'viewer', canSubscribe: !waitingRoom, canPublishData: !waitingRoom });
  return json({ server_url: host, participant_token: await access.toJwt(), participant_identity: identity, participant_name: participantName, room, pending: waitingRoom }, 201, headers);
}

async function createRoom(request, env, headers) { const auth = authUser(request, env); if (!auth) return json({ error: 'Authentication required.' }, 401, headers); if (!memberEmail(auth)) return json({ error: 'Authenticated member identity is missing.' }, 401, headers); const body = await request.clone().json().catch(() => ({})); const room = safeRoom(body?.name) || `meeting-${crypto.randomUUID().slice(0, 8)}`; const { api } = livekit(env); await api.room.createRoom({ name: room, emptyTimeout: 300, maxParticipants: 100 }); return json({ room, join_url: `/meetings?room=${encodeURIComponent(room)}` }, 201, headers); }
async function listRooms(request, env, headers) { const auth = authUser(request, env); if (!auth) return json({ error: 'Authentication required.' }, 401, headers); if (!isLeader(auth)) return json({ error: 'Leader access required.' }, 403, headers); const { api } = livekit(env); const rooms = await api.room.listRooms(); const result = await Promise.all(rooms.map(async (room) => { const participants = await api.room.listParticipants(room.name); return { room: room.name, participantCount: participants.length, participants: participants.map((p) => ({ identity: p.identity, name: p.name || 'BLW Member' })) }; })); return json({ rooms: result }, 200, headers); }
async function deleteRoom(request, env, headers, room) { const auth = authUser(request, env); if (!auth) return json({ error: 'Authentication required.' }, 401, headers); if (!isLeader(auth)) return json({ error: 'Leader access required.' }, 403, headers); const { api } = livekit(env); await api.room.deleteRoom(safeRoom(room)); return json({ ok: true }, 200, headers); }
function micTrackOf(participant) { return (participant?.tracks || []).find((t) => t.source === TrackSource.MICROPHONE); }

async function muteParticipant(request, env, headers, room, identity) {
  const auth = authUser(request, env); if (!auth) return json({ error: 'Authentication required.' }, 401, headers);
  if (!isLeader(auth)) return json({ error: 'Leader access required.' }, 403, headers);
  const { api } = livekit(env); const safe = safeRoom(room);
  const participants = await api.room.listParticipants(safe);
  const participant = participants.find((p) => p.identity === identity);
  if (!participant) return json({ error: 'Participant not found.' }, 404, headers);
  const track = micTrackOf(participant);
  if (!track) return json({ error: 'Participant has no active microphone.' }, 404, headers);
  await api.room.mutePublishedTrack(safe, identity, track.sid, true);
  const meta = await readRoomMeta(api, safe);
  await writeRoomMeta(api, safe, appendLog(meta, { type: 'mute', target: identity, by: memberEmail(auth) })).catch(() => {});
  return json({ ok: true }, 200, headers);
}

async function muteAllParticipants(request, env, headers, room) {
  const auth = authUser(request, env); if (!auth) return json({ error: 'Authentication required.' }, 401, headers);
  if (!isLeader(auth)) return json({ error: 'Leader access required.' }, 403, headers);
  const { api } = livekit(env); const safe = safeRoom(room);
  const requesterIdentity = identityFor(memberEmail(auth));
  const participants = await api.room.listParticipants(safe);
  await Promise.all(participants.filter((p) => p.identity !== requesterIdentity).map(async (p) => { const track = micTrackOf(p); if (track) await api.room.mutePublishedTrack(safe, p.identity, track.sid, true).catch(() => {}); }));
  const meta = await readRoomMeta(api, safe);
  await writeRoomMeta(api, safe, appendLog(meta, { type: 'mute-all', by: memberEmail(auth) })).catch(() => {});
  return json({ ok: true }, 200, headers);
}

async function removeParticipant(request, env, headers, room, identity) {
  const auth = authUser(request, env); if (!auth) return json({ error: 'Authentication required.' }, 401, headers);
  if (!isLeader(auth)) return json({ error: 'Leader access required.' }, 403, headers);
  const { api } = livekit(env); const safe = safeRoom(room);
  await api.room.removeParticipant(safe, identity);
  const meta = await readRoomMeta(api, safe);
  const removed = { ...(meta.removed || {}), [identity]: Date.now() };
  await writeRoomMeta(api, safe, appendLog({ ...meta, removed }, { type: 'remove', target: identity, by: memberEmail(auth) })).catch(() => {});
  return json({ ok: true }, 200, headers);
}

async function admitParticipant(request, env, headers, room, identity) {
  const auth = authUser(request, env); if (!auth) return json({ error: 'Authentication required.' }, 401, headers);
  if (!isLeader(auth)) return json({ error: 'Leader access required.' }, 403, headers);
  const { api } = livekit(env); const safe = safeRoom(room);
  await api.room.updateParticipant(safe, identity, { permission: { canPublish: true, canSubscribe: true, canPublishData: true }, metadata: JSON.stringify({ pending: false }) });
  const meta = await readRoomMeta(api, safe);
  await writeRoomMeta(api, safe, appendLog(meta, { type: 'admit', target: identity, by: memberEmail(auth) })).catch(() => {});
  return json({ ok: true }, 200, headers);
}

async function denyParticipant(request, env, headers, room, identity) {
  const auth = authUser(request, env); if (!auth) return json({ error: 'Authentication required.' }, 401, headers);
  if (!isLeader(auth)) return json({ error: 'Leader access required.' }, 403, headers);
  const { api } = livekit(env); const safe = safeRoom(room);
  // Unlike removeParticipant, denying someone waiting for admission doesn't
  // set the remove-cooldown — they weren't misbehaving, just not let in yet.
  await api.room.removeParticipant(safe, identity);
  const meta = await readRoomMeta(api, safe);
  await writeRoomMeta(api, safe, appendLog(meta, { type: 'deny', target: identity, by: memberEmail(auth) })).catch(() => {});
  return json({ ok: true }, 200, headers);
}

async function setRoomLock(request, env, headers, room) {
  const auth = authUser(request, env); if (!auth) return json({ error: 'Authentication required.' }, 401, headers);
  if (!isLeader(auth)) return json({ error: 'Leader access required.' }, 403, headers);
  const body = await request.clone().json().catch(() => ({}));
  const locked = body?.locked !== false;
  const { api } = livekit(env); const safe = safeRoom(room);
  const meta = await readRoomMeta(api, safe);
  await writeRoomMeta(api, safe, appendLog({ ...meta, locked }, { type: locked ? 'lock' : 'unlock', by: memberEmail(auth) }));
  return json({ ok: true, locked }, 200, headers);
}

async function setWaitingRoom(request, env, headers, room) {
  const auth = authUser(request, env); if (!auth) return json({ error: 'Authentication required.' }, 401, headers);
  if (!isLeader(auth)) return json({ error: 'Leader access required.' }, 403, headers);
  const body = await request.clone().json().catch(() => ({}));
  const enabled = body?.enabled === true;
  const { api } = livekit(env); const safe = safeRoom(room);
  const meta = await readRoomMeta(api, safe);
  await writeRoomMeta(api, safe, appendLog({ ...meta, waitingRoom: enabled }, { type: enabled ? 'waiting-room-on' : 'waiting-room-off', by: memberEmail(auth) }));
  return json({ ok: true, waitingRoom: enabled }, 200, headers);
}

async function roomStatus(request, env, headers, room) {
  const auth = authUser(request, env); if (!auth) return json({ error: 'Authentication required.' }, 401, headers);
  const { api } = livekit(env); const safe = safeRoom(room);
  const host = isLeader(auth);
  const meta = await readRoomMeta(api, safe);
  const result = { isHost: host, locked: Boolean(meta?.locked), waitingRoom: Boolean(meta?.waitingRoom), recording: Boolean(meta?.recordingEgressId) };
  if (host) {
    result.pending = [];
    try {
      const participants = await api.room.listParticipants(safe);
      result.pending = participants.filter((p) => { try { return JSON.parse(p.metadata || '{}')?.pending === true; } catch { return false; } }).map((p) => ({ identity: p.identity, name: p.name || 'BLW Member' }));
    } catch { /* room may not exist yet */ }
    result.log = Array.isArray(meta?.log) ? meta.log.slice(-20).reverse() : [];
  }
  return json(result, 200, headers);
}

async function startRecording(request, env, headers, room) {
  const auth = authUser(request, env); if (!auth) return json({ error: 'Authentication required.' }, 401, headers);
  if (!isLeader(auth)) return json({ error: 'Leader access required.' }, 403, headers);
  const accessKey = String(env.LIVEKIT_RECORDING_S3_ACCESS_KEY || '').trim();
  const secret = String(env.LIVEKIT_RECORDING_S3_SECRET || '').trim();
  const bucket = String(env.LIVEKIT_RECORDING_S3_BUCKET || '').trim();
  const endpoint = String(env.LIVEKIT_RECORDING_S3_ENDPOINT || '').trim();
  if (!accessKey || !secret || !bucket) return json({ error: 'Recording storage is not configured. Add LIVEKIT_RECORDING_S3_ACCESS_KEY, LIVEKIT_RECORDING_S3_SECRET and LIVEKIT_RECORDING_S3_BUCKET.' }, 503, headers);
  const { api } = livekit(env); const safe = safeRoom(room);
  const existing = await readRoomMeta(api, safe);
  if (existing?.recordingEgressId) return json({ error: 'A recording is already in progress for this room.' }, 409, headers);
  const output = new EncodedFileOutput({
    filepath: `recordings/${safe}-${Date.now()}.mp4`,
    s3: new S3Upload({ accessKey, secret, bucket, region: String(env.LIVEKIT_RECORDING_S3_REGION || 'auto'), endpoint, forcePathStyle: true }),
  });
  let egress;
  try { egress = await api.egress.startRoomCompositeEgress(safe, output, { layout: 'grid' }); }
  catch (error) { return json({ error: error?.message || 'Unable to start recording.' }, 502, headers); }
  const meta = await readRoomMeta(api, safe);
  await writeRoomMeta(api, safe, appendLog({ ...meta, recordingEgressId: egress.egressId }, { type: 'recording-start', by: memberEmail(auth) })).catch(() => {});
  return json({ ok: true, egressId: egress.egressId }, 201, headers);
}

async function stopRecording(request, env, headers, room) {
  const auth = authUser(request, env); if (!auth) return json({ error: 'Authentication required.' }, 401, headers);
  if (!isLeader(auth)) return json({ error: 'Leader access required.' }, 403, headers);
  const { api } = livekit(env); const safe = safeRoom(room);
  const meta = await readRoomMeta(api, safe);
  const egressId = String(meta?.recordingEgressId || '').trim();
  if (!egressId) return json({ error: 'No active recording found for this room.' }, 404, headers);
  try { await api.egress.stopEgress(egressId); } catch (error) { return json({ error: error?.message || 'Unable to stop recording.' }, 502, headers); }
  const { recordingEgressId, ...rest } = meta;
  await writeRoomMeta(api, safe, appendLog(rest, { type: 'recording-stop', by: memberEmail(auth) })).catch(() => {});
  return json({ ok: true }, 200, headers);
}

async function startBroadcast(request, env, headers) { const auth = authUser(request, env); if (!auth) return json({ error: 'Authentication required.' }, 401, headers); if (!isLeader(auth)) return json({ error: 'Leader access required.' }, 403, headers); const rtmpUrl = String(env.LIVEKIT_RTMP_URL || '').trim(); const playbackUrl = String(env.LIVEKIT_PUBLIC_PLAYBACK_URL || '').trim(); if (!rtmpUrl || !playbackUrl) return json({ error: 'Livestream output is not configured. Add LIVEKIT_RTMP_URL and LIVEKIT_PUBLIC_PLAYBACK_URL.' }, 503, headers); const body = await request.clone().json().catch(() => ({})); const room = safeRoom(body?.room_name || body?.name) || `live-${crypto.randomUUID().slice(0, 8)}`; const title = String(body?.title || 'BLW Live Service').trim().slice(0, 160) || 'BLW Live Service'; const { api } = livekit(env); await api.room.createRoom({ name: room, emptyTimeout: 300, maxParticipants: 100 }); let egress; try { const output = new StreamOutput({ protocol: 'rtmp', urls: [rtmpUrl] }); egress = await api.egress.startRoomCompositeEgress(room, output, { layout: 'grid' }); } catch (error) { await api.room.deleteRoom(room).catch(() => {}); throw error; } try { await syncLiveState(env, { title, isLive: true, playbackUrl, room, egressId: egress.egressId }); } catch (error) { await api.egress.stopEgress(egress.egressId).catch(() => {}); await api.room.deleteRoom(room).catch(() => {}); throw error; } return json({ room, egress_id: egress.egressId, playback_url: playbackUrl, title }, 201, headers); }
async function stopBroadcast(request, env, headers) { const auth = authUser(request, env); if (!auth) return json({ error: 'Authentication required.' }, 401, headers); if (!isLeader(auth)) return json({ error: 'Leader access required.' }, 403, headers); const body = await request.clone().json().catch(() => ({})); const room = safeRoom(body?.room_name || body?.room); const egressId = String(body?.egress_id || '').trim(); const { api } = livekit(env); if (egressId) await api.egress.stopEgress(egressId); if (room) await api.room.deleteRoom(room); await syncLiveState(env, { title: '', isLive: false, playbackUrl: '', room: '', egressId: '' }); return json({ ok: true }, 200, headers); }

export async function handleLiveKitToken(request, env, headers) { if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, headers); return tokenResponse(request, env, headers); }

export async function handleVideoApi(request, env, url, headers) {
  if (!url.pathname.startsWith('/api/video')) return null;
  try {
    if (url.pathname === '/api/video/token' && request.method === 'POST') return await tokenResponse(request, env, headers);
    if (url.pathname === '/api/video/rooms' && request.method === 'POST') return await createRoom(request, env, headers);
    if (url.pathname === '/api/video/rooms' && request.method === 'GET') return await listRooms(request, env, headers);
    const roomMatch = url.pathname.match(/^\/api\/video\/rooms\/([^/]+)$/);
    if (roomMatch && request.method === 'DELETE') return await deleteRoom(request, env, headers, decodeURIComponent(roomMatch[1]));
    const lockMatch = url.pathname.match(/^\/api\/video\/rooms\/([^/]+)\/lock$/);
    if (lockMatch && request.method === 'POST') return await setRoomLock(request, env, headers, decodeURIComponent(lockMatch[1]));
    const waitingRoomMatch = url.pathname.match(/^\/api\/video\/rooms\/([^/]+)\/waiting-room$/);
    if (waitingRoomMatch && request.method === 'POST') return await setWaitingRoom(request, env, headers, decodeURIComponent(waitingRoomMatch[1]));
    const statusMatch = url.pathname.match(/^\/api\/video\/rooms\/([^/]+)\/status$/);
    if (statusMatch && request.method === 'GET') return await roomStatus(request, env, headers, decodeURIComponent(statusMatch[1]));
    const muteAllMatch = url.pathname.match(/^\/api\/video\/rooms\/([^/]+)\/mute-all$/);
    if (muteAllMatch && request.method === 'POST') return await muteAllParticipants(request, env, headers, decodeURIComponent(muteAllMatch[1]));
    const recordingStartMatch = url.pathname.match(/^\/api\/video\/rooms\/([^/]+)\/recording\/start$/);
    if (recordingStartMatch && request.method === 'POST') return await startRecording(request, env, headers, decodeURIComponent(recordingStartMatch[1]));
    const recordingStopMatch = url.pathname.match(/^\/api\/video\/rooms\/([^/]+)\/recording\/stop$/);
    if (recordingStopMatch && request.method === 'POST') return await stopRecording(request, env, headers, decodeURIComponent(recordingStopMatch[1]));
    const admitMatch = url.pathname.match(/^\/api\/video\/rooms\/([^/]+)\/participants\/([^/]+)\/admit$/);
    if (admitMatch && request.method === 'POST') return await admitParticipant(request, env, headers, decodeURIComponent(admitMatch[1]), decodeURIComponent(admitMatch[2]));
    const denyMatch = url.pathname.match(/^\/api\/video\/rooms\/([^/]+)\/participants\/([^/]+)\/deny$/);
    if (denyMatch && request.method === 'POST') return await denyParticipant(request, env, headers, decodeURIComponent(denyMatch[1]), decodeURIComponent(denyMatch[2]));
    const participantMatch = url.pathname.match(/^\/api\/video\/rooms\/([^/]+)\/participants\/([^/]+)$/);
    if (participantMatch && request.method === 'DELETE') return await removeParticipant(request, env, headers, decodeURIComponent(participantMatch[1]), decodeURIComponent(participantMatch[2]));
    const muteMatch = url.pathname.match(/^\/api\/video\/rooms\/([^/]+)\/participants\/([^/]+)\/mute$/);
    if (muteMatch && request.method === 'POST') return await muteParticipant(request, env, headers, decodeURIComponent(muteMatch[1]), decodeURIComponent(muteMatch[2]));
    if (url.pathname === '/api/video/broadcast/start' && request.method === 'POST') return await startBroadcast(request, env, headers);
    if (url.pathname === '/api/video/broadcast/stop' && request.method === 'POST') return await stopBroadcast(request, env, headers);
    return json({ error: 'Not found.' }, 404, headers);
  } catch (error) {
    console.error('[worker] LiveKit API error', error);
    return json({ error: error?.message || 'Video service unavailable.' }, 503, headers);
  }
}
