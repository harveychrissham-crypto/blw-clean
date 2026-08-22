import legacyApp from './api-entry-legacy.js';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
const cors = (origin) => ({ 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'access-control-allow-headers': 'Content-Type, Authorization', vary: 'Origin' });
async function db(env, fn) { const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || ''; if (!connectionString) throw new Error('Database connection is not configured.'); const { Client } = await import('pg'); const client = new Client({ connectionString }); await client.connect(); try { return await fn(client); } finally { await client.end().catch(() => {}); } }
const bearerToken = (request) => { const header = request.headers.get('authorization') || request.headers.get('Authorization') || ''; return header.startsWith('Bearer ') ? header.slice(7).trim() : ''; };
const authEmail = async (request, env) => { const token = bearerToken(request); if (!token) return ''; const jwtSecret = typeof env.JWT_SECRET === 'string' && env.JWT_SECRET.trim() ? env.JWT_SECRET.trim() : ''; if (!jwtSecret) return ''; try { const { default: jwt } = await import('jsonwebtoken'); const payload = jwt.verify(token, jwtSecret); return typeof payload?.user?.email === 'string' ? payload.user.email.trim().toLowerCase() : ''; } catch { return ''; } };
const memberFields = `u.full_name, u.email, u.phone, u.campus_zone, u.chapter, u.status, u.badge, u.membership_id, u.joined_date, u.country, u.residence, u.birthday, u.gender, u.invited_by`;
const memberDto = (m) => ({ name:m.full_name,email:m.email,phone:m.phone,campusZone:m.campus_zone,chapter:m.chapter,status:m.status,badge:m.badge,membershipId:m.membership_id,joinDate:m.joined_date ? new Date(m.joined_date).toISOString().slice(0,10) : '',country:m.country||'',residence:m.residence||'',birthday:m.birthday instanceof Date ? m.birthday.toISOString().slice(0,10) : (m.birthday||''),gender:m.gender||'',invitedBy:m.invited_by||'',checkedIn:Boolean(m.checkin_id),checkedInAt:m.checkin_at ? new Date(m.checkin_at).toISOString() : null,checkedInBy:m.checkin_by||null});
async function ensureCheckins(client) {
  await client.query(`CREATE TABLE IF NOT EXISTS checkins (id SERIAL PRIMARY KEY,membership_id TEXT NOT NULL REFERENCES users(membership_id) ON DELETE CASCADE,attendance_date DATE NOT NULL DEFAULT ((NOW() AT TIME ZONE 'Africa/Nairobi')::date),event_id INTEGER REFERENCES events(id) ON DELETE SET NULL,checked_in_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),checked_in_by TEXT,created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW())`);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS checkins_member_date_event_idx ON checkins (membership_id, attendance_date, COALESCE(event_id, 0))`);
  await client.query(`CREATE INDEX IF NOT EXISTS checkins_attendance_date_idx ON checkins (attendance_date)`);
  await client.query(`CREATE INDEX IF NOT EXISTS checkins_checked_in_by_idx ON checkins (LOWER(checked_in_by))`);
  await client.query(`INSERT INTO checkins (membership_id, attendance_date, checked_in_at, checked_in_by) SELECT membership_id,(checked_in_at AT TIME ZONE 'Africa/Nairobi')::date,checked_in_at,NULL FROM users WHERE checked_in=TRUE AND checked_in_at IS NOT NULL ON CONFLICT DO NOTHING`);
  await client.query(`UPDATE users SET checked_in=FALSE, checked_in_at=NULL WHERE checked_in=TRUE`);
}
const selectMembers = `SELECT ${memberFields},c.id AS checkin_id,c.checked_in_at AS checkin_at,c.checked_in_by AS checkin_by FROM users u LEFT JOIN checkins c ON c.membership_id=u.membership_id AND c.attendance_date=((NOW() AT TIME ZONE 'Africa/Nairobi')::date) AND c.event_id IS NULL`;
async function handleMembers(request, env, url) {
  if(!url.pathname.startsWith('/api/members')) return null; const headers=cors(request.headers.get('Origin')||url.origin); if(request.method==='OPTIONS') return new Response(null,{status:204,headers});
  try { const result=await db(env,async(client)=>{
    await ensureCheckins(client);
    if(url.pathname==='/api/members/self-checkin'&&request.method==='POST'){
      const email=await authEmail(request,env); if(!email)return{status:401,body:{error:'Please sign in to check in.'}};
      const member=await client.query(`SELECT ${memberFields.replace(/u\./g,'')} FROM users u WHERE LOWER(u.email)=LOWER($1) LIMIT 1`,[email]); if(!member.rows.length)return{status:404,body:{error:'Your member profile could not be found.'}};
      const existing=await client.query(`SELECT id,checked_in_at,checked_in_by FROM checkins WHERE membership_id=$1 AND attendance_date=((NOW() AT TIME ZONE 'Africa/Nairobi')::date) AND event_id IS NULL LIMIT 1`,[member.rows[0].membership_id]);
      if(existing.rows.length)return{status:200,body:{member:memberDto({...member.rows[0],checkin_id:existing.rows[0].id,checkin_at:existing.rows[0].checked_in_at,checkin_by:existing.rows[0].checked_in_by}),alreadyCheckedIn:true,message:'You are already checked in today.'}};
      const inserted=await client.query(`INSERT INTO checkins (membership_id,attendance_date,checked_in_at,checked_in_by) VALUES ($1,((NOW() AT TIME ZONE 'Africa/Nairobi')::date),NOW(),$2) RETURNING id,checked_in_at,checked_in_by`,[member.rows[0].membership_id,email]);
      return{status:200,body:{member:memberDto({...member.rows[0],checkin_id:inserted.rows[0].id,checkin_at:inserted.rows[0].checked_in_at,checkin_by:inserted.rows[0].checked_in_by}),alreadyCheckedIn:false,message:'You are checked in successfully.'}};
    }
    if(url.pathname==='/api/members/search'&&request.method==='GET'){
      const email = await authEmail(request, env); if(!email)return{status:401,body:{error:'Please sign in to search members.'}};
      const raw=(url.searchParams.get('q')||'').trim(); if(!raw)return{status:400,body:{error:'Please provide a name, member ID, email, or phone to search.'}}; const normalized=raw.toLowerCase(); const digits=raw.replace(/[\s\-()]/g,'');
      const r=await client.query(`${selectMembers} WHERE LOWER(u.membership_id) LIKE $1 OR LOWER(u.full_name) LIKE $1 OR LOWER(u.email) LIKE $1 OR REPLACE(u.phone,' ','') LIKE '%' || $2 || '%' ORDER BY (LOWER(u.membership_id)=$3 OR LOWER(u.full_name)=$3 OR LOWER(u.email)=$3) DESC,u.full_name ASC LIMIT 8`,[`%${normalized}%`,digits,normalized]);
      if(!r.rows.length)return{status:404,body:{error:`No member found matching "${raw}".`}}; return{status:200,body:{members:r.rows.map(memberDto),checkedIn:false}};
    }
    if(url.pathname==='/api/members'&&request.method==='GET'){const r=await client.query(`${selectMembers} ORDER BY u.created_at DESC`);return{status:200,body:{members:r.rows.map(memberDto)}};}
    const match=url.pathname.match(/^\/api\/members\/([^/]+)\/checkin$/);
    if(match&&request.method==='POST'){
      const membershipId=decodeURIComponent(match[1]); const email=await authEmail(request,env); const eventBody=await request.json().catch(()=>({})); const eventId=eventBody?.eventId==null||eventBody.eventId===''?null:Number(eventBody.eventId);
      if(eventId!==null&&(!Number.isInteger(eventId)||eventId<=0))return{status:400,body:{error:'Invalid event ID.'}};
      const member=await client.query(`SELECT ${memberFields.replace(/u\./g,'')} FROM users u WHERE u.membership_id=$1 LIMIT 1`,[membershipId]); if(!member.rows.length)return{status:404,body:{error:'Member not found.'}};
      const existing=await client.query(`SELECT id,checked_in_at,checked_in_by FROM checkins WHERE membership_id=$1 AND attendance_date=((NOW() AT TIME ZONE 'Africa/Nairobi')::date) AND COALESCE(event_id,0)=COALESCE($2,0) LIMIT 1`,[membershipId,eventId]);
      if(existing.rows.length)return{status:200,body:{member:memberDto({...member.rows[0],checkin_id:existing.rows[0].id,checkin_at:existing.rows[0].checked_in_at,checkin_by:existing.rows[0].checked_in_by}),alreadyCheckedIn:true}};
      try{const inserted=await client.query(`INSERT INTO checkins (membership_id,attendance_date,event_id,checked_in_at,checked_in_by) VALUES ($1,((NOW() AT TIME ZONE 'Africa/Nairobi')::date),$2,NOW(),$3) RETURNING id,checked_in_at,checked_in_by`,[membershipId,eventId,email||null]); return{status:200,body:{member:memberDto({...member.rows[0],checkin_id:inserted.rows[0].id,checkin_at:inserted.rows[0].checked_in_at,checkin_by:inserted.rows[0].checked_in_by}),alreadyCheckedIn:false}};}
      catch(error){if(error?.code!=='23505')throw error; const raced=await client.query(`SELECT id,checked_in_at,checked_in_by FROM checkins WHERE membership_id=$1 AND attendance_date=((NOW() AT TIME ZONE 'Africa/Nairobi')::date) AND COALESCE(event_id,0)=COALESCE($2,0) LIMIT 1`,[membershipId,eventId]); return{status:200,body:{member:memberDto({...member.rows[0],checkin_id:raced.rows[0]?.id,checkin_at:raced.rows[0]?.checked_in_at,checkin_by:raced.rows[0]?.checked_in_by}),alreadyCheckedIn:true}};}
    }
    return{status:405,body:{error:'Method not allowed.'}};
  }); return json(result.body,result.status,headers);} catch(error){console.error('[worker] members API failed',error);return json({error:'Unable to access the check-in service right now.'},503,headers);}
}
export default { async fetch(request,env,ctx){const url=new URL(request.url);const memberResponse=await handleMembers(request,env,url);if(memberResponse)return memberResponse;return legacyApp.fetch(request,env,ctx);}, async scheduled(controller,env,ctx){if(typeof legacyApp.scheduled==='function')return legacyApp.scheduled(controller,env,ctx);}};
