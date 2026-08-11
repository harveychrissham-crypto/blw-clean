import { httpServerHandler } from 'cloudflare:node';

let expressHandlerPromise;

async function getExpressHandler(workerEnv) {
  if (!expressHandlerPromise) {
    expressHandlerPromise = (async () => {
      process.env.CLOUDFLARE_WORKERS = 'true';

      const databaseUrl = workerEnv.HYPERDRIVE?.connectionString || workerEnv.DATABASE_URL || '';
      const jwtSecret = workerEnv.JWT_SECRET || databaseUrl || '';

      process.env.DATABASE_URL = databaseUrl;
      process.env.JWT_SECRET = jwtSecret;
      process.env.SUPABASE_URL = workerEnv.SUPABASE_URL || '';
      process.env.SUPABASE_SERVICE_ROLE_KEY = workerEnv.SUPABASE_SERVICE_ROLE_KEY || '';
      process.env.SUPABASE_STORAGE_BUCKET = workerEnv.SUPABASE_STORAGE_BUCKET || 'outreach-photos';

      if (!databaseUrl) throw new Error('HYPERDRIVE/DATABASE_URL is required for the API.');
      if (!jwtSecret) throw new Error('JWT_SECRET is required for authentication.');

      const { createApp } = await import('../server/server.js');
      const app = createApp({ serveStatic: false });
      app.listen(3000);
      return httpServerHandler({ port: 3000 });
    })();
  }
  return expressHandlerPromise;
}

export default {
  async fetch(request, workerEnv, ctx) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith('/api/')) {
      return workerEnv.ASSETS.fetch(request);
    }

    // The browser uses same-origin /api requests. When Cloudflare has no
    // explicit ALLOWED_ORIGIN variable, use the current Worker origin.
    process.env.ALLOWED_ORIGIN = workerEnv.ALLOWED_ORIGIN || url.origin;

    try {
      const expressHandler = await getExpressHandler(workerEnv);
      return await expressHandler.fetch(request, workerEnv, ctx);
    } catch (error) {
      console.error('[worker] API request failed', error);
      return new Response(
        JSON.stringify({ error: 'API service is temporarily unavailable.' }),
        { status: 503, headers: { 'content-type': 'application/json; charset=utf-8' } }
      );
    }
  },
};
