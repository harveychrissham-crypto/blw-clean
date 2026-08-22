import jwt from 'jsonwebtoken';
import { corsHeaders } from './security.js';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', ...headers },
});

const bearerToken = (request) => {
  const header = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
};

async function authEmail(request, env) {
  const token = bearerToken(request);
  const secret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';
  if (!token || !secret) return '';
  try {
    const payload = jwt.verify(token, secret);
    return typeof payload?.user?.email === 'string' ? payload.user.email.trim().toLowerCase() : '';
  } catch {
    return '';
  }
}

async function requireAdmin(client, request, env) {
  const email = await authEmail(request, env);
  if (!email) return '';
  const result = await client.query('SELECT is_admin FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1', [email]);
  return result.rows[0]?.is_admin === true ? email : '';
}

async function db(env, fn) {
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || '';
  if (!connectionString) throw new Error('Database connection is not configured.');
  const { Client } = await import('pg');
  const client = new Client({ connectionString });
  await client.connect();
  try { return await fn(client); } finally { await client.end().catch(() => {}); }
}

const memberFields = 'u.full_name, u.email, u.phone, u.campus_zone, u.chapter, u.status, u.badge, u.membership_id, u.joined_date, u.country, u.residence, u.birthday, u.gender, u.invited_by';
const memberDto = (m) => ({
  name: m.full_name,
  email: m.email,
  phone: m.phone,
  campusZone: m.campus_zone,
  chapter: m.chapter,
  status: m.status,
  badge: m.badge,
  membershipId: m.membership_id,
  joinDate: m.joined_date ? new Date(m.joined_date).toISOString().slice(0, 10) : '',
  country: m.country || '',
  residence: m.residence || '',
  birthday: m.birthday instanceof Date ? m.birthday.toISOString().slice(0, 10) : (m.birthday || ''),
  gender: m.gender || '',
  invitedBy: m.invited_by || '',
  checkedIn: Boolean(m.checkin_id),
  checkedInAt: m.checkin_at ? new Date(m.checkin_at).toISOString() : null,
  checkedInBy: m.checkin_by || null,
});

