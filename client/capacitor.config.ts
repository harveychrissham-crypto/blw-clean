import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.blwcampusministry.app',
  appName: 'BLW Campus Ministry',
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

  // Keeps the native splash (matching the app's #0d0c18 background) visible
  // across the native-launch-to-WebView-ready gap. autoHide is off on
  // purpose: SplashScreen.hide() is called explicitly from native.js once
  // the app has actually mounted, not on a timer, so the splash never
  // outlives real content being ready.
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: false,
      backgroundColor: '#0d0c18',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;