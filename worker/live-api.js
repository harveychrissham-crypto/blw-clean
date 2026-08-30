import { corsHeaders } from './security.js';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
});

async function db(env, fn) {
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || '';
  if (!connectionString) throw new Error('Database connection is not configured.');
  const { Client } = await import('pg');
  const client = new Client({ connectionString });
  await client.connect();
  try { return await fn(client); } finally { await client.end().catch(() => {}); }
}

async function ensureLiveTables(client) {
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
  await client.query(`CREATE TABLE IF NOT EXISTS live_viewers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    invited_by TEXT NOT NULL DEFAULT '',
    client_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    visit_count INTEGER NOT NULL DEFAULT 1,
    watch_seconds INTEGER NOT NULL DEFAULT 0
  )`);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS live_viewers_client_id_idx ON live_viewers (client_id) WHERE client_id IS NOT NULL`);
}

const youtubeId = (value) => {
  if (typeof value !== 'string') return null;
  const m = value.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
};

const liveDto = (row) => ({
  title: row.title || '',
  youtubeUrl: row.youtube_url || '',
  youtubeId: youtubeId(row.youtube_url),
  googleMeetUrl: row.google_meet_url || '',
  dailyRoomUrl: row.daily_room_url || '',
  hlsPlaybackUrl: row.hls_playback_url || '',
  liveKitRoom: row.livekit_room || '',
  liveKitEgressId: row.livekit_egress_id || '',
  isLive: !!row.is_live,
  updatedAt: row.updated_at,
});

const viewerDto = (row) => ({
  id: row.id,
  name: row.name,
  invitedBy: row.invited_by || '',
  createdAt: row.created_at,
  lastSeenAt: row.last_seen_at,
  visitCount: row.visit_count || 1,
  watchSeconds: row.watch_seconds || 0,
});

export async function handleLive(request, env, url) {
  if (!url.pathname.startsWith('/api/live')) return null;
  const headers = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  try {
    const result = await db(env, async (client) => {
      await ensureLiveTables(client);

      if (url.pathname === '/api/live' && request.method === 'GET') {
        const r = await client.query('SELECT * FROM live_stream WHERE id = 1');
        return { status: 200, body: { live: liveDto(r.rows[0]) } };
      }

      if (url.pathname === '/api/live' && request.method === 'PUT') {
        const body = await request.json().catch(() => null);
        if (!body) return { status: 400, body: { error: 'Invalid JSON request body.' } };
        const youtubeUrl = typeof body.youtubeUrl === 'string' ? body.youtubeUrl.trim() : '';
        const googleMeetUrl = typeof body.googleMeetUrl === 'string' ? body.googleMeetUrl.trim() : '';
        const dailyRoomUrl = typeof body.dailyRoomUrl === 'string' ? body.dailyRoomUrl.trim() : '';
        if (youtubeUrl && !youtubeId(youtubeUrl)) return { status: 400, body: { error: 'Invalid YouTube URL.' } };
        if (googleMeetUrl && !/^https:\/\/meet\.google\.com\/[a-z0-9-]+/i.test(googleMeetUrl)) return { status: 400, body: { error: 'Invalid Google Meet URL.' } };
        if (body.isLive && !youtubeUrl && !googleMeetUrl && !dailyRoomUrl) return { status: 400, body: { error: 'Add a YouTube, Google Meet, or Daily link before going live.' } };
        const r = await client.query(
          `UPDATE live_stream SET title=$1,youtube_url=$2,google_meet_url=$3,daily_room_url=$4,is_live=$5,updated_at=NOW() WHERE id=1 RETURNING *`,
          [body.title || '', youtubeUrl, googleMeetUrl, dailyRoomUrl, !!body.isLive]
        );
        return { status: 200, body: { live: liveDto(r.rows[0]) } };
      }

      if (url.pathname === '/api/live/viewers' && request.method === 'GET') {
        const r = await client.query('SELECT * FROM live_viewers ORDER BY last_seen_at DESC LIMIT 500');
        return { status: 200, body: { viewers: r.rows.map(viewerDto) } };
      }

      if (url.pathname === '/api/live/viewers' && request.method === 'POST') {
        const body = await request.json().catch(() => null);
        const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 120) : '';
        const invitedBy = typeof body?.invitedBy === 'string' ? body.invitedBy.trim().slice(0, 120) : '';
        const clientId = typeof body?.clientId === 'string' ? body.clientId.trim().slice(0, 64) : '';
        if (!name) return { status: 400, body: { error: 'Name is required.' } };
        const r = clientId
          ? await client.query(
              `INSERT INTO live_viewers (name,invited_by,client_id,last_seen_at,visit_count)
               VALUES ($1,$2,$3,NOW(),1)
               ON CONFLICT (client_id) DO UPDATE SET
                 name=EXCLUDED.name,
                 invited_by=CASE WHEN EXCLUDED.invited_by<>'' THEN EXCLUDED.invited_by ELSE live_viewers.invited_by END,
                 last_seen_at=NOW(),
                 visit_count=live_viewers.visit_count+1
               RETURNING *`,
              [name, invitedBy, clientId]
            )
          : await client.query('INSERT INTO live_viewers (name,invited_by) VALUES ($1,$2) RETURNING *', [name, invitedBy]);
        return { status: 201, body: { viewer: viewerDto(r.rows[0]) } };
      }

      if (url.pathname === '/api/live/viewers/heartbeat' && request.method === 'PATCH') {
        const body = await request.json().catch(() => null);
        const clientId = typeof body?.clientId === 'string' ? body.clientId.trim().slice(0, 64) : '';
        const seconds = Number(body?.seconds);
        if (!clientId || !Number.isFinite(seconds) || seconds <= 0) return { status: 400, body: { error: 'Invalid heartbeat.' } };
        const r = await client.query(
          'UPDATE live_viewers SET watch_seconds=watch_seconds+$1,last_seen_at=NOW() WHERE client_id=$2 RETURNING *',
          [Math.min(Math.round(seconds), 300), clientId]
        );
        if (!r.rows.length) return { status: 204, body: null };
        return { status: 200, body: { viewer: viewerDto(r.rows[0]) } };
      }

      return { status: 405, body: { error: 'Method not allowed.' } };
    });

    if (result.status === 204) return new Response(null, { status: 204, headers });
    return json(result.body, result.status, headers);
  } catch (error) {
    console.error('[worker] live API failed', error);
    return json({ error: 'Unable to access the live service right now.' }, 503, headers);
  }
}
