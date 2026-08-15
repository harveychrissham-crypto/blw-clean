import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { initNative } from './native';
import { bindGlobalTapHaptics } from './utils/haptics';
import './index.css';

initNative();
bindGlobalTapHaptics();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

// Keep the animated gradient as the first app-controlled visual for a brief,
// guaranteed window so it is actually seen before the main UI fades in.
const BOOT_SPLASH_MIN_DURATION = 1800;
const bootSplashStartedAt = performance.now();

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    const elapsed = performance.now() - bootSplashStartedAt;
    const remaining = Math.max(0, BOOT_SPLASH_MIN_DURATION - elapsed);
    window.setTimeout(hideBootSplash, remaining);
  });
});

function hideBootSplash() {
  const el = document.getElementById('boot-splash');
  if (!el) return;
  el.classList.add('boot-splash-hide');
  el.addEventListener('transitionend', () => el.remove(), { once: true });
  window.setTimeout(() => el.remove(), 800);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
