import { query } from '../db/index.js';

// Pulls the 11-char video ID out of any common YouTube URL shape:
// watch?v=, youtu.be/, /embed/, /shorts/, /live/. Returns null if it doesn't match.
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

// Loose sanity check for a Google Meet link — doesn't need to be as strict
// as the YouTube ID extraction since we only ever open it in a new tab,
// never embed it.
const isLikelyMeetUrl = (url) =>
  typeof url === 'string' && /^https:\/\/meet\.google\.com\/[a-z0-9-]+/i.test(url.trim());

const toLiveStream = (row) => ({
  title: row.title || '',
  youtubeUrl: row.youtube_url || '',
  youtubeId: extractYouTubeId(row.youtube_url),
  googleMeetUrl: row.google_meet_url || '',
  isLive: row.is_live || false,
  updatedAt: row.updated_at,
});

// GET /api/live — public: current live stream settings.
export const getLiveStream = async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM live_stream WHERE id = 1`);
    if (!result.rows.length) {
      return res.json({
        live: { title: '', youtubeUrl: '', youtubeId: null, googleMeetUrl: '', isLive: false, updatedAt: null },
      });
    }
    return res.json({ live: toLiveStream(result.rows[0]) });
  } catch (error) {
    console.error('[live] get error', error);
    return res.status(500).json({ error: 'Unable to load live stream info at this time.' });
  }
};

// PUT /api/live — leader tool: set the stream/meet links + title and toggle live on/off.
export const updateLiveStream = async (req, res) => {
  const { title, youtubeUrl, googleMeetUrl, isLive } = req.body || {};

  const hasYoutube = !!extractYouTubeId(youtubeUrl);
  const hasMeet = !!(googleMeetUrl && googleMeetUrl.trim());

  if (youtubeUrl && !hasYoutube) {
    return res.status(400).json({ error: 'That does not look like a valid YouTube URL.' });
  }
  if (googleMeetUrl && !isLikelyMeetUrl(googleMeetUrl)) {
    return res.status(400).json({ error: 'That does not look like a valid Google Meet link (should look like https://meet.google.com/xxx-xxxx-xxx).' });
  }
  if (isLive && !hasYoutube && !hasMeet) {
    return res.status(400).json({ error: 'Add a YouTube link or a Google Meet link before going live.' });
  }

  try {
    const result = await query(
      `UPDATE live_stream
         SET title = $1, youtube_url = $2, google_meet_url = $3, is_live = $4, updated_at = NOW()
       WHERE id = 1
       RETURNING *`,
      [title || '', youtubeUrl || '', googleMeetUrl || '', !!isLive]
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
});

// POST /api/live/viewers — public: optional "who's watching" sign-in from the
// Live page popup. Never blocks access to the stream — this just logs it.
export const recordLiveViewer = async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 120) : '';
  const invitedBy = typeof req.body?.invitedBy === 'string' ? req.body.invitedBy.trim().slice(0, 120) : '';

  if (!name) {
    return res.status(400).json({ error: 'Name is required.' });
  }

  try {
    const result = await query(
      `INSERT INTO live_viewers (name, invited_by) VALUES ($1, $2) RETURNING *`,
      [name, invitedBy]
    );
    return res.status(201).json({ viewer: toViewer(result.rows[0]) });
  } catch (error) {
    console.error('[live] record viewer error', error);
    return res.status(500).json({ error: 'Unable to save that right now.' });
  }
};

// GET /api/live/viewers — leader tool: see who has signed in to watch live.
export const listLiveViewers = async (_req, res) => {
  try {
    const result = await query(
      `SELECT * FROM live_viewers ORDER BY created_at DESC LIMIT 500`
    );
    return res.json({ viewers: result.rows.map(toViewer) });
  } catch (error) {
    console.error('[live] list viewers error', error);
    return res.status(500).json({ error: 'Unable to load viewers right now.' });
  }
};
