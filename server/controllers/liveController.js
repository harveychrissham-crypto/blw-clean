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

const toLiveStream = (row) => ({
  title: row.title || '',
  youtubeUrl: row.youtube_url || '',
  youtubeId: extractYouTubeId(row.youtube_url),
  isLive: row.is_live || false,
  updatedAt: row.updated_at,
});

// GET /api/live — public: current live stream settings.
export const getLiveStream = async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM live_stream WHERE id = 1`);
    if (!result.rows.length) {
      return res.json({ live: { title: '', youtubeUrl: '', youtubeId: null, isLive: false, updatedAt: null } });
    }
    return res.json({ live: toLiveStream(result.rows[0]) });
  } catch (error) {
    console.error('[live] get error', error);
    return res.status(500).json({ error: 'Unable to load live stream info at this time.' });
  }
};

// PUT /api/live — leader tool: set the stream URL/title and toggle live on/off.
export const updateLiveStream = async (req, res) => {
  const { title, youtubeUrl, isLive } = req.body || {};

  if (isLive && !extractYouTubeId(youtubeUrl)) {
    return res.status(400).json({ error: 'A valid YouTube URL is required to go live.' });
  }
  if (youtubeUrl && !extractYouTubeId(youtubeUrl)) {
    return res.status(400).json({ error: 'That does not look like a valid YouTube URL.' });
  }

  try {
    const result = await query(
      `UPDATE live_stream
         SET title = $1, youtube_url = $2, is_live = $3, updated_at = NOW()
       WHERE id = 1
       RETURNING *`,
      [title || '', youtubeUrl || '', !!isLive]
    );
    return res.json({ live: toLiveStream(result.rows[0]) });
  } catch (error) {
    console.error('[live] update error', error);
    return res.status(500).json({ error: 'Unable to update live stream right now.' });
  }
};
