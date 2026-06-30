import { query } from '../db/index.js';

const toStory = (s) => ({
  id: s.id,
  tag: s.tag || '',
  title: s.title,
  subtitle: s.subtitle || '',
  imageUrl: s.image_url || '',
});

// GET /api/outreach-stories — newest first.
export const listStories = async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM outreach_stories ORDER BY id DESC`);
    return res.json({ stories: result.rows.map(toStory) });
  } catch (error) {
    console.error('[outreach-stories] list error', error);
    return res.status(500).json({ error: 'Unable to load outreach stories at this time.' });
  }
};

// POST /api/outreach-stories — create a new story.
export const createStory = async (req, res) => {
  const { tag, title, subtitle, imageUrl } = req.body || {};
  if (!title) {
    return res.status(400).json({ error: 'Title is required.' });
  }
  try {
    const result = await query(
      `INSERT INTO outreach_stories (tag, title, subtitle, image_url)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [tag || '', title, subtitle || '', imageUrl || '']
    );
    return res.status(201).json({ story: toStory(result.rows[0]) });
  } catch (error) {
    console.error('[outreach-stories] create error', error);
    return res.status(500).json({ error: 'Unable to create story right now.' });
  }
};

// PUT /api/outreach-stories/:id — update an existing story.
export const updateStory = async (req, res) => {
  const { id } = req.params;
  const { tag, title, subtitle, imageUrl } = req.body || {};
  if (!title) {
    return res.status(400).json({ error: 'Title is required.' });
  }
  try {
    const result = await query(
      `UPDATE outreach_stories
         SET tag = $1, title = $2, subtitle = $3, image_url = $4
       WHERE id = $5
       RETURNING *`,
      [tag || '', title, subtitle || '', imageUrl || '', id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Story not found.' });
    return res.json({ story: toStory(result.rows[0]) });
  } catch (error) {
    console.error('[outreach-stories] update error', error);
    return res.status(500).json({ error: 'Unable to update story right now.' });
  }
};

// DELETE /api/outreach-stories/:id — remove a story.
export const deleteStory = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(`DELETE FROM outreach_stories WHERE id = $1 RETURNING id`, [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Story not found.' });
    return res.json({ deleted: true });
  } catch (error) {
    console.error('[outreach-stories] delete error', error);
    return res.status(500).json({ error: 'Unable to delete story right now.' });
  }
};
