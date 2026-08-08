import { query } from '../db/index.js';

// Pulls the 11-char video ID out of any common YouTube URL shape:
// watch?v=, youtu.be/, /embed/, /shorts/. Returns null if it doesn't match.
const extractYouTubeId = (url) => {
  if (typeof url !== 'string') return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const toSermon = (s) => ({
  id: s.id,
  title: s.title,
  speaker: s.speaker || '',
  description: s.description || '',
  youtubeUrl: s.youtube_url,
  youtubeId: extractYouTubeId(s.youtube_url),
  isFeatured: s.is_featured || false,
  createdAt: s.created_at,
});

// GET /api/sermons — newest first.
export const listSermons = async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM sermons ORDER BY created_at DESC, id DESC`);
    return res.json({ sermons: result.rows.map(toSermon) });
  } catch (error) {
    console.error('[sermons] list error', error);
    return res.status(500).json({ error: 'Unable to load sermons at this time.' });
  }
};

// POST /api/sermons — add a new sermon video.
export const createSermon = async (req, res) => {
  const { title, speaker, description, youtubeUrl } = req.body || {};
  if (!title || !youtubeUrl) {
    return res.status(400).json({ error: 'Title and YouTube URL are required.' });
  }
  if (!extractYouTubeId(youtubeUrl)) {
    return res.status(400).json({ error: 'That does not look like a valid YouTube URL.' });
  }
  try {
    const result = await query(
      `INSERT INTO sermons (title, speaker, description, youtube_url)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title, speaker || '', description || '', youtubeUrl]
    );
    return res.status(201).json({ sermon: toSermon(result.rows[0]) });
  } catch (error) {
    console.error('[sermons] create error', error);
    return res.status(500).json({ error: 'Unable to add sermon right now.' });
  }
};

// PUT /api/sermons/:id — update an existing sermon video.
export const updateSermon = async (req, res) => {
  const { id } = req.params;
  const { title, speaker, description, youtubeUrl } = req.body || {};
  if (!title || !youtubeUrl) {
    return res.status(400).json({ error: 'Title and YouTube URL are required.' });
  }
  if (!extractYouTubeId(youtubeUrl)) {
    return res.status(400).json({ error: 'That does not look like a valid YouTube URL.' });
  }
  try {
    const result = await query(
      `UPDATE sermons
         SET title = $1, speaker = $2, description = $3, youtube_url = $4
       WHERE id = $5
       RETURNING *`,
      [title, speaker || '', description || '', youtubeUrl, id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Sermon not found.' });
    return res.json({ sermon: toSermon(result.rows[0]) });
  } catch (error) {
    console.error('[sermons] update error', error);
    return res.status(500).json({ error: 'Unable to update sermon right now.' });
  }
};

// DELETE /api/sermons/:id — remove a sermon video.
export const deleteSermon = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(`DELETE FROM sermons WHERE id = $1 RETURNING id`, [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Sermon not found.' });
    return res.json({ deleted: true });
  } catch (error) {
    console.error('[sermons] delete error', error);
    return res.status(500).json({ error: 'Unable to delete sermon right now.' });
  }
};

// PUT /api/sermons/:id/feature — mark this sermon as the main/featured video.
// Only one sermon can be featured at a time, so every other row gets unset first.
export const setFeaturedSermon = async (req, res) => {
  const { id } = req.params;
  try {
    await query(`UPDATE sermons SET is_featured = FALSE WHERE is_featured = TRUE`);
    const result = await query(
      `UPDATE sermons SET is_featured = TRUE WHERE id = $1 RETURNING *`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Sermon not found.' });
    return res.json({ sermon: toSermon(result.rows[0]) });
  } catch (error) {
    console.error('[sermons] set featured error', error);
    return res.status(500).json({ error: 'Unable to set featured sermon right now.' });
  }
};
