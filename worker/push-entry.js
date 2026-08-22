import secureWorker from './secure-entry.js';
import { sendPushNotification } from './push-send.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/push/send' && (request.method === 'POST' || request.method === 'OPTIONS')) {
      return sendPushNotification(request, env);
    }
    return secureWorker.fetch(request, env, ctx);
  },

  async scheduled(controller, env, ctx) {
    if (typeof secureWorker.scheduled === 'function') {
      return secureWorker.scheduled(controller, env, ctx);
    }
  },
};
