import jwt from 'jsonwebtoken';

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...headers } });
const cors = (origin) => ({ 'access-control-allow-origin': origin, 'access-control-allow-credentials': 'true', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'access-control-allow-headers': 'Content-Type, Authorization', vary: 'Origin' });

async function db(env, fn) {
  const connectionString = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || '';
  if (!connectionString) throw new Error('Database connection is not configured.');
  const { Client } = await import('pg'); const client = new Client({ connectionString }); await client.connect();
  try { return await fn(client); } finally { await client.end().catch(() => {}); }
}

const clean = (value, max = 240) => typeof value === 'string' ? value.trim().replace(/[<>]/g, '').slice(0, max) : '';
const locationDto = (row) => ({ id: row.id, fellowshipName: row.fellowship_name || row.venue || row.chapter || '', country: row.country || '', city: row.city || '', town: row.town || '', area: row.area || '', university: row.university || '', address: row.address || row.venue || '', description: row.description || '', serviceTime: row.service_time || '', latitude: row.latitude == null ? null : Number(row.latitude), longitude: row.longitude == null ? null : Number(row.longitude), isActive: row.is_active !== false, updatedAt: row.updated_at });

const leaderAccessCode = (env) => {
  const code = typeof env.FELLOWSHIP_ADMIN_ACCESS_CODE === 'string' ? env.FELLOWSHIP_ADMIN_ACCESS_CODE.trim() : '';
  if (!code) throw new Error('FELLOWSHIP_ADMIN_ACCESS_CODE is not configured.');
  return code;
};

const authSecret = (env) => {
  const secret = typeof env.JWT_SECRET === 'string' ? env.JWT_SECRET.trim() : '';
  if (!secret) throw new Error('JWT_SECRET is not configured.');
  return secret;
};

const validLeaderToken = (request, env) => {
  try {
    const header = request.headers.get('authorization') || '';
    if (!header.startsWith('Bearer ')) return false;
    const token = header.slice(7).trim();
    if (!token) return false;
    const payload = jwt.verify(token, authSecret(env));
    return payload?.leaderAdmin === true;
  } catch {
    return false;
  }
};

const parseLocation = (body) => {
  const fellowshipName = clean(body?.fellowshipName || body?.venue || body?.chapter, 180);
  const country = clean(body?.country, 80) || 'Kenya', city = clean(body?.city, 100), town = clean(body?.town, 100), area = clean(body?.area, 120);
  const university = clean(body?.university, 180), address = clean(body?.address, 240), description = clean(body?.description, 500), serviceTime = clean(body?.serviceTime, 100);
  const latitude = Number(body?.latitude), longitude = Number(body?.longitude), isActive = body?.isActive !== false;
  if (!fellowshipName) return { error: 'Fellowship name is required.' };
  if (!city && !town && !area) return { error: 'Add a town or area.' };
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) return { error: 'Place the fellowship pin on the map.' };
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) return { error: 'Place the fellowship pin on the map.' };
  return { value: { fellowshipName, country, city, town, area, university, address, description, serviceTime, latitude, longitude, isActive } };
};

