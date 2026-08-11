# BLW Kenya Zone — Render → Cloudflare Workers migration

This project is prepared to move the existing BLW website from a traditional Render
Node/Express server to Cloudflare Workers while keeping the existing PostgreSQL/Supabase
database.

## Architecture

- React + Vite frontend: `client/`
- Express API: `server/`
- Cloudflare Worker entrypoint: `worker/index.js`
- Static assets: Cloudflare Workers Assets from `client/dist`
- Existing PostgreSQL/Supabase database: connected through Cloudflare Hyperdrive
- Existing Supabase Storage: retained for outreach photos

Cloudflare's current Express Workers guidance uses `httpServerHandler` and the
`nodejs_compat` flag. Cloudflare Hyperdrive supports PostgreSQL and `pg`, so the
existing database can remain in place.

## Important: no database migration is required

The Worker is designed to connect to the same PostgreSQL database currently used by
the Render deployment. Do NOT create a second database unless you intentionally want
one.

## One-time Cloudflare setup

1. Create/log into a Cloudflare account.
2. Add the domain you want to use to Cloudflare DNS.
3. Create a Hyperdrive configuration pointing at the SAME PostgreSQL connection string
   currently stored as `DATABASE_URL` on Render.

   Example command:

   `npx wrangler hyperdrive create blw-kenya-db --connection-string="YOUR_DATABASE_URL"`

4. Copy the Hyperdrive ID into `wrangler.jsonc`, replacing:
   `REPLACE_WITH_YOUR_HYPERDRIVE_ID`

5. Configure Worker secrets:

   - `JWT_SECRET`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

   And variables:

   - `SUPABASE_STORAGE_BUCKET=outreach-photos`
   - `ALLOWED_ORIGIN=https://YOUR-DOMAIN`

6. Build and deploy:

   `npm install`
   `npm run deploy`

7. Attach the custom domain to the Worker in Cloudflare.

## Local development

For normal Node/Express development, the existing `server/server.js` still works.

For Cloudflare local development, copy `.dev.vars.example` to `.dev.vars`, fill in
the required values, configure a local/remote Hyperdrive binding as appropriate,
then run:

`npm run dev`

## Frontend API URL

The web app now uses same-origin `/api/...` requests by default. This is intentional:
the Cloudflare Worker serves both the React assets and the API.

For the Capacitor Android/iOS app, set:

`VITE_API_BASE_URL=https://YOUR-DOMAIN`

before creating the mobile build, because the native app's bundled UI does not share
the website's browser origin.

## Render cutover

Keep Render running until the Cloudflare deployment is confirmed.

Recommended order:

1. Configure Hyperdrive.
2. Configure secrets.
3. Deploy Cloudflare.
4. Test `/api/health`, login, registration, sermons, events, uploads and live page.
5. Attach the production custom domain.
6. Confirm the website and API work.
7. Only then remove/disable the Render service.

## Security

No real production secrets, private `.env` files, release keys, or keystores are
included in this migration ZIP.
