import { httpServerHandler } from 'cloudflare:node';

let expressHandlerPromise;

async function getExpressHandler(workerEnv) {
  if (!expressHandlerPromise) {
    expressHandlerPromise = (async () => {
      // Populate the compatibility layer only while handling a request. Cloudflare
      // Workers disallows async/I/O work such as app.listen() during global startup.
      process.env.CLOUDFLARE_WORKERS = 'true';
      if (!process.env.NODE_ENV) process.env.NODE_ENV = 'production';
      process.env.DATABASE_URL = workerEnv.HYPERDRIVE?.connectionString || workerEnv.DATABASE_URL || '';
      process.env.JWT_SECRET = workerEnv.JWT_SECRET || process.env.JWT_SECRET || process.env.DATABASE_URL || '';
      process.env.SUPABASE_URL = workerEnv.SUPABASE_URL || '';
      process.env.SUPABASE_SERVICE_ROLE_KEY = workerEnv.SUPABASE_SERVICE_ROLE_KEY || '';
      process.env.SUPABASE_STORAGE_BUCKET = workerEnv.SUPABASE_STORAGE_BUCKET || 'outreach-photos';
      process.env.ALLOWED_ORIGIN = workerEnv.ALLOWED_ORIGIN || '';

      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET Cloudflare secret is required and no database connection is available as a fallback.');
      }
      if (!process.env.DATABASE_URL) {
        throw new Error('HYPERDRIVE binding is required.');
      }

      const { createApp } = await import('../server/server.js');
      const app = createApp({ serveStatic: false });

      // Keep Express behind Cloudflare's official Node compatibility adapter.
      app.listen(3000);
      return httpServerHandler({ port: 3000 });
    })();
  }

  return expressHandlerPromise;
}

export default {
  async fetch(request, workerEnv, ctx) {
    const url = new URL(request.url);

    // Static React/Vite assets are served by Cloudflare's native asset binding.
    if (!url.pathname.startsWith('/api/')) {
      return workerEnv.ASSETS.fetch(request);
    }

    const expressHandler = await getExpressHandler(workerEnv);
    return expressHandler.fetch(request, workerEnv, ctx);
  },
};
