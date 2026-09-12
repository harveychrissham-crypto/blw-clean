const normalizeOrigin = (value) => typeof value === 'string' ? value.trim().replace(/\/$/, '') : '';

const CAPACITOR_ORIGINS = new Set(['https://localhost', 'capacitor://localhost', 'http://localhost']);

export function allowedOrigin(request, env) {
  const origin = normalizeOrigin(request.headers.get('Origin') || '');
  if (!origin) return { origin: '', trusted: false };
  if (CAPACITOR_ORIGINS.has(origin)) return { origin, trusted: true };
  const configured = String(env.ALLOWED_ORIGIN || '')
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
  if (configured.includes(origin)) return { origin, trusted: true };

  // The native app uses bearer authentication rather than cross-origin
  // cookies. Allow HTTPS browser origins for the API when no explicit
  // allow-list is configured, while keeping configured origins strict.
  // This lets the Cloudflare-hosted web app and preview deployments reach
  // the video API without requiring a hard-coded Pages hostname.
  //
  // "trusted: false" here matters: this app's auth is bearer-token only
  // (Authorization header, never cookies -- see authController.js, where
  // COOKIE_MAX_AGE is defined but never actually used to set a cookie), so
  // this fallback must never be paired with Access-Control-Allow-Credentials.
  // Reflecting any HTTPS origin back AND allowing credentials is a classic
  // CORS misconfiguration; bearer auth doesn't need credentialed CORS mode
  // to work, so there's no reason to combine them here.
  if (!configured.length && /^https:\/\//i.test(origin)) return { origin, trusted: false };
  return { origin: '', trusted: false };
}

export function corsHeaders(request, env) {
  const { origin, trusted } = allowedOrigin(request, env);
  const headers = {
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'Content-Type, Authorization',
  };
  if (origin) {
    headers['access-control-allow-origin'] = origin;
    if (trusted) headers['access-control-allow-credentials'] = 'true';
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
