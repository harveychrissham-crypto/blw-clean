import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { initNative } from './native';
import { initAppUpdateChecker } from './appUpdater';
import { bindGlobalTapHaptics } from './utils/haptics';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

initNative();
initAppUpdateChecker();
bindGlobalTapHaptics();

// hls.js was previously loaded from an external CDN via a classic <script>
// tag in index.html for Feed's reel/video HLS fallback (most Android
// WebViews lack native HLS support). That tag blocked HTML parsing on a
// live network request every cold start — directly against this app's own
// design goal of shipping fully inside the bundle so it opens instantly
// offline (see capacitor.config.ts) — and could stall the whole app on a
// blank white screen if that request was slow or failed. hls.js is already
// a proper bundled dependency (used in Live.jsx); expose the same bundled
// copy as window.Hls here instead. The inline HLS-attach script in
// index.html watches the DOM via MutationObserver, so it picks this up
// fine even though it technically loads after that script's initial scan —
// no video elements exist yet at that point anyway, since React hasn't
// mounted.
import('hls.js').then((mod) => { window.Hls = mod.default; }).catch(() => {});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

// The Android/iOS app ships its UI directly inside the native bundle and
// must not be intercepted by the website's service worker. Older installs
// may already have a registration, so actively remove it and its Cache API
// entries once on native startup as a one-time recovery from stale shells.
if ('serviceWorker' in navigator) {
  if (Capacitor.isNativePlatform()) {
    void navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .then(() => (typeof caches !== 'undefined' ? caches.keys() : []))
      .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      .catch(() => {});
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }
}
