function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });
}

/**
 * Public, unauthenticated version-check endpoint used by the native app to
 * show an "update available" prompt. Values come from plain (non-secret)
 * Worker vars set in wrangler.jsonc - bump APP_LATEST_VERSION there (and
 * client/package.json's version, to keep them in sync) whenever a new
 * Android build is published, then redeploy.
 */
export async function handleAppVersion(request, env, url) {
  if (url.pathname !== '/api/app/version' || request.method !== 'GET') return null;
  const latestVersion = String(env.APP_LATEST_VERSION || '').trim();
  const minVersion = String(env.APP_MIN_VERSION || '').trim() || latestVersion;
  const updateUrl = String(env.APP_UPDATE_URL || '').trim();
  return json({ latest_version: latestVersion, min_version: minVersion, update_url: updateUrl });
}