async function handle(request, env, url) {
  if (!url.pathname.startsWith('/api/fellowships') && url.pathname !== '/api/geocode') return null;
  const headers = cors(request.headers.get('Origin') || url.origin);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  if (url.pathname === '/api/geocode' && request.method === 'GET') {
    const query = clean(url.searchParams.get('q') || '', 160);
    if (!query) return json({ results: [] }, 200, headers);
    try {
      const nominatim = new URL('https://nominatim.openstreetmap.org/search'); nominatim.searchParams.set('q', query); nominatim.searchParams.set('format', 'jsonv2'); nominatim.searchParams.set('addressdetails', '1'); nominatim.searchParams.set('limit', '6');
      const response = await fetch(nominatim.toString(), { headers: { accept: 'application/json', 'user-agent': 'BLW Kenya Zone Fellowship Finder/1.0' } });
      if (!response.ok) throw new Error(`Geocoder returned ${response.status}`);
      const results = await response.json();
      return json({ results: Array.isArray(results) ? results.map((item) => ({ lat: Number(item.lat), lon: Number(item.lon), displayName: item.display_name || query, type: item.type || '', address: item.address || {} })).filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lon)) : [] }, 200, headers);
    } catch (error) { console.error('[worker] geocoding failed', error); return json({ error: 'Unable to search for that place right now.' }, 502, headers); }
  }

  try {
    const result = await db(env, async (client) => {
      if (url.pathname === '/api/fellowships/admin/auth' && request.method === 'POST') {
        const body = await request.json().catch(() => null);
        let expected;
        try { expected = leaderAccessCode(env); } catch (error) { return { status: 503, body: { error: error.message } }; }
        const supplied = typeof body?.accessCode === 'string' ? body.accessCode.trim() : '';
        if (!supplied || supplied !== expected) return { status: 401, body: { error: 'Invalid leadership access code.' } };
        try { return { status: 200, body: { token: jwt.sign({ leaderAdmin: true }, authSecret(env), { expiresIn: '8h' }) } }; }
        catch (error) { return { status: 503, body: { error: error.message } }; }
      }
      const adminRoute = url.pathname === '/api/fellowships/admin' || url.pathname.startsWith('/api/fellowships/admin/');
      if (request.method === 'GET' && !adminRoute) {
        const q = clean(url.searchParams.get('q') || '', 120).toLowerCase(), country = clean(url.searchParams.get('country') || '', 80).toLowerCase(), nearby = url.searchParams.get('nearby') === 'current';
        const params = [], where = ['is_active = TRUE'];
        if (q) { params.push(`%${q}%`); where.push(`LOWER(COALESCE(fellowship_name,'') || ' ' || COALESCE(country,'') || ' ' || COALESCE(city,'') || ' ' || COALESCE(town,'') || ' ' || COALESCE(area,'') || ' ' || COALESCE(university,'') || ' ' || COALESCE(address,'')) LIKE $${params.length}`); }
        if (country) { params.push(`%${country}%`); where.push(`LOWER(country) LIKE $${params.length}`); }
        const rows = await client.query(`SELECT * FROM chapter_venues WHERE ${where.join(' AND ')} ORDER BY country, COALESCE(city,town), fellowship_name, id LIMIT 50`, params); const body = { fellowships: rows.rows.map(locationDto) };
        if (nearby) { const cf = request.cf || {}, latitude = Number(cf.latitude), longitude = Number(cf.longitude); if (Number.isFinite(latitude) && Number.isFinite(longitude)) body.location = { latitude, longitude, city: cf.city || null, country: cf.country || null, source: 'cloudflare-ip' }; }
        return { status: 200, body };
      }
      if (!validLeaderToken(request, env)) return { status: 403, body: { error: 'Valid leadership access is required.' } };
      if (request.method === 'GET' && url.pathname === '/api/fellowships/admin') {
        const rows = await client.query('SELECT * FROM chapter_venues WHERE is_active = TRUE ORDER BY country, COALESCE(city,town), fellowship_name, id');
        return { status: 200, body: { fellowships: rows.rows.map(locationDto) } };
      }
      if (request.method === 'POST' && url.pathname === '/api/fellowships/admin') {
        const parsed = parseLocation(await request.json().catch(() => null)); if (parsed.error) return { status: 400, body: { error: parsed.error } }; const v = parsed.value;
        const rows = await client.query(`INSERT INTO chapter_venues (chapter,venue,service_time,fellowship_name,country,city,town,area,university,address,description,latitude,longitude,is_active,updated_at) VALUES ($1,$2,$3,$1,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW()) RETURNING *`, [v.fellowshipName, v.address || v.fellowshipName, v.serviceTime, v.country, v.city, v.town, v.area, v.university, v.address, v.description, v.latitude, v.longitude, v.isActive]);
        return { status: 201, body: { fellowship: locationDto(rows.rows[0]) } };
      }
      const match = url.pathname.match(/^\/api\/fellowships\/admin\/(\d+)$/);
      if (match) {
        const id = Number(match[1]);
        if (request.method === 'DELETE') {
          const rows = await client.query('UPDATE chapter_venues SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING id', [id]);
          if (!rows.rows.length) return { status: 404, body: { error: 'Fellowship location not found.' } };
          return { status: 200, body: { deleted: true, id } };
        }
        if (request.method === 'PUT' || request.method === 'PATCH') { const parsed = parseLocation(await request.json().catch(() => null)); if (parsed.error) return { status: 400, body: { error: parsed.error } }; const v = parsed.value; const rows = await client.query(`UPDATE chapter_venues SET chapter=$1,venue=$2,service_time=$3,fellowship_name=$1,country=$4,city=$5,town=$6,area=$7,university=$8,address=$9,description=$10,latitude=$11,longitude=$12,is_active=$13,updated_at=NOW() WHERE id=$14 RETURNING *`, [v.fellowshipName, v.address || v.fellowshipName, v.serviceTime, v.country, v.city, v.town, v.area, v.university, v.address, v.description, v.latitude, v.longitude, v.isActive, id]); return rows.rows.length ? { status: 200, body: { fellowship: locationDto(rows.rows[0]) } } : { status: 404, body: { error: 'Fellowship location not found.' } }; }
      }
      return { status: 405, body: { error: 'Method not allowed.' } };
    });
    return json(result.body, result.status, headers);
  } catch (error) { console.error('[worker] fellowships API failed', { message: error?.message, code: error?.code, path: url.pathname, method: request.method }); return json({ error: error?.message || 'Unable to access fellowship locations right now.' }, 503, headers); }
}

export { handle as handleFellowships };