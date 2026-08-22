import { query } from '../db/index.js';

const MEMBER_FIELDS = `
  u.full_name, u.email, u.phone, u.campus_zone, u.chapter, u.status, u.badge,
  u.membership_id, u.joined_date, u.country, u.residence, u.birthday, u.gender,
  u.invited_by
`;

const CURRENT_CHECKIN_JOIN = `
  LEFT JOIN checkins c
    ON c.membership_id = u.membership_id
   AND c.attendance_date = ((NOW() AT TIME ZONE 'Africa/Nairobi')::date)
   AND c.event_id IS NULL
`;

const toMember = (m) => ({
  name: m.full_name,
  email: m.email,
  phone: m.phone,
  campusZone: m.campus_zone,
  chapter: m.chapter,
  status: m.status,
  badge: m.badge,
  membershipId: m.membership_id,
  joinDate: m.joined_date?.toISOString().slice(0, 10) || '',
  country: m.country || '',
  residence: m.residence || '',
  birthday: m.birthday instanceof Date ? m.birthday.toISOString().slice(0, 10) : (m.birthday || ''),
  gender: m.gender || '',
  invitedBy: m.invited_by || '',
  checkedIn: Boolean(m.checkin_id),
  checkedInAt: m.checkin_at ? new Date(m.checkin_at).toISOString() : null,
  checkedInBy: m.checkin_by || null,
});

const SELECT_WITH_CHECKIN = `
  ${MEMBER_FIELDS},
  c.id AS checkin_id,
  c.checked_in_at AS checkin_at,
  c.checked_in_by AS checkin_by
  FROM users u
  ${CURRENT_CHECKIN_JOIN}
`;

// GET /api/members — list all members, with today's attendance state only.
export const listMembers = async (_req, res) => {
  try {
    const result = await query(
      `SELECT ${SELECT_WITH_CHECKIN} ORDER BY u.created_at DESC`
    );
    return res.json({ members: result.rows.map(toMember) });
  } catch (error) {
    console.error('[member] list error', error);
    return res.status(500).json({ error: 'Unable to load members at this time.' });
  }
};

// GET /api/members/search?q=... — read-only fuzzy search across ID, name, email, phone.
// Searching or scanning a membership ID never performs a check-in.
export const searchMembers = async (req, res) => {
  const rawQuery = String(req.query.q || '').trim();
  if (!rawQuery) {
    return res.status(400).json({ error: 'Please provide a name, member ID, email, or phone to search.' });
  }

  const normalized = rawQuery.toLowerCase();
  const digitsOnly = rawQuery.replace(/[\s\-()]/g, '');
  const likeValue = `%${normalized}%`;

  try {
    const result = await query(
      `SELECT ${SELECT_WITH_CHECKIN}
       WHERE LOWER(u.membership_id) LIKE $1
          OR LOWER(u.full_name) LIKE $1
          OR LOWER(u.email) LIKE $1
          OR REPLACE(u.phone, ' ', '') LIKE '%' || $2 || '%'
       ORDER BY
         (LOWER(u.membership_id) = $3 OR LOWER(u.full_name) = $3 OR LOWER(u.email) = $3) DESC,
         u.full_name ASC
       LIMIT 8`,
      [likeValue, digitsOnly, normalized]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: `No member found matching "${rawQuery}".` });
    }

    return res.json({ members: result.rows.map(toMember), checkedIn: false });
  } catch (error) {
    console.error('[member] search error', error);
    return res.status(500).json({ error: 'Unable to search members at this time.' });
  }
};

// POST /api/members/:membershipId/checkin — explicit daily check-in.
// The authenticated leader's email is stored in checked_in_by for auditability.
export const checkInMember = async (req, res) => {
  const { membershipId } = req.params;
  const eventId = req.body?.eventId ? Number(req.body.eventId) : null;
  const checkedInBy = typeof req.user?.email === 'string' ? req.user.email.trim().toLowerCase() : null;

  if (eventId !== null && (!Number.isInteger(eventId) || eventId <= 0)) {
    return res.status(400).json({ error: 'Invalid event ID.' });
  }

  try {
    const memberResult = await query(
      `SELECT ${MEMBER_FIELDS.replace(/u\./g, '')} FROM users u WHERE u.membership_id = $1 LIMIT 1`,
      [membershipId]
    );

    if (!memberResult.rows.length) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    const existingResult = await query(
      `SELECT id, checked_in_at, checked_in_by
       FROM checkins
       WHERE membership_id = $1
         AND attendance_date = ((NOW() AT TIME ZONE 'Africa/Nairobi')::date)
         AND COALESCE(event_id, 0) = COALESCE($2, 0)
       LIMIT 1`,
      [membershipId, eventId]
    );

    if (existingResult.rows.length) {
      const existing = existingResult.rows[0];
      return res.json({
        member: toMember({
          ...memberResult.rows[0],
          checkin_id: existing.id,
          checkin_at: existing.checked_in_at,
          checkin_by: existing.checked_in_by,
        }),
        alreadyCheckedIn: true,
      });
    }

    let checkinResult;
    try {
      checkinResult = await query(
        `INSERT INTO checkins (membership_id, attendance_date, event_id, checked_in_at, checked_in_by)
         VALUES ($1, ((NOW() AT TIME ZONE 'Africa/Nairobi')::date), $2, NOW(), $3)
         RETURNING id, checked_in_at, checked_in_by`,
        [membershipId, eventId, checkedInBy]
      );
    } catch (error) {
      if (error?.code !== '23505') throw error;
      checkinResult = await query(
        `SELECT id, checked_in_at, checked_in_by
         FROM checkins
         WHERE membership_id = $1
           AND attendance_date = ((NOW() AT TIME ZONE 'Africa/Nairobi')::date)
           AND COALESCE(event_id, 0) = COALESCE($2, 0)
         LIMIT 1`,
        [membershipId, eventId]
      );
      return res.json({
        member: toMember({
          ...memberResult.rows[0],
          checkin_id: checkinResult.rows[0]?.id,
          checkin_at: checkinResult.rows[0]?.checked_in_at,
          checkin_by: checkinResult.rows[0]?.checked_in_by,
        }),
        alreadyCheckedIn: true,
      });
    }

    const inserted = checkinResult.rows[0];
    return res.json({
      member: toMember({
        ...memberResult.rows[0],
        checkin_id: inserted.id,
        checkin_at: inserted.checked_in_at,
        checkin_by: inserted.checked_in_by,
      }),
      alreadyCheckedIn: false,
    });
  } catch (error) {
    console.error('[member] check-in error', error);
    return res.status(500).json({ error: 'Unable to check in this member right now.' });
  }
};
