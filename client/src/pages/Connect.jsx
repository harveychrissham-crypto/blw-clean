import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { FiNavigation, FiLoader, FiSearch, FiMapPin, FiAlertCircle } from 'react-icons/fi';
import { apiFetch } from '../config/api';
import { Card, Eyebrow } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';

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
      existing.addEventListener('load', () => window.L ? resolve(window.L) : reject(new Error('Map library failed to load.')), { once: true });
      existing.addEventListener('error', () => reject(new Error('Map library failed to load.')), { once: true });
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

function NearbyMap({ center, userLocation, fellowships, onError }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const [mapError, setMapError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setMapError('');
    loadLeaflet()
      .then((L) => {
        if (cancelled || !containerRef.current || mapRef.current) return;
        const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(center, 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);
        mapRef.current = map;
        setTimeout(() => map.invalidateSize(), 50);
      })
      .catch(() => {
        if (!cancelled) {
          const message = 'Map couldn’t load — check your connection and try again.';
          setMapError(message);
          onError?.(message);
        }
      });

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markersRef.current = [];
      }
    };
  }, [onError]);

  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;
    if (!map || !L || !center) return;

    map.setView(center, 12, { animate: true });
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (userLocation) {
      const marker = L.circleMarker(userLocation, {
        radius: 8,
        color: '#3D5AFE',
        fillColor: '#3D5AFE',
        fillOpacity: 0.9,
        weight: 3,
      }).addTo(map);
      marker.bindPopup('<strong>You are here</strong>');
      markersRef.current.push(marker);
    }

    fellowships.forEach((fellowship) => {
      const lat = Number(fellowship.latitude);
      const lng = Number(fellowship.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const marker = L.marker([lat, lng]).addTo(map);
      const place = [fellowship.town || fellowship.city, fellowship.area, fellowship.university]
        .filter(Boolean)
        .join(' • ');
      marker.bindPopup(`<strong>${fellowship.fellowshipName || 'Fellowship'}</strong><br/>${place || fellowship.country || ''}`);
      markersRef.current.push(marker);
    });

    const points = fellowships
      .map((f) => [Number(f.latitude), Number(f.longitude)])
      .filter(([lat, lng]) => Number.isFinite(lat) && Number.isFinite(lng));
    if (userLocation) points.push(userLocation);
    if (points.length > 1) map.fitBounds(points, { padding: [28, 28], maxZoom: 14 });
  }, [center, userLocation, fellowships]);

  if (mapError) {
    return (
      <div className="flex h-64 items-center justify-center bg-slate-950/70 px-6 text-center">
        <div>
          <FiAlertCircle className="mx-auto h-7 w-7 text-[#F2A31C]" />
          <p className="mt-3 text-sm font-semibold text-white">Map unavailable</p>
          <p className="mt-1 text-xs text-white/45">{mapError}</p>
        </div>
      </div>
    );
  }

  return <div ref={containerRef} className="h-64 w-full" />;
}

