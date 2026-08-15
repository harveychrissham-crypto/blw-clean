import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { initNative, hideSplashScreen } from './native';
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

// Two animation frames after render puts this after the browser has
// actually painted the mounted app -- not a fixed setTimeout guess -- so
// the native splash clears right as real content appears, not before.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    hideSplashScreen();
    hideBootSplash();
  });
});

// Fades out and removes the CSS boot splash (see index.html) now that real
// content is on screen. Fades rather than snapping away so the animated
// gradient hand off to the app feels like one continuous moment, not a cut.
function hideBootSplash() {
  const el = document.getElementById('boot-splash');
  if (!el) return;
  el.classList.add('boot-splash-hide');
  el.addEventListener('transitionend', () => el.remove(), { once: true });
  // Fallback in case transitionend doesn't fire (e.g. reduced-motion skips it).
  setTimeout(() => el.remove(), 800);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
