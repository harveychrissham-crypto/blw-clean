import { httpServerHandler } from 'cloudflare:node';

let expressHandlerPromise;

async function getExpressHandler(workerEnv) {
  if (!expressHandlerPromise) {
    expressHandlerPromise = (async () => {
      // Configure the Node compatibility layer before importing the Express
      // application. The database module reads these values during import.
      process.env.CLOUDFLARE_WORKERS = 'true';

      const databaseUrl = workerEnv.HYPERDRIVE?.connectionString || workerEnv.DATABASE_URL || '';
      const jwtSecret = workerEnv.JWT_SECRET || databaseUrl || '';

      process.env.DATABASE_URL = databaseUrl;
      process.env.JWT_SECRET = jwtSecret;
      process.env.SUPABASE_URL = workerEnv.SUPABASE_URL || '';
      process.env.SUPABASE_SERVICE_ROLE_KEY = workerEnv.SUPABASE_SERVICE_ROLE_KEY || '';
      process.env.SUPABASE_STORAGE_BUCKET = workerEnv.SUPABASE_STORAGE_BUCKET || 'outreach-photos';
      process.env.ALLOWED_ORIGIN = workerEnv.ALLOWED_ORIGIN || '';

      if (!databaseUrl) {
        throw new Error('HYPERDRIVE/DATABASE_URL is required for the API.');
      }

      if (!jwtSecret) {
        throw new Error('JWT_SECRET is required for authentication.');
      }

      const { createApp } = await import('../server/server.js');

      // Do not run database schema initialization during Worker startup.
      // initDb() performs many sequential DDL queries and can make the first
      // API request time out, which previously surfaced to users as:
      // "API service is temporarily unavailable."
      // The production database is already provisioned and migrations should
      // be run separately rather than blocking every new Worker isolate.
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

    try {
      const expressHandler = await getExpressHandler(workerEnv);
      return await expressHandler.fetch(request, workerEnv, ctx);
    } catch (error) {
      console.error('[worker] API request failed', error);
      return new Response(
        JSON.stringify({ error: 'API service is temporarily unavailable.' }),
        {
          status: 503,
          headers: { 'content-type': 'application/json; charset=utf-8' },
        }
      );
    }
  },
};
