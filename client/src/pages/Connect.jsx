import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FiMail, FiPhone, FiMapPin, FiSend, FiHeart, FiChevronDown, FiNavigation, FiLoader, FiSearch } from 'react-icons/fi';
import { apiFetch } from '../config/api';

const tabs = ['Contact', 'Prayer Requests', 'Find a Campus Group'];
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const DEFAULT_CENTER = [-1.286389, 36.817223];
const NEARBY_RADIUS_KM = 25;

function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) return resolve(window.L);
    if (!document.querySelector('link[data-blw-leaflet]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = LEAFLET_CSS;
      css.dataset.blwLeaflet = 'true';
      document.head.appendChild(css);
    }
    const existing = document.querySelector('script[data-blw-leaflet]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.L), { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.dataset.blwLeaflet = 'true';
    script.onload = () => window.L ? resolve(window.L) : reject(new Error('Map library failed to load.'));
    script.onerror = () => reject(new Error('Map library failed to load.'));
    document.body.appendChild(script);
  });
}

const distanceKm = (aLat, aLng, bLat, bLng) => {
  const toRad = (n) => (n * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const aa = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
};

function NearbyMap({ center, userLocation, fellowships }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(center, 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
      mapRef.current = map;
      setTimeout(() => map.invalidateSize(), 50);
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = [];
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !L || !center) return;

    map.setView(center, 12, { animate: true });
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (userLocation) {
      const marker = L.circleMarker(userLocation, { radius: 8, color: '#3D5AFE', fillColor: '#3D5AFE', fillOpacity: 0.9, weight: 3 }).addTo(map);
      marker.bindPopup('<strong>You are here</strong>');
      markersRef.current.push(marker);
    }

    fellowships.forEach((fellowship) => {
      const lat = Number(fellowship.latitude);
      const lng = Number(fellowship.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const marker = L.marker([lat, lng]).addTo(map);
      const place = [fellowship.town || fellowship.city, fellowship.area, fellowship.university].filter(Boolean).join(' • ');
      marker.bindPopup(`<strong>${fellowship.fellowshipName || 'Fellowship'}</strong><br/>${place || fellowship.country || ''}`);
      markersRef.current.push(marker);
    });

    const points = fellowships.map((f) => [Number(f.latitude), Number(f.longitude)]).filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
    if (userLocation) points.push(userLocation);
    if (points.length > 1) map.fitBounds(points, { padding: [28, 28], maxZoom: 14 });
  }, [center, userLocation, fellowships]);

  return <div ref={containerRef} className="h-64 w-full" />;
}

