# BLW Kenya Zone — Render → Cloudflare Workers migration

This project has migrated its production API from the legacy Render/Node/Express path to Cloudflare Workers while keeping the existing PostgreSQL/Supabase database.

## Current production mode: Worker API, no domain required

The production API is served by the Cloudflare Worker at its `*.workers.dev` address. No custom domain is required for the current mobile deployment.

The Capacitor app bundles the UI directly into the APK/IPA and calls the Worker API using the configured API base URL. The website can be attached to a custom domain later without changing the core Worker architecture.

## Production Worker architecture

The active Worker entrypoint is `worker/push-entry.js`.

Dedicated production handlers now cover:

- authentication
- event-scoped attendance/check-ins
- events
- fellowships/geocoding
- venues
- sermons
- live streaming/viewers
- outreach stories
- uploads
- push registration/testing/sending
- scheduled service-reminder email jobs

The old `worker/index.js` and `worker/api-entry.js` compatibility layers have been removed from production and deleted from the repository. Keep new Worker API functionality in dedicated `worker/*-api.js` modules and route it through the active entrypoint rather than recreating a legacy fallback.

## Express server: local-development only

`server/` remains as the traditional Node/Express implementation for local development and compatibility tooling. It is **not the production API path**.

This means Worker and Express code can drift if both are edited independently. New production functionality should be implemented in the Worker first. When a local Express equivalent is needed, keep it explicitly documented as local-only and avoid treating it as the source of truth for Cloudflare behavior.

## Database

The production Worker uses the existing PostgreSQL/Supabase database through Cloudflare Hyperdrive. Do not create a second production database unless intentionally migrating the data model.

Attendance is event-scoped through the `checkins` table. A check-in records the member, Nairobi attendance date, event ID when applicable, timestamp, and the leader/account that performed the check-in.

## Worker configuration

Required production secrets/variables include the Worker JWT secret and the existing Supabase/Firebase configuration used by the app. `ALLOWED_ORIGIN` can remain empty while the site has no custom domain because the Worker security policy explicitly permits the Capacitor app origins used by Android/iOS.

When a custom domain is added, include that origin in `ALLOWED_ORIGIN`.

## Deployment

Production deployment is through GitHub → Cloudflare. Local Android/website deployment is not required for normal API changes.

Before relying on a new deployment, verify the GitHub Actions build check and then the Cloudflare deployment result.

## Security notes

- Production CORS uses a validated allowlist; arbitrary `Origin` values are never reflected with credentials.
- Member search requires authentication.
- Leader attendance and admin writes require an administrator session.
- Login and registration are rate limited with Cloudflare Worker rate-limit bindings.
- Uploads use an explicit image MIME allowlist and reject SVG uploads.
- The old duplicate/legacy Worker handlers have been removed from the production request path.

## Deferred

The frontend M-Pesa STK Push flow is intentionally deferred. Do not add placeholder credentials or a fake payment implementation; implement it only when the Daraja backend configuration is ready.
