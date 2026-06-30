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
  { initDb },
] = await Promise.all([
  import('./routes/authRoutes.js'),
  import('./routes/contentRoutes.js'),
  import('./routes/registrationRoutes.js'),
  import('./routes/memberRoutes.js'),
  import('./routes/eventRoutes.js'),
  import('./routes/outreachStoryRoutes.js'),
  import('./routes/uploadRoutes.js'),
  import('./db/index.js'),
]);

const app = express();
const PORT = process.env.PORT || 5000;
const clientDist = path.join(__dirname, '..', 'client', 'dist');

// ── CORS ─────────────────────────────────────────────────────────────────────
// In production, lock to your actual domain via ALLOWED_ORIGIN env var.
// In dev, allow localhost:5173 (Vite default).
const allowedOrigin =
  process.env.ALLOWED_ORIGIN ||
  (process.env.NODE_ENV === 'production' ? null : 'http://localhost:5173');

if (process.env.NODE_ENV === 'production' && !allowedOrigin) {
  throw new Error('ALLOWED_ORIGIN must be set in production (e.g. https://yourdomain.com)');
}

app.use(
  cors({
    origin: allowedOrigin,
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
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:', 'https://*.supabase.co'],
        connectSrc: ["'self'", 'https://*.supabase.co'],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false, // relax only if you embed iframes
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
