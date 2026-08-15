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

// Once React has mounted, remove the CSS boot splash so the animated
// gradient is the only app-controlled startup screen shown before content.
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    hideBootSplash();
  });
});

function hideBootSplash() {
  const el = document.getElementById('boot-splash');
  if (!el) return;
  el.classList.add('boot-splash-hide');
  el.addEventListener('transitionend', () => el.remove(), { once: true });
  setTimeout(() => el.remove(), 800);
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