async function ensureCheckins(client) {
  await client.query(`CREATE TABLE IF NOT EXISTS checkins (
    id SERIAL PRIMARY KEY,
    membership_id TEXT NOT NULL REFERENCES users(membership_id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'Africa/Nairobi')::date),
    event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,
    checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    checked_in_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
  )`);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS checkins_member_date_event_idx ON checkins (membership_id, attendance_date, COALESCE(event_id, 0))`);
  await client.query(`CREATE INDEX IF NOT EXISTS checkins_attendance_date_idx ON checkins (attendance_date)`);
  await client.query(`CREATE INDEX IF NOT EXISTS checkins_checked_in_by_idx ON checkins (LOWER(checked_in_by))`);
  await client.query(`INSERT INTO checkins (membership_id, attendance_date, checked_in_at, checked_in_by)
    SELECT membership_id,(checked_in_at AT TIME ZONE 'Africa/Nairobi')::date,checked_in_at,NULL
    FROM users WHERE checked_in=TRUE AND checked_in_at IS NOT NULL ON CONFLICT DO NOTHING`);
  await client.query(`UPDATE users SET checked_in=FALSE, checked_in_at=NULL WHERE checked_in=TRUE`);
}

async function getEventId(request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get('eventId');
  if (raw == null || raw === '') return null;
  const eventId = Number(raw);
  if (!Number.isInteger(eventId) || eventId <= 0) return NaN;
  return eventId;
}

async function assertEvent(client, eventId) {
  if (eventId == null) return true;
  if (!Number.isInteger(eventId) || eventId <= 0) return false;
  const result = await client.query('SELECT 1 FROM events WHERE id=$1 LIMIT 1', [eventId]);
  return result.rows.length > 0;
}

const selectMembers = (eventId) => `
  SELECT ${memberFields}, c.id AS checkin_id, c.checked_in_at AS checkin_at, c.checked_in_by AS checkin_by
  FROM users u
  LEFT JOIN checkins c
    ON c.membership_id = u.membership_id
   AND c.attendance_date = ((NOW() AT TIME ZONE 'Africa/Nairobi')::date)
   AND COALESCE(c.event_id, 0) = COALESCE(${eventId == null ? 'NULL' : '$1'}, 0)
`;

export async function handleAttendance(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith('/api/members')) return null;

  const headers = corsHeaders(request, env);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  try {
    const result = await db(env, async (client) => {
      await ensureCheckins(client);

      if (url.pathname === '/api/members/self-checkin' && request.method === 'POST') {
        const email = await authEmail(request, env);
        if (!email) return { status: 401, body: { error: 'Please sign in to check in.' } };
        const body = await request.json().catch(() => ({}));
        const eventId = body?.eventId == null || body?.eventId === '' ? null : Number(body.eventId);
        if (eventId !== null && (!(await assertEvent(client, eventId)))) return { status: 400, body: { error: 'Invalid event.' } };
        const member = await client.query(`SELECT ${memberFields.replace(/u\./g, '')} FROM users u WHERE LOWER(u.email)=LOWER($1) LIMIT 1`, [email]);
        if (!member.rows.length) return { status: 404, body: { error: 'Your member profile could not be found.' } };
        const existing = await client.query(`SELECT id,checked_in_at,checked_in_by FROM checkins WHERE membership_id=$1 AND attendance_date=((NOW() AT TIME ZONE 'Africa/Nairobi')::date) AND COALESCE(event_id,0)=COALESCE($2,0) LIMIT 1`, [member.rows[0].membership_id, eventId]);
        if (existing.rows.length) return { status: 200, body: { member: memberDto({ ...member.rows[0], checkin_id: existing.rows[0].id, checkin_at: existing.rows[0].checked_in_at, checkin_by: existing.rows[0].checked_in_by }), alreadyCheckedIn: true, message: 'You are already checked in today.' } };
        const inserted = await client.query(`INSERT INTO checkins (membership_id,attendance_date,event_id,checked_in_at,checked_in_by) VALUES ($1,((NOW() AT TIME ZONE 'Africa/Nairobi')::date),$2,NOW(),$3) RETURNING id,checked_in_at,checked_in_by`, [member.rows[0].membership_id, eventId, email]);
        return { status: 200, body: { member: memberDto({ ...member.rows[0], checkin_id: inserted.rows[0].id, checkin_at: inserted.rows[0].checked_in_at, checkin_by: inserted.rows[0].checked_in_by }), alreadyCheckedIn: false, message: 'You are checked in successfully.' } };
      }

      const adminEmail = await requireAdmin(client, request, env);
      if (!adminEmail) return { status: 403, body: { error: 'Administrator authorization is required.' } };

      if (url.pathname === '/api/members/search' && request.method === 'GET') {
        const eventId = await getEventId(request);
        if (Number.isNaN(eventId)) return { status: 400, body: { error: 'Invalid event ID.' } };
        if (!(await assertEvent(client, eventId))) return { status: 400, body: { error: 'Selected event was not found.' } };
        const raw = (url.searchParams.get('q') || '').trim();
        if (!raw) return { status: 400, body: { error: 'Please provide a name, member ID, email, or phone to search.' } };
        const normalized = raw.toLowerCase();
        const digits = raw.replace(/[\s\-()]/g, '');
        const sql = `${selectMembers(eventId)} WHERE LOWER(u.membership_id) LIKE $${eventId == null ? 1 : 2} OR LOWER(u.full_name) LIKE $${eventId == null ? 1 : 2} OR LOWER(u.email) LIKE $${eventId == null ? 1 : 2} OR REPLACE(u.phone,' ','') LIKE '%' || $${eventId == null ? 2 : 3} || '%' ORDER BY (LOWER(u.membership_id)=LOWER($${eventId == null ? 3 : 4}) OR LOWER(u.full_name)=LOWER($${eventId == null ? 3 : 4}) OR LOWER(u.email)=LOWER($${eventId == null ? 3 : 4})) DESC,u.full_name ASC LIMIT 8`;
        const params = eventId == null ? [`%${normalized}%`, digits, normalized] : [eventId, `%${normalized}%`, digits, normalized];
        const rows = await client.query(sql, params);
        if (!rows.rows.length) return { status: 404, body: { error: `No member found matching "${raw}".` } };
        return { status: 200, body: { members: rows.rows.map(memberDto) } };
      }

      if (url.pathname === '/api/members' && request.method === 'GET') {
        const eventId = await getEventId(request);
        if (Number.isNaN(eventId)) return { status: 400, body: { error: 'Invalid event ID.' } };
        if (!(await assertEvent(client, eventId))) return { status: 400, body: { error: 'Selected event was not found.' } };
        const sql = `${selectMembers(eventId)} ORDER BY u.created_at DESC`;
        const rows = await client.query(sql, eventId == null ? [] : [eventId]);
        return { status: 200, body: { members: rows.rows.map(memberDto) } };
      }

      const match = url.pathname.match(/^\/api\/members\/([^/]+)\/checkin$/);
      if (match && request.method === 'POST') {
        const membershipId = decodeURIComponent(match[1]);
        const body = await request.json().catch(() => ({}));
        const eventId = body?.eventId == null || body?.eventId === '' ? null : Number(body.eventId);
        if (eventId !== null && !(await assertEvent(client, eventId))) return { status: 400, body: { error: 'Selected event was not found.' } };
        const member = await client.query(`SELECT ${memberFields.replace(/u\./g, '')} FROM users u WHERE u.membership_id=$1 LIMIT 1`, [membershipId]);
        if (!member.rows.length) return { status: 404, body: { error: 'Member not found.' } };
        const existing = await client.query(`SELECT id,checked_in_at,checked_in_by FROM checkins WHERE membership_id=$1 AND attendance_date=((NOW() AT TIME ZONE 'Africa/Nairobi')::date) AND COALESCE(event_id,0)=COALESCE($2,0) LIMIT 1`, [membershipId, eventId]);
        if (existing.rows.length) return { status: 200, body: { member: memberDto({ ...member.rows[0], checkin_id: existing.rows[0].id, checkin_at: existing.rows[0].checked_in_at, checkin_by: existing.rows[0].checked_in_by }), alreadyCheckedIn: true } };
        try {
          const inserted = await client.query(`INSERT INTO checkins (membership_id,attendance_date,event_id,checked_in_at,checked_in_by) VALUES ($1,((NOW() AT TIME ZONE 'Africa/Nairobi')::date),$2,NOW(),$3) RETURNING id,checked_in_at,checked_in_by`, [membershipId, eventId, adminEmail]);
          return { status: 200, body: { member: memberDto({ ...member.rows[0], checkin_id: inserted.rows[0].id, checkin_at: inserted.rows[0].checked_in_at, checkin_by: inserted.rows[0].checked_in_by }), alreadyCheckedIn: false } };
        } catch (error) {
          if (error?.code !== '23505') throw error;
          const raced = await client.query(`SELECT id,checked_in_at,checked_in_by FROM checkins WHERE membership_id=$1 AND attendance_date=((NOW() AT TIME ZONE 'Africa/Nairobi')::date) AND COALESCE(event_id,0)=COALESCE($2,0) LIMIT 1`, [membershipId, eventId]);
          return { status: 200, body: { member: memberDto({ ...member.rows[0], checkin_id: raced.rows[0]?.id, checkin_at: raced.rows[0]?.checked_in_at, checkin_by: raced.rows[0]?.checked_in_by }), alreadyCheckedIn: true } };
        }
      }

      return { status: 405, body: { error: 'Method not allowed.' } };
    });

    return json(result.body, result.status, headers);
  } catch (error) {
    console.error('[worker] attendance API failed', error);
    return json({ error: 'Unable to access the attendance service right now.' }, 503, headers);
  }
}
