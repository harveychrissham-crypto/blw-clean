import jwt from 'jsonwebtoken';

const json = (body, status = 200, headers = {}) => new Response(
  JSON.stringify(body),
  { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } }
);

const cors = (origin) => ({
  'access-control-allow-origin': origin,
  'access-control-allow-credentials': 'true',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'access-control-allow-headers': 'Content-Type, Authorization',
  vary: 'Origin',
});

async function db(env, fn) {
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || '';
  if (!connectionString) throw new Error('Database connection is not configured.');
  const { Client } = await import('pg');
  const client = new Client({ connectionString });
  await client.connect();
  try { return await fn(client); } finally { await client.end().catch(() => {}); }
}

const clean = (value, max = 240) => typeof value === 'string' ? value.trim().replace(/[<>]/g, '').slice(0, max) : '';

const locationDto = (row) => ({
  id: row.id,
  fellowshipName: row.fellowship_name || row.venue || row.chapter || '',
  country: row.country || '',
  city: row.city || '',
  town: row.town || '',
  area: row.area || '',
  university: row.university || '',
  address: row.address || row.venue || '',
  description: row.description || '',
  serviceTime: row.service_time || '',
  latitude: row.latitude == null ? null : Number(row.latitude),
  longitude: row.longitude == null ? null : Number(row.longitude),
  isActive: row.is_active !== false,
  updatedAt: row.updated_at,
});

async function getAuthenticatedAdmin(request, env, client) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;

  try {
    const secret = env.JWT_SECRET || env.DATABASE_URL || env.HYPERDRIVE?.connectionString || '';
    if (!secret) return null;
    const decoded = jwt.verify(token, secret);
    const email = typeof decoded?.user?.email === 'string' ? decoded.user.email.trim().toLowerCase() : '';
    if (!email) return null;
    const result = await client.query('SELECT email, is_admin FROM users WHERE LOWER(email)=LOWER($1) LIMIT 1', [email]);
    if (!result.rows.length || !result.rows[0].is_admin) return null;
    return { email };
  } catch {
    return null;
  }
}

const parseLocation = (body) => {
  const fellowshipName = clean(body?.fellowshipName || body?.venue || body?.chapter, 180);
  const country = clean(body?.country, 80);
  const city = clean(body?.city, 100);
  const town = clean(body?.town, 100);
  const area = clean(body?.area, 120);
  const university = clean(body?.university, 180);
  const address = clean(body?.address, 240);
  const description = clean(body?.description, 500);
  const serviceTime = clean(body?.serviceTime, 100);
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  const isActive = body?.isActive !== false;

  if (!fellowshipName) return { error: 'Fellowship name is required.' };
  if (!country) return { error: 'Country is required.' };
  if (!city && !town) return { error: 'Add a city or town.' };
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return { error: 'Enter a valid latitude.' };
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return { error: 'Enter a valid longitude.' };

  return { value: { fellowshipName, country, city, town, area, university, address, description, serviceTime, latitude, longitude, isActive } };
};

async function handle(request, env, url) {
  if (!url.pathname.startsWith('/api/fellowships')) return null;
  const headers = cors(url.origin);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  try {
    const result = await db(env, async (client) => {
      const isAdminRoute = url.pathname === '/api/fellowships/admin' || url.pathname.startsWith('/api/fellowships/admin/');

      if (request.method === 'GET' && !isAdminRoute) {
        const q = clean(url.searchParams.get('q') || '', 120).toLowerCase();
        const country = clean(url.searchParams.get('country') || '', 80).toLowerCase();
        const params = [];
        const where = ['is_active = TRUE'];
        if (q) {
          params.push(`%${q}%`);
          where.push(`LOWER(COALESCE(fellowship_name,'') || ' ' || COALESCE(country,'') || ' ' || COALESCE(city,'') || ' ' || COALESCE(town,'') || ' ' || COALESCE(area,'') || ' ' || COALESCE(university,'') || ' ' || COALESCE(address,'')) LIKE $${params.length}`);
        }
        if (country) {
          params.push(`%${country}%`);
          where.push(`LOWER(country) LIKE $${params.length}`);
        }
        const sql = `SELECT * FROM chapter_venues WHERE ${where.join(' AND ')} ORDER BY country, COALESCE(city,town), fellowship_name, id LIMIT 50`;
        const rows = await client.query(sql, params);
        return { status: 200, body: { fellowships: rows.rows.map(locationDto) } };
      }

      const admin = await getAuthenticatedAdmin(request, env, client);
      if (!admin) return { status: 403, body: { error: 'Administrator access required.' } };

      if (request.method === 'GET' && url.pathname === '/api/fellowships/admin') {
        const rows = await client.query('SELECT * FROM chapter_venues ORDER BY is_active DESC, country, COALESCE(city,town), fellowship_name, id');
        return { status: 200, body: { fellowships: rows.rows.map(locationDto) } };
      }

      if (request.method === 'POST' && url.pathname === '/api/fellowships/admin') {
        const body = await request.json().catch(() => null);
        const parsed = parseLocation(body);
        if (parsed.error) return { status: 400, body: { error: parsed.error } };
        const v = parsed.value;
        const result = await client.query(
          `INSERT INTO chapter_venues (chapter,venue,service_time,fellowship_name,country,city,town,area,university,address,description,latitude,longitude,is_active,updated_at)
           VALUES ($1,$2,$3,$1,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW()) RETURNING *`,
          [v.fellowshipName, v.address || v.fellowshipName, v.serviceTime, v.country, v.city, v.town, v.area, v.university, v.address, v.description, v.latitude, v.longitude, v.isActive]
        );
        return { status: 201, body: { fellowship: locationDto(result.rows[0]) } };
      }

      const match = url.pathname.match(/^\/api\/fellowships\/admin\/(\d+)$/);
      if (match) {
        const id = Number(match[1]);
        if (request.method === 'DELETE') {
          const result = await client.query('DELETE FROM chapter_venues WHERE id=$1 RETURNING id', [id]);
          if (!result.rows.length) return { status: 404, body: { error: 'Fellowship location not found.' } };
          return { status: 200, body: { deleted: true } };
        }
        if (request.method === 'PUT' || request.method === 'PATCH') {
          const body = await request.json().catch(() => null);
          const parsed = parseLocation(body);
          if (parsed.error) return { status: 400, body: { error: parsed.error } };
          const v = parsed.value;
          const result = await client.query(
            `UPDATE chapter_venues SET chapter=$1,venue=$2,service_time=$3,fellowship_name=$1,country=$4,city=$5,town=$6,area=$7,university=$8,address=$9,description=$10,latitude=$11,longitude=$12,is_active=$13,updated_at=NOW()
             WHERE id=$14 RETURNING *`,
            [v.fellowshipName, v.address || v.fellowshipName, v.serviceTime, v.country, v.city, v.town, v.area, v.university, v.address, v.description, v.latitude, v.longitude, v.isActive, id]
          );
          if (!result.rows.length) return { status: 404, body: { error: 'Fellowship location not found.' } };
          return { status: 200, body: { fellowship: locationDto(result.rows[0]) } };
        }
      }

      return { status: 405, body: { error: 'Method not allowed.' } };
    });

    return json(result.body, result.status, headers);
  } catch (error) {
    console.error('[worker] fellowships API failed', error);
    return json({ error: 'Unable to access fellowship locations right now.' }, 503, headers);
  }
}

export { handle as handleFellowships };