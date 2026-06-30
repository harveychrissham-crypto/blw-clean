import { query } from '../db/index.js';

const toEvent = (e) => ({
  id: e.id,
  title: e.title,
  category: e.category,
  date: e.event_date?.toISOString().slice(0, 10) || '',
  time: e.event_time || '',
  location: e.location || '',
  description: e.description || '',
});

// GET /api/events — all events, soonest first.
export const listEvents = async (_req, res) => {
  try {
    const result = await query(`SELECT * FROM events ORDER BY event_date ASC, id ASC`);
    return res.json({ events: result.rows.map(toEvent) });
  } catch (error) {
    console.error('[events] list error', error);
    return res.status(500).json({ error: 'Unable to load events at this time.' });
  }
};

// POST /api/events — create a new event.
export const createEvent = async (req, res) => {
  const { title, category, date, time, location, description } = req.body || {};
  if (!title || !date) {
    return res.status(400).json({ error: 'Title and date are required.' });
  }
  try {
    const result = await query(
      `INSERT INTO events (title, category, event_date, event_time, location, description)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [title, category || 'General', date, time || '', location || '', description || '']
    );
    return res.status(201).json({ event: toEvent(result.rows[0]) });
  } catch (error) {
    console.error('[events] create error', error);
    return res.status(500).json({ error: 'Unable to create event right now.' });
  }
};

// PUT /api/events/:id — update an existing event.
export const updateEvent = async (req, res) => {
  const { id } = req.params;
  const { title, category, date, time, location, description } = req.body || {};
  if (!title || !date) {
    return res.status(400).json({ error: 'Title and date are required.' });
  }
  try {
    const result = await query(
      `UPDATE events
         SET title = $1, category = $2, event_date = $3, event_time = $4, location = $5, description = $6
       WHERE id = $7
       RETURNING *`,
      [title, category || 'General', date, time || '', location || '', description || '', id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Event not found.' });
    return res.json({ event: toEvent(result.rows[0]) });
  } catch (error) {
    console.error('[events] update error', error);
    return res.status(500).json({ error: 'Unable to update event right now.' });
  }
};

// DELETE /api/events/:id — remove an event.
export const deleteEvent = async (req, res) => {
  const { id } = req.params;
  try {
    const result = await query(`DELETE FROM events WHERE id = $1 RETURNING id`, [id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Event not found.' });
    return res.json({ deleted: true });
  } catch (error) {
    console.error('[events] delete error', error);
    return res.status(500).json({ error: 'Unable to delete event right now.' });
  }
};
