import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.blwcampusministry.app',
  appName: 'BLW Kenya Zone',
  webDir: 'dist',

  // No `server.url` here on purpose: the UI ships inside the app bundle so
  // it opens instantly offline. All API calls go through src/config/api.js
  // (apiFetch), which targets the live backend explicitly regardless of
  // where the UI itself is running from.
  ios: {
    contentInset: 'automatic',
  },

  android: {
    allowMixedContent: false,
  },
};

export default config;
