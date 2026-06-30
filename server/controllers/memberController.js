import { query } from '../db/index.js';

const SELECT_FIELDS = `
  full_name, email, phone, campus_zone, chapter, status, badge,
  membership_id, joined_date, country, residence, birthday, gender,
  invited_by, checked_in, checked_in_at
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
  checkedIn: !!m.checked_in,
  checkedInAt: m.checked_in_at ? new Date(m.checked_in_at).toISOString() : null,
});

// GET /api/members — list all members, most recently joined first.
// Used by the Leaders Forum directory and the "All members" quick list.
export const listMembers = async (_req, res) => {
  try {
    const result = await query(
      `SELECT ${SELECT_FIELDS} FROM users ORDER BY created_at DESC`
    );
    return res.json({ members: result.rows.map(toMember) });
  } catch (error) {
    console.error('[member] list error', error);
    return res.status(500).json({ error: 'Unable to load members at this time.' });
  }
};

// GET /api/members/search?q=... — fuzzy search across ID, name, email, phone.
// Returns up to 8 matches, ranked exact-match-first, for autocomplete/lookup.
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
      `SELECT ${SELECT_FIELDS} FROM users
       WHERE LOWER(membership_id) LIKE $1
          OR LOWER(full_name) LIKE $1
          OR LOWER(email) LIKE $1
          OR REPLACE(phone, ' ', '') LIKE '%' || $2 || '%'
       ORDER BY
         (LOWER(membership_id) = $3 OR LOWER(full_name) = $3 OR LOWER(email) = $3) DESC,
         full_name ASC
       LIMIT 8`,
      [likeValue, digitsOnly, normalized]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: `No member found matching "${rawQuery}".` });
    }

    return res.json({ members: result.rows.map(toMember) });
  } catch (error) {
    console.error('[member] search error', error);
    return res.status(500).json({ error: 'Unable to search members at this time.' });
  }
};

// POST /api/members/:membershipId/checkin — mark a member as checked in.
export const checkInMember = async (req, res) => {
  const { membershipId } = req.params;

  try {
    const result = await query(
      `UPDATE users
         SET checked_in = TRUE, checked_in_at = NOW()
       WHERE membership_id = $1
       RETURNING ${SELECT_FIELDS}`,
      [membershipId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    return res.json({ member: toMember(result.rows[0]) });
  } catch (error) {
    console.error('[member] check-in error', error);
    return res.status(500).json({ error: 'Unable to check in this member right now.' });
  }
};
