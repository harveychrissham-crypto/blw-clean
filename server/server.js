import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import authRoutes from './routes/authRoutes.js';
import memberRoutes from './routes/memberRoutes.js';
import eventRoutes from './routes/eventRoutes.js';
import outreachStoryRoutes from './routes/outreachStoryRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';
import sermonRoutes from './routes/sermonRoutes.js';
import venueRoutes from './routes/venueRoutes.js';
import liveRoutes from './routes/liveRoutes.js';
import fellowshipRoutes from './routes/fellowshipRoutes.js';
import pushRoutes from './routes/pushRoutes.js';
import { initDb } from './db/index.js';

const CAPACITOR_ORIGINS = ['https://localhost','capacitor://localhost','http://localhost'];

export function createApp({ serveStatic = false } = {}) {
  const app = express();
  const configuredOrigins = (process.env.ALLOWED_ORIGIN || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173')).split(',').map((origin) => origin.trim()).filter(Boolean);
  const allowedOrigins = [...configuredOrigins, ...CAPACITOR_ORIGINS];
  app.use(cors({ origin(origin, callback) { if (!origin) return callback(null, true); if (allowedOrigins.includes(origin)) return callback(null, true); return callback(new Error(`Origin ${origin} not allowed by CORS`)); }, credentials: true, methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'], allowedHeaders: ['Content-Type','Authorization'] }));
  app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], scriptSrc: ["'self'",'blob:'], styleSrc: ["'self'","'unsafe-inline'"], imgSrc: ["'self'",'data:','blob:','https://*.supabase.co','https://i.ytimg.com'], connectSrc: ["'self'",'https://*.supabase.co','https://*.daily.co','wss://*.daily.co'], fontSrc: ["'self'"], objectSrc: ["'none'"], frameSrc: ["'self'",'https://www.youtube-nocookie.com','https://*.daily.co'], workerSrc: ["'self'",'blob:'], upgradeInsecureRequests: [] } }, crossOriginEmbedderPolicy: false, referrerPolicy: { policy: 'strict-origin-when-cross-origin' }, hsts: { maxAge: 31536000, includeSubDomains: true, preload: true } }));
  app.use(express.json({ limit: '10kb' }));
  app.use(express.urlencoded({ extended: true, limit: '10kb' }));
  app.use((req,_res,next)=>{ console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`); next(); });
  app.use('/api/auth', authRoutes);
  app.use('/api/members', memberRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/outreach-stories', outreachStoryRoutes);
  app.use('/api/uploads', uploadRoutes);
  app.use('/api/sermons', sermonRoutes);
  app.use('/api/venues', venueRoutes);
  app.use('/api/live', liveRoutes);
  app.use('/api/fellowships', fellowshipRoutes);
  app.use('/api/push', pushRoutes);
  app.get('/api/health', (_req,res)=>res.json({ status:'ok', message:'BLW Campus Ministry API is running' }));
  if (serveStatic) {
    const clientDist = path.join(__dirname,'..','client','dist');
    app.use(express.static(clientDist));
    app.get('*',(req,res)=>{ if(req.originalUrl.startsWith('/api/')) return res.status(404).json({error:'API route not found.'}); res.sendFile(path.join(clientDist,'index.html')); });
  }
  app.use((err,req,res,_next)=>{ console.error('[server] unhandled error',{message:err.message,stack:err.stack,path:req.originalUrl}); res.status(500).json({error:'Internal server error.'}); });
  return app;
}

export async function startLocal() {
  const app=createApp({serveStatic:process.env.NODE_ENV==='production'});
  const PORT=process.env.PORT||5000;
  try { await initDb(); console.log('Postgres/Supabase database initialized'); } catch(err) { console.error('Failed to initialize database',err); process.exit(1); }
  app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));
}

if (process.env.CLOUDFLARE_WORKERS !== 'true') startLocal();
