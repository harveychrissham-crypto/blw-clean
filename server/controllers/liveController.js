import { query } from '../db/index.js';

const extractYouTubeId = (url) => {
  if (typeof url !== 'string') return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/live\/)([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const isLikelyMeetUrl = (url) =>
  typeof url === 'string' && /^https:\/\/meet\.google\.com\/[a-z0-9-]+/i.test(url.trim());

const isLikelyDailyUrl = (url) =>
  typeof url === 'string' && /^https:\/\/[a-z0-9-]+\.daily\.co\/[a-z0-9-]+/i.test(url.trim());

const ensureLiveViewersTable = async () => {
  await query(`CREATE TABLE IF NOT EXISTS live_viewers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    invited_by TEXT NOT NULL DEFAULT '',
    client_id TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    visit_count INTEGER NOT NULL DEFAULT 1,
    watch_seconds INTEGER NOT NULL DEFAULT 0
  )`);
  await query(`ALTER TABLE live_viewers ADD COLUMN IF NOT EXISTS client_id TEXT`);
  await query(`ALTER TABLE live_viewers ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()`);
  await query(`ALTER TABLE live_viewers ADD COLUMN IF NOT EXISTS visit_count INTEGER NOT NULL DEFAULT 1`);
  await query(`ALTER TABLE live_viewers ADD COLUMN IF NOT EXISTS watch_seconds INTEGER NOT NULL DEFAULT 0`);
  await query(`CREATE UNIQUE INDEX IF NOT EXISTS live_viewers_client_id_unique ON live_viewers (client_id) WHERE client_id IS NOT NULL`);
};

const toLiveStream = (row) => ({
  title: row.title || '',
  youtubeUrl: row.youtube_url || '',
  youtubeId: extractYouTubeId(row.youtube_url),
  googleMeetUrl: row.google_meet_url || '',
  dailyRoomUrl: row.daily_room_url || '',
  isLive: row.is_live || false,
  updatedAt: row.updated_at,
});

export const getLiveStream = async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM live_stream WHERE id = 1`);
    if (!result.rows.length) {
      return res.json({
        live: { title: '', youtubeUrl: '', youtubeId: null, googleMeetUrl: '', dailyRoomUrl: '', isLive: false, updatedAt: null },
      });
    }
    return res.json({ live: toLiveStream(result.rows[0]) });
  } catch (error) {
    console.error('[live] get error', error);
    return res.status(500).json({ error: 'Unable to load live stream info at this time.' });
  }
};

export const updateLiveStream = async (req, res) => {
  const { title, youtubeUrl, googleMeetUrl, dailyRoomUrl, isLive } = req.body || {};
  const hasYoutube = !!extractYouTubeId(youtubeUrl);
  const hasMeet = !!(googleMeetUrl && googleMeetUrl.trim());
  const hasDaily = !!(dailyRoomUrl && dailyRoomUrl.trim());

  if (youtubeUrl && !hasYoutube) return res.status(400).json({ error: 'That does not look like a valid YouTube URL.' });
  if (googleMeetUrl && !isLikelyMeetUrl(googleMeetUrl)) return res.status(400).json({ error: 'That does not look like a valid Google Meet link (should look like https://meet.google.com/xxx-xxxx-xxx).' });
  if (dailyRoomUrl && !isLikelyDailyUrl(dailyRoomUrl)) return res.status(400).json({ error: 'That does not look like a valid Daily room URL (should look like https://yourdomain.daily.co/room-name).' });
  if (isLive && !hasYoutube && !hasMeet && !hasDaily) return res.status(400).json({ error: 'Add a YouTube link, a Daily room, or a Google Meet link before going live.' });

  try {
    const result = await query(
      `UPDATE live_stream SET title = $1, youtube_url = $2, google_meet_url = $3, daily_room_url = $4, is_live = $5, updated_at = NOW() WHERE id = 1 RETURNING *`,
      [title || '', youtubeUrl || '', googleMeetUrl || '', dailyRoomUrl || '', !!isLive]
    );
    return res.json({ live: toLiveStream(result.rows[0]) });
  } catch (error) {
    console.error('[live] update error', error);
    return res.status(500).json({ error: 'Unable to update live stream right now.' });
  }
};

const toViewer = (row) => ({
  id: row.id,
  name: row.name,
  invitedBy: row.invited_by || '',
  createdAt: row.created_at,
  lastSeenAt: row.last_seen_at,
  visitCount: row.visit_count || 1,
  watchSeconds: row.watch_seconds || 0,
});

export const recordLiveViewer = async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 120) : '';
  const invitedBy = typeof req.body?.invitedBy === 'string' ? req.body.invitedBy.trim().slice(0, 120) : '';
  const clientId = typeof req.body?.clientId === 'string' ? req.body.clientId.trim().slice(0, 64) : '';
  if (!name) return res.status(400).json({ error: 'Name is required.' });

  try {
    await ensureLiveViewersTable();
    let result;
    if (clientId) {
      result = await query(
        `INSERT INTO live_viewers (name, invited_by, client_id, last_seen_at, visit_count)
         VALUES ($1, $2, $3, NOW(), 1)
         ON CONFLICT (client_id) DO UPDATE
           SET name = EXCLUDED.name,
               invited_by = CASE WHEN EXCLUDED.invited_by <> '' THEN EXCLUDED.invited_by ELSE live_viewers.invited_by END,
               last_seen_at = NOW(),
               visit_count = live_viewers.visit_count + 1
         RETURNING *`,
        [name, invitedBy, clientId]
      );
    } else {
      result = await query(`INSERT INTO live_viewers (name, invited_by) VALUES ($1, $2) RETURNING *`, [name, invitedBy]);
    }
    return res.status(201).json({ viewer: toViewer(result.rows[0]) });
  } catch (error) {
    console.error('[live] record viewer error', error);
    return res.status(500).json({ error: 'Unable to save that right now.' });
  }
};

export const recordViewerHeartbeat = async (req, res) => {
  const clientId = typeof req.body?.clientId === 'string' ? req.body.clientId.trim().slice(0, 64) : '';
  const seconds = Number(req.body?.seconds);
  if (!clientId || !Number.isFinite(seconds) || seconds <= 0) return res.status(400).json({ error: 'Invalid heartbeat.' });
  const delta = Math.min(seconds, 300);

  try {
    await ensureLiveViewersTable();
    const result = await query(
      `UPDATE live_viewers SET watch_seconds = watch_seconds + $1, last_seen_at = NOW() WHERE client_id = $2 RETURNING *`,
      [Math.round(delta), clientId]
    );
    if (!result.rows.length) return res.status(204).end();
    return res.json({ viewer: toViewer(result.rows[0]) });
  } catch (error) {
    console.error('[live] heartbeat error', error);
    return res.status(500).json({ error: 'Unable to record watch time right now.' });
  }
};

export const listLiveViewers = async (_req, res) => {
  try {
    await ensureLiveViewersTable();
    const result = await query(`SELECT * FROM live_viewers ORDER BY last_seen_at DESC LIMIT 500`);
    return res.json({ viewers: result.rows.map(toViewer) });
  } catch (error) {
    console.error('[live] list viewers error', error);
    return res.status(500).json({ error: 'Unable to load viewers right now.' });
  }
};
