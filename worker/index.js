import { env } from 'cloudflare:workers';
import { httpServerHandler } from 'cloudflare:node';

// Cloudflare bindings are available through `env`, while the existing BLW
// server modules currently read configuration from process.env. Populate the
// compatibility layer before importing the Express application.
process.env.CLOUDFLARE_WORKERS = 'true';
process.env.NODE_ENV = 'production';
process.env.DATABASE_URL = env.HYPERDRIVE?.connectionString || env.DATABASE_URL || '';
process.env.JWT_SECRET = env.JWT_SECRET || '';
process.env.SUPABASE_URL = env.SUPABASE_URL || '';
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || '';
process.env.SUPABASE_STORAGE_BUCKET = env.SUPABASE_STORAGE_BUCKET || 'outreach-photos';
process.env.ALLOWED_ORIGIN = env.ALLOWED_ORIGIN || '';

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET Cloudflare secret is required.');
}
if (!process.env.DATABASE_URL) {
  throw new Error('HYPERDRIVE binding is required.');
}

const { createApp } = await import('../server/server.js');
const app = createApp({ serveStatic: false });

// Express listens on an internal port and Cloudflare's official Node adapter
// bridges it to the Workers fetch runtime.
app.listen(3000);
const expressHandler = httpServerHandler({ port: 3000 });

export default {
  async fetch(request, workerEnv, ctx) {
    const url = new URL(request.url);

    // Static React/Vite assets are served by Cloudflare's native asset binding.
    // Only /api/* goes through Express.
    if (!url.pathname.startsWith('/api/')) {
      return workerEnv.ASSETS.fetch(request);
    }

    return expressHandler.fetch(request, workerEnv, ctx);
  },
};