export default function Connect() {
  const [campusSearch, setCampusSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [userLocation, setUserLocation] = useState(null);
  const [nearbyFellowships, setNearbyFellowships] = useState([]);
  const [locating, setLocating] = useState(false);
  const [searching, setSearching] = useState(false);
  const [mapMessage, setMapMessage] = useState("Showing fellowships near Nairobi. Search a place or tap 'Where I am.'");

  const rankNearby = (lat, lng, all) => all
    .filter((item) => Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude)))
    .map((item) => ({
      ...item,
      distanceKm: distanceKm(lat, lng, Number(item.latitude), Number(item.longitude)),
    }))
    .filter((item) => item.distanceKm <= NEARBY_RADIUS_KM)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const applyNearbyLocation = (lat, lng, all, label = '', precise = false) => {
    setNearbyFellowships(rankNearby(lat, lng, all));
    setCenter([lat, lng]);
    setSelectedPlace(label || null);
    setMapMessage(
      precise
        ? `Showing fellowships within ${NEARBY_RADIUS_KM} km of you.`
        : `Showing nearby fellowships around ${label || 'this place'}.`,
    );
  };

  const fetchNearby = async (lat, lng, label = '') => {
    try {
      const response = await apiFetch('/api/fellowships');
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to load fellowship locations.');
      applyNearbyLocation(lat, lng, Array.isArray(body.fellowships) ? body.fellowships : [], label, label === 'Where I am');
    } catch (error) {
      setNearbyFellowships([]);
      setMapMessage(error.message || 'Unable to load nearby fellowships.');
    }
  };

  const fetchApproximateLocation = async () => {
    try {
      const response = await apiFetch('/api/fellowships?nearby=current');
      const body = await response.json().catch(() => ({}));
      const latitude = Number(body?.location?.latitude);
      const longitude = Number(body?.location?.longitude);
      if (!response.ok || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error('Approximate location is unavailable.');
      }
      setUserLocation(null);
      setCampusSearch('Where I am');
      applyNearbyLocation(
        latitude,
        longitude,
        Array.isArray(body.fellowships) ? body.fellowships : [],
        `Near ${body.location.city || 'your area'}`,
        false,
      );
      return true;
    } catch {
      return false;
    }
  };

  const searchPlace = async () => {
    const query = campusSearch.trim();
    if (query.length < 2 || searching) return;
    setSearching(true);
    setSuggestions([]);
    setUserLocation(null);
    setMapMessage(`Searching for ${query}...`);
    try {
      const [geoResponse, fellowshipResponse] = await Promise.all([
        apiFetch(`/api/geocode?q=${encodeURIComponent(query)}`),
        apiFetch('/api/fellowships'),
      ]);
      const geoBody = await geoResponse.json().catch(() => ({}));
      const fellowshipBody = await fellowshipResponse.json().catch(() => ({}));
      if (!geoResponse.ok) throw new Error(geoBody.error || 'Unable to search for that place.');
      const result = Array.isArray(geoBody.results) ? geoBody.results[0] : null;
      if (!result || !Number.isFinite(Number(result.lat)) || !Number.isFinite(Number(result.lon))) {
        throw new Error(`No map location was found for “${query}”.`);
      }
      const shortLabel = result.address?.town || result.address?.city || result.address?.municipality || result.address?.suburb || query;
      applyNearbyLocation(
        Number(result.lat),
        Number(result.lon),
        Array.isArray(fellowshipBody.fellowships) ? fellowshipBody.fellowships : [],
        shortLabel,
        false,
      );
    } catch (error) {
      setNearbyFellowships([]);
      setMapMessage(error.message || 'Unable to search for that place right now.');
    } finally {
      setSearching(false);
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
    setLocating(true);
    setMapMessage('Finding your location...');
    if (!navigator.geolocation) {
      fetchApproximateLocation().then((ok) => {
        setLocating(false);
        if (!ok) setMapMessage('Location is unavailable on this device.');
      });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        setUserLocation([coords.latitude, coords.longitude]);
        setCampusSearch('Where I am');
        setSuggestions([]);
        await fetchNearby(coords.latitude, coords.longitude, 'Where I am');
        setLocating(false);
      },
      async () => {
        const usedFallback = await fetchApproximateLocation();
        setLocating(false);
        if (!usedFallback) setMapMessage('We could not access precise location. Please allow location access and try again.');
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

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      searchPlace();
    }
  };

  const locationSummary = useMemo(
    () => selectedPlace === 'Where I am' ? 'Your current area' : selectedPlace || 'Nairobi',
    [selectedPlace],
  );

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <Card as={motion.div} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} variant="raised" className="p-8 shadow-soft">
          <div>
            <Eyebrow color="#D8B2FF">Campus Groups</Eyebrow>
            <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Find a fellowship near you.</h2>
            <p className="mt-4 text-lg text-slate-400">Search by country, city, town, area, university, or fellowship name.</p>

            <Card variant="subtle" className="mt-7 p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#8A2BE2]/15 text-[#D8B2FF]"><FiSearch className="h-5 w-5" /></div>
                <div>
                  <p className="text-sm font-bold text-white">Find your nearest fellowship</p>
                  <p className="text-xs text-white/60">Search a place or use your current location.</p>
                </div>
              </div>

              <div className="flex flex-col gap-3 lg:flex-row">
                <div className="relative min-w-0 flex-1">
                  <input
                    value={campusSearch}
                    onChange={(event) => {
                      setCampusSearch(event.target.value);
                      setSelectedPlace(null);
                      if (event.target.value !== 'Where I am') setUserLocation(null);
                    }}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3.5 text-sm text-white outline-none placeholder:text-white/30 transition focus:border-[#A53DFF]/70 focus:bg-slate-950"
                    placeholder="Try Juja, Thika, Ruiru or JKUAT"
                    autoComplete="off"
                  />
                  {suggestionsLoading && <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2"><FiLoader className="h-4 w-4 animate-spin text-white/35" /></div>}
                  {suggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-30 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                      {suggestions.map((location) => (
                        <button key={location.id} type="button" onClick={() => chooseSuggestion(location)} className="flex w-full items-start gap-3 border-b border-white/5 px-4 py-3.5 text-left transition last:border-b-0 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
                          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#8A2BE2]/15 text-[#D8B2FF]"><FiMapPin className="h-4 w-4" /></span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-white">{location.fellowshipName}</span>
                            <span className="mt-1 block truncate text-xs text-white/60">{[location.town || location.city, location.area, location.university, location.country].filter(Boolean).join(' • ')}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button type="button" onClick={searchPlace} disabled={searching || campusSearch.trim().length < 2} className="inline-flex min-w-[110px] items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] px-6 py-3.5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(138,43,226,0.2)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">{searching ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiSearch className="h-4 w-4" />} Search</button>
                <button type="button" onClick={useMyLocation} disabled={locating} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#8A2BE2]/30 bg-[#8A2BE2]/10 px-5 py-3.5 text-sm font-bold text-white transition hover:border-[#8A2BE2]/50 hover:bg-[#8A2BE2]/15 disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">{locating ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiNavigation className="h-4 w-4" />} Where I am</button>
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/50">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{locationSummary}</p>
                    <p className="mt-0.5 text-xs text-white/35">Fellowships within {NEARBY_RADIUS_KM} km</p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/55">{nearbyFellowships.length} nearby</span>
                </div>
                <NearbyMap center={center} userLocation={userLocation} fellowships={nearbyFellowships} onError={setMapMessage} />
                <p className="border-t border-white/10 px-4 py-3 text-xs text-white/45">{mapMessage}</p>
                {nearbyFellowships.length > 0 ? (
                  <div className="border-t border-white/10 p-3">
                    <div className="space-y-2">
                      {nearbyFellowships.slice(0, 6).map((location) => (
                        <Card key={location.id} variant="subtle" className="flex items-center justify-between gap-3 px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-white">{location.fellowshipName}</p>
                            <p className="truncate text-xs text-white/60">{[location.town || location.city, location.area, location.university].filter(Boolean).join(' • ')}</p>
                          </div>
                          <span className="shrink-0 text-xs font-semibold text-[#D8B2FF]">{location.distanceKm.toFixed(1)} km</span>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-white/10 px-4 py-4">
                    <EmptyState icon={FiMapPin} title="No nearby fellowships" hint={`Nothing is registered within ${NEARBY_RADIUS_KM} km of this location yet.`} />
                  </div>
                )}
              </div>
            </Card>
          </div>
        </Card>

        <Card variant="subtle" className="p-6">
          <div className="flex items-center gap-2 text-[#D8B2FF]"><FiMapPin /> Connect globally</div>
          <p className="mt-4 text-sm leading-relaxed text-slate-400">Search any town, area, university or fellowship, or use “Where I am” to see nearby fellowship locations on the map.</p>
        </Card>
      </div>
    </section>
  );
}
