import secureWorker from './secure-entry.js';
import { sendPushNotification } from './push-send.js';
import { corsHeaders } from './security.js';

function normalizeResponse(request, env, response) {
  const headers = new Headers(response.headers);
  headers.delete('access-control-allow-origin');
  headers.delete('access-control-allow-credentials');
  headers.delete('access-control-allow-methods');
  headers.delete('access-control-allow-headers');
  headers.delete('vary');

  const normalizedCors = corsHeaders(request, env);
  for (const [key, value] of Object.entries(normalizedCors)) headers.set(key, value);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/push/send' && (request.method === 'POST' || request.method === 'OPTIONS')) {
      return normalizeResponse(request, env, await sendPushNotification(request, env));
    }
    return normalizeResponse(request, env, await secureWorker.fetch(request, env, ctx));
  },

  async scheduled(controller, env, ctx) {
    if (typeof secureWorker.scheduled === 'function') {
      return secureWorker.scheduled(controller, env, ctx);
    }
  },
};
