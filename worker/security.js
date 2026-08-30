const normalizeOrigin = (value) => typeof value === 'string' ? value.trim().replace(/\/$/, '') : '';

const CAPACITOR_ORIGINS = new Set(['https://localhost', 'capacitor://localhost', 'http://localhost']);

export function allowedOrigin(request, env) {
  const origin = normalizeOrigin(request.headers.get('Origin') || '');
  if (!origin) return '';
  if (CAPACITOR_ORIGINS.has(origin)) return origin;
  const configured = String(env.ALLOWED_ORIGIN || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
  if (configured.includes(origin)) return origin;

  // The native app uses bearer authentication rather than cross-origin
  // cookies. Allow HTTPS browser origins for the API when no explicit
  // allow-list is configured, while keeping configured origins strict.
  // This lets the Cloudflare-hosted web app and preview deployments reach
  // the video API without requiring a hard-coded Pages hostname.
  if (!configured.length && /^https:\/\//i.test(origin)) return origin;
  return '';
}

export function corsHeaders(request, env) {
  const origin = allowedOrigin(request, env);
  const headers = {
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization',
  };
  if (origin) {
    headers['access-control-allow-origin'] = origin;
    headers['access-control-allow-credentials'] = 'true';
    headers.vary = 'Origin';
  }
  return headers;
}

const rateBuckets = new Map();

export function rateLimit(request, key, limit, windowMs = 60_000) {
  const now = Date.now();
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  const bucketKey = `${key}:${ip}`;
  const current = rateBuckets.get(bucketKey);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(bucketKey, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  current.count += 1;
  if (current.count <= limit) return { allowed: true, retryAfter: 0 };
  return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
}
