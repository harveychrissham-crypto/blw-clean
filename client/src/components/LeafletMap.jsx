const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

export const NAIROBI_CENTER = [-1.286389, 36.817223];

export function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) return resolve(window.L);
    if (!document.querySelector('link[data-blw-leaflet]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = LEAFLET_CSS; css.dataset.blwLeaflet = 'true';
      document.head.appendChild(css);
    }
    const existing = document.querySelector('script[data-blw-leaflet]');
    if (existing) {
      existing.addEventListener('load', () => window.L ? resolve(window.L) : reject(new Error('Map library failed to load.')), { once: true });
      existing.addEventListener('error', () => reject(new Error('Map library failed to load.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = LEAFLET_JS; script.async = true; script.dataset.blwLeaflet = 'true';
    script.onload = () => window.L ? resolve(window.L) : reject(new Error('Map library failed to load.'));
    script.onerror = () => reject(new Error('Map library failed to load.'));
    document.body.appendChild(script);
  });
}

