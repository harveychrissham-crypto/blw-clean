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
  });
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
