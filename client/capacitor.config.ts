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

  // Capacitor's own splash overlay is deliberately turned off (duration 0 +
  // autoHide) rather than tuned. It's a *static* bitmap that would otherwise
  // sit on top of the WebView and block the animated gradient boot screen
  // (client/index.html #boot-splash) from being seen until JS calls hide()
  // -- i.e. it would show a still gradient, then snap to the moving one,
  // which reads as two different splash screens back to back.
  //
  // What actually shows on launch is just: the OS-level Android 12+
  // SplashScreen (a brief, unavoidable navy background + badge icon --
  // see styles.xml's AppTheme.NoActionBarLaunch, that's an OS restriction,
  // not something this plugin controls) and then, the moment the WebView
  // starts painting, the animated gradient in index.html -- one continuous
  // moving-gradient startup, not a static frame followed by a moving one.
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#0d0c18',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
  },
};

export default config;