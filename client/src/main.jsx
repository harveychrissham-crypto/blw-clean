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
