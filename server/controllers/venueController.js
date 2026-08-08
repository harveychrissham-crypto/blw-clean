import { query } from '../db/index.js';

const toVenue = (v) => ({
  id: v.id,
  chapter: v.chapter,
  venue: v.venue,
  serviceTime: v.service_time || '',
  updatedAt: v.updated_at,
});

// GET /api/venues — every chapter's venue, for the admin panel and lookups.
export const listVenues = async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM chapter_venues ORDER BY chapter ASC`);
    return res.json({ venues: result.rows.map(toVenue) });
  } catch (error) {
    console.error('[venues] list error', error);
    return res.status(500).json({ error: 'Unable to load service venues at this time.' });
  }
};

// GET /api/venues/:chapter — the venue for one chapter (used by the dashboard).
export const getVenueByChapter = async (req, res) => {
  const { chapter } = req.params;
  try {
    const result = await query(
      `SELECT * FROM chapter_venues WHERE LOWER(chapter) = LOWER($1) LIMIT 1`,
      [chapter]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'No venue set for this chapter yet.' });
    return res.json({ venue: toVenue(result.rows[0]) });
  } catch (error) {
    console.error('[venues] get error', error);
    return res.status(500).json({ error: 'Unable to load service venue at this time.' });
  }
};

// PUT /api/venues/:chapter — create or update the venue for a chapter.
// Upsert on the unique `chapter` column so admins can just re-save to edit.
export const upsertVenue = async (req, res) => {
  const { chapter } = req.params;
  const { venue, serviceTime } = req.body || {};

  if (!chapter || !venue) {
    return res.status(400).json({ error: 'Chapter and venue are required.' });
  }

  try {
    const result = await query(
      `INSERT INTO chapter_venues (chapter, venue, service_time, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (chapter)
       DO UPDATE SET venue = EXCLUDED.venue, service_time = EXCLUDED.service_time, updated_at = NOW()
       RETURNING *`,
      [chapter, venue, serviceTime || '']
    );
    return res.json({ venue: toVenue(result.rows[0]) });
  } catch (error) {
    console.error('[venues] upsert error', error);
    return res.status(500).json({ error: 'Unable to save service venue right now.' });
  }
};

// DELETE /api/venues/:chapter — remove a chapter's venue override.
export const deleteVenue = async (req, res) => {
  const { chapter } = req.params;
  try {
    const result = await query(
      `DELETE FROM chapter_venues WHERE LOWER(chapter) = LOWER($1) RETURNING id`,
      [chapter]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'No venue set for this chapter.' });
    return res.json({ deleted: true });
  } catch (error) {
    console.error('[venues] delete error', error);
    return res.status(500).json({ error: 'Unable to delete service venue right now.' });
  }
};
