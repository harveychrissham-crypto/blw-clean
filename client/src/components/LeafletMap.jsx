import { useEffect, useRef, useState } from 'react';

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

export default function LeafletMap({ center = NAIROBI_CENTER, zoom = 12, height = 'h-64', onMapReady, onMapClick, children }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setError('');
    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(center, zoom);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
      if (onMapClick) map.on('click', onMapClick);
      mapRef.current = map;
      onMapReady?.(map, L);
      setTimeout(() => map.invalidateSize(), 100);
    }).catch((err) => { if (!cancelled) setError(err?.message || 'Map could not load.'); });
    return () => {
      cancelled = true;
      if (mapRef.current) mapRef.current.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && center) mapRef.current.setView(center, Math.max(mapRef.current.getZoom(), zoom), { animate: true });
  }, [center, zoom]);

  return <div className={`relative overflow-hidden ${height} w-full`}>
    <div ref={containerRef} className="h-full w-full" />
    {error && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/90 p-6 text-center"><div><p className="text-sm font-semibold text-white">Map couldn't load</p><p className="mt-1 text-xs text-white/50">Check your internet connection and try again.</p></div></div>}
    {children?.(mapRef.current, window.L)}
  </div>;
}
