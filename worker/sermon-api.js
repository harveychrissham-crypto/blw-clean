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

const extractYouTubeId = (value) => {
  if (typeof value !== 'string') return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/live\/)([\w-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match) return match[1];
  }
  return null;
};

const sermonDto = (s) => ({
  id: s.id,
  title: s.title,
  speaker: s.speaker || '',
  description: s.description || '',
  youtubeUrl: s.youtube_url,
  youtubeId: extractYouTubeId(s.youtube_url),
  isFeatured: !!s.is_featured,
  createdAt: s.created_at,
});

export async function handleSermons(request, env, url) {
  if (!url.pathname.startsWith('/api/sermons')) return null;
  const headers = cors(request.headers.get('Origin') || url.origin);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });

  try {
    const result = await db(env, async (client) => {
      if (url.pathname === '/api/sermons' && request.method === 'GET') {
        const r = await client.query('SELECT * FROM sermons ORDER BY created_at DESC, id DESC');
        return { status: 200, body: { sermons: r.rows.map(sermonDto) } };
      }

      if (url.pathname === '/api/sermons' && request.method === 'POST') {
        const body = await request.json().catch(() => null);
        const title = typeof body?.title === 'string' ? body.title.trim() : '';
        const speaker = typeof body?.speaker === 'string' ? body.speaker.trim() : '';
        const description = typeof body?.description === 'string' ? body.description.trim() : '';
        const youtubeUrl = typeof body?.youtubeUrl === 'string' ? body.youtubeUrl.trim() : '';
        if (!title || !youtubeUrl) return { status: 400, body: { error: 'Title and YouTube URL are required.' } };
        if (!extractYouTubeId(youtubeUrl)) return { status: 400, body: { error: 'That does not look like a valid YouTube URL.' } };
        const r = await client.query(
          `INSERT INTO sermons (title, speaker, description, youtube_url) VALUES ($1,$2,$3,$4) RETURNING *`,
          [title, speaker, description, youtubeUrl]
        );
        return { status: 201, body: { sermon: sermonDto(r.rows[0]) } };
      }

      const match = url.pathname.match(/^\/api\/sermons\/([^/]+)(?:\/feature)?$/);
      if (!match) return { status: 405, body: { error: 'Method not allowed.' } };
      const id = decodeURIComponent(match[1]);

      if (url.pathname.endsWith('/feature') && request.method === 'PUT') {
        await client.query('UPDATE sermons SET is_featured = FALSE WHERE is_featured = TRUE');
        const r = await client.query('UPDATE sermons SET is_featured = TRUE WHERE id = $1 RETURNING *', [id]);
        if (!r.rows.length) return { status: 404, body: { error: 'Sermon not found.' } };
        return { status: 200, body: { sermon: sermonDto(r.rows[0]) } };
      }

      if (request.method === 'PUT') {
        const body = await request.json().catch(() => null);
        const title = typeof body?.title === 'string' ? body.title.trim() : '';
        const speaker = typeof body?.speaker === 'string' ? body.speaker.trim() : '';
        const description = typeof body?.description === 'string' ? body.description.trim() : '';
        const youtubeUrl = typeof body?.youtubeUrl === 'string' ? body.youtubeUrl.trim() : '';
        if (!title || !youtubeUrl) return { status: 400, body: { error: 'Title and YouTube URL are required.' } };
        if (!extractYouTubeId(youtubeUrl)) return { status: 400, body: { error: 'That does not look like a valid YouTube URL.' } };
        const r = await client.query(
          `UPDATE sermons SET title=$1,speaker=$2,description=$3,youtube_url=$4 WHERE id=$5 RETURNING *`,
          [title, speaker, description, youtubeUrl, id]
        );
        if (!r.rows.length) return { status: 404, body: { error: 'Sermon not found.' } };
        return { status: 200, body: { sermon: sermonDto(r.rows[0]) } };
      }

      if (request.method === 'DELETE') {
        const r = await client.query('DELETE FROM sermons WHERE id=$1 RETURNING id', [id]);
        if (!r.rows.length) return { status: 404, body: { error: 'Sermon not found.' } };
        return { status: 200, body: { deleted: true } };
      }

      return { status: 405, body: { error: 'Method not allowed.' } };
    });
    return json(result.body, result.status, headers);
  } catch (error) {
    console.error('[worker] sermons API failed', error);
    return json({ error: 'Unable to load sermons at this time.' }, 503, headers);
  }
}
