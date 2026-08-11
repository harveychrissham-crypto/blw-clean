import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const [
  { default: authRoutes },
  { default: contentRoutes },
  { default: registrationRoutes },
  { default: memberRoutes },
  { default: eventRoutes },
  { default: outreachStoryRoutes },
  { default: uploadRoutes },
  { default: sermonRoutes },
  { default: venueRoutes },
  { default: liveRoutes },
  { initDb },
] = await Promise.all([
  import('./routes/authRoutes.js'),
  import('./routes/contentRoutes.js'),
  import('./routes/registrationRoutes.js'),
  import('./routes/memberRoutes.js'),
  import('./routes/eventRoutes.js'),
  import('./routes/outreachStoryRoutes.js'),
  import('./routes/uploadRoutes.js'),
  import('./routes/sermonRoutes.js'),
  import('./routes/venueRoutes.js'),
  import('./routes/liveRoutes.js'),
  import('./db/index.js'),
]);

const app = express();
const PORT = process.env.PORT || 5000;
const clientDist = path.join(__dirname, '..', 'client', 'dist');

// ── CORS ─────────────────────────────────────────────────────────────────────
// In production, lock to your actual domain via ALLOWED_ORIGIN env var.
// In dev, allow localhost:5173 (Vite default).
//
// ALLOWED_ORIGIN can be a single origin or a comma-separated list, e.g.
//   ALLOWED_ORIGIN=https://blweastandcentralafrica.onrender.com
//
// The Capacitor native app's own origins are always allowed on top of that,
// since v6+ the app ships with no `server.url` — its UI is bundled locally
// and loaded from https://localhost (Android) / capacitor://localhost (iOS),
// which is a different origin than the API and must be explicitly allowed.
// The app authenticates with a Bearer token (not cookies), so this does not
// widen access to cookie-based sessions.
const CAPACITOR_ORIGINS = [
  'https://localhost',
  'capacitor://localhost',
  'http://localhost',
];

const configuredOrigins = (
  process.env.ALLOWED_ORIGIN ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173')
)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === 'production' && configuredOrigins.length === 0) {
  throw new Error('ALLOWED_ORIGIN must be set in production (e.g. https://yourdomain.com)');
}

const allowedOrigins = [...configuredOrigins, ...CAPACITOR_ORIGINS];

app.use(
  cors({
    origin(origin, callback) {
      // No Origin header (native HTTP clients, curl, server-to-server) — allow.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ── Helmet (hardened) ─────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // 'blob:' is required for daily-js's bundled worker (used for the
        // embedded Daily call on /live) — without it the call frame fails
        // to load with a CSP violation, same class of issue as the sermon
        // embeds below.
        scriptSrc: ["'self'", 'blob:'],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*.supabase.co', 'https://i.ytimg.com'],
        connectSrc: ["'self'", 'https://*.supabase.co', 'https://*.daily.co', 'wss://*.daily.co'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        // Allows the sermon player to embed YouTube's privacy-enhanced player
        // inline, and the /live page to embed a Daily.co call inline.
        frameSrc: ["'self'", 'https://www.youtube-nocookie.com', 'https://*.daily.co'],
        workerSrc: ["'self'", 'blob:'],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // relax only if you embed iframes
    // Helmet's default is 'no-referrer', which YouTube's embedded player
    // rejects with "Error 153: Video player configuration error" (it now
    // requires a referrer to validate embed requests). Each YouTube iframe
    // also sets referrerPolicy="strict-origin-when-cross-origin" directly
    // as a second line of defense, but setting it here too means any new
    // embed added later doesn't have to remember to do that itself.
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  })
);

app.use(express.json({ limit: '10kb' }));         // block oversized payloads
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/registration', registrationRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/outreach-stories', outreachStoryRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/sermons', sermonRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/live', liveRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'BLW Campus Ministry API is running' });
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(clientDist));

  app.get('*', (req, res) => {
    if (req.originalUrl.startsWith('/api/')) {
      return res.status(404).json({ error: 'API route not found.' });
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.use((err, req, res, next) => {
  console.error('[server] unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.originalUrl,
  });
  res.status(500).json({ error: 'Internal server error.' });
});

const start = async () => {
  try {
    await initDb();
    console.log('Postgres/Supabase database initialized');
  } catch (err) {
    console.error('Failed to initialize database', err);
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

start();