export default function Connect() {
  const [activeTab, setActiveTab] = useState('Contact');
  const [campusSearch, setCampusSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyFellowships, setNearbyFellowships] = useState([]);
  const [locating, setLocating] = useState(false);
  const [mapMessage, setMapMessage] = useState('');

  const fetchNearby = async (lat, lng, label = '') => {
    setMapMessage('');
    try {
      const response = await apiFetch('/api/fellowships');
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to load fellowship locations.');
      const all = Array.isArray(body.fellowships) ? body.fellowships : [];
      const ranked = all
        .filter((item) => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)))
        .map((item) => ({ ...item, distanceKm: distanceKm(lat, lng, Number(item.latitude), Number(item.longitude)) }))
        .filter((item) => item.distanceKm <= NEARBY_RADIUS_KM)
        .sort((a, b) => a.distanceKm - b.distanceKm);
      setNearbyFellowships(ranked);
      setCenter([lat, lng]);
      setSelectedPlace(label || null);
    } catch (error) {
      setNearbyFellowships([]);
      setMapMessage(error.message || 'Unable to load nearby fellowships.');
    }
  };

  useEffect(() => {
    const query = campusSearch.trim();
    if (!query || query.length < 2 || selectedPlace === campusSearch) {
      setSuggestions([]);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const response = await apiFetch(`/api/fellowships?q=${encodeURIComponent(query)}`);
        const body = await response.json().catch(() => ({}));
        if (!cancelled) setSuggestions(Array.isArray(body.fellowships) ? body.fellowships.slice(0, 8) : []);
      } catch {
        if (!cancelled) setSuggestions([]);
      } finally {
        if (!cancelled) setSuggestionsLoading(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [campusSearch, selectedPlace]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setMapMessage('Location is not available on this device.');
      return;
    }
    setLocating(true);
    setMapMessage('Finding your location...');
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const location = [coords.latitude, coords.longitude];
        setUserLocation(location);
        setCampusSearch('Where I am');
        setSuggestions([]);
        await fetchNearby(coords.latitude, coords.longitude, 'Where I am');
        setMapMessage(`Showing fellowships within ${NEARBY_RADIUS_KM} km of you.`);
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        setMapMessage(error.code === error.PERMISSION_DENIED ? 'Location permission was denied. Please allow location access and try again.' : 'Unable to determine your location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
    );
  };

  const chooseSuggestion = async (location) => {
    const lat = Number(location.latitude);
    const lng = Number(location.longitude);
    const label = location.town || location.city || location.fellowshipName || 'Selected place';
    setCampusSearch(label);
    setSuggestions([]);
    setUserLocation(null);
    if (Number.isFinite(lat) && Number.isFinite(lng)) await fetchNearby(lat, lng, label);
  };

  const locationSummary = useMemo(() => selectedPlace === 'Where I am' ? 'Your current area' : selectedPlace || 'Search for a place or use your current location', [selectedPlace]);

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === tab ? 'bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] text-white shadow-[0_18px_40px_rgba(138,43,226,0.18)]' : 'border border-white/10 bg-white/5 text-slate-300'}`}>{tab}</button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-soft">
          {activeTab === 'Contact' && <div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D8B2FF]">Contact</p><h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">We would love to hear from you.</h2><div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-center gap-2 text-[#D8B2FF]"><FiMail /> Email</div><p className="mt-2 text-sm text-slate-400">hello@blwcampusministry.org</p></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-center gap-2 text-[#D8B2FF]"><FiPhone /> WhatsApp</div><p className="mt-2 text-sm text-slate-400">+254 700 000 000</p></div></div><form className="mt-6 space-y-4"><input className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none" placeholder="Your name" /><input className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none" placeholder="Email address" /><textarea className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none" placeholder="How can we help?" /><button className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] px-5 py-3 font-semibold text-white"><FiSend /> Send Message</button></form></div>}

          {activeTab === 'Prayer Requests' && <div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D8B2FF]">Prayer Requests</p><h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Bring your burdens before God.</h2><p className="mt-4 text-lg text-slate-400">We are committed to praying with you and standing in faith for every need.</p><textarea className="mt-6 min-h-[160px] w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none" placeholder="Share your request with our prayer team..." /><button className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] px-5 py-3 font-semibold text-white"><FiHeart /> Submit Request</button></div>}

          {activeTab === 'Find a Campus Group' && (
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D8B2FF]">Campus Groups</p>
              <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Find a fellowship near you.</h2>
              <p className="mt-4 text-lg text-slate-400">Search by country, city, town, area, university, or fellowship name.</p>

              <div className="mt-7 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.025] p-4 shadow-inner sm:p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8A2BE2]/15 text-[#D8B2FF]"><FiSearch className="h-5 w-5" /></div>
                  <div>
                    <p className="text-sm font-bold text-white">Find your nearest fellowship</p>
                    <p className="text-xs text-white/40">Search a place or use your current location.</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/70 px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition focus-within:border-[#A53DFF]/70 focus-within:bg-slate-950">
                    <FiMapPin className="h-4 w-4 shrink-0 text-[#D8B2FF]/70" />
                    <input value={campusSearch} onChange={(event) => { setCampusSearch(event.target.value); setSelectedPlace(null); if (event.target.value !== 'Where I am') setUserLocation(null); }} className="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-white/30" placeholder="Try Juja, Thika, Ruiru or JKUAT" autoComplete="off" />
                    {suggestionsLoading ? <FiLoader className="h-4 w-4 shrink-0 animate-spin text-white/35" /> : <FiChevronDown className="h-4 w-4 shrink-0 text-white/30" />}
                    {suggestions.length > 0 && <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/98 shadow-2xl shadow-black/40 backdrop-blur-xl">{suggestions.map((location) => <button key={location.id} type="button" onClick={() => chooseSuggestion(location)} className="flex w-full items-start gap-3 border-b border-white/5 px-4 py-3.5 text-left transition last:border-b-0 hover:bg-white/[0.05]"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#8A2BE2]/15 text-[#D8B2FF]"><FiMapPin className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-white">{location.fellowshipName}</span><span className="mt-1 block truncate text-xs text-white/40">{[location.town || location.city, location.area, location.university, location.country].filter(Boolean).join(' • ')}</span></span></button>)}</div>}
                  </div>
                  <button type="button" onClick={useMyLocation} disabled={locating} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#8A2BE2]/30 bg-[#8A2BE2]/10 px-5 py-3.5 text-sm font-bold text-white transition hover:border-[#8A2BE2]/50 hover:bg-[#8A2BE2]/15 disabled:opacity-60">{locating ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiNavigation className="h-4 w-4" />} Where I am</button>
                </div>

                {(selectedPlace || nearbyFellowships.length > 0 || mapMessage) && (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3"><div><p className="text-sm font-semibold text-white">{locationSummary}</p><p className="mt-0.5 text-xs text-white/35">Fellowships within {NEARBY_RADIUS_KM} km</p></div><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/55">{nearbyFellowships.length} nearby</span></div>
                    <NearbyMap center={center} userLocation={userLocation} fellowships={nearbyFellowships} />
                    {mapMessage && <p className="border-t border-white/10 px-4 py-3 text-xs text-white/45">{mapMessage}</p>}
                    {nearbyFellowships.length > 0 && <div className="border-t border-white/10 p-3"><div className="space-y-2">{nearbyFellowships.slice(0, 6).map((location) => <div key={location.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"><div className="min-w-0"><p className="truncate text-sm font-semibold text-white">{location.fellowshipName}</p><p className="truncate text-xs text-white/40">{[location.town || location.city, location.area, location.university].filter(Boolean).join(' • ')}</p></div><span className="shrink-0 text-xs font-semibold text-[#D8B2FF]">{location.distanceKm.toFixed(1)} km</span></div>)}</div></div>}
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>

        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#A53DFF]/10 to-[#8A2BE2]/10 p-6"><div className="flex items-center gap-2 text-[#D8B2FF]"><FiMapPin /> Connect globally</div><p className="mt-4 text-sm leading-relaxed text-slate-400">Search any town, area, university or fellowship, or use “Where I am” to see nearby fellowship locations on the map.</p></div>
      </div>
    </section>
  );
}
