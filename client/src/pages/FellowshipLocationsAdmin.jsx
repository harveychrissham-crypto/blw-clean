import { useEffect, useRef, useState } from 'react';
import { FiArrowLeft, FiCheck, FiEdit2, FiLoader, FiMapPin, FiPlus, FiSearch, FiTrash2, FiX } from 'react-icons/fi';
import { apiFetch } from '../config/api';

const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const DEFAULT_CENTER = [-1.286389, 36.817223];

function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) return resolve(window.L);
    if (!document.querySelector('link[data-blw-admin-leaflet]')) {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = LEAFLET_CSS;
      css.dataset.blwAdminLeaflet = 'true';
      document.head.appendChild(css);
    }
    const existing = document.querySelector('script[data-blw-admin-leaflet]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.L), { once: true });
      existing.addEventListener('error', reject, { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = LEAFLET_JS;
    script.async = true;
    script.dataset.blwAdminLeaflet = 'true';
    script.onload = () => window.L ? resolve(window.L) : reject(new Error('Map library failed to load.'));
    script.onerror = reject;
    document.body.appendChild(script);
  });
}

const emptyForm = {
  fellowshipName: '',
  country: 'Kenya',
  city: '',
  town: '',
  area: '',
  university: '',
  address: '',
  serviceTime: '',
  description: '',
  latitude: '',
  longitude: '',
  isActive: true,
};

function PinMap({ value, onChange }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(
        [Number(value.latitude) || DEFAULT_CENTER[0], Number(value.longitude) || DEFAULT_CENTER[1]],
        Number.isFinite(Number(value.latitude)) && Number.isFinite(Number(value.longitude)) ? 15 : 11,
      );
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);
      map.on('click', (event) => onChange({ latitude: event.latlng.lat.toFixed(6), longitude: event.latlng.lng.toFixed(6) }));
      mapRef.current = map;
      if (Number.isFinite(Number(value.latitude)) && Number.isFinite(Number(value.longitude))) {
        markerRef.current = L.marker([Number(value.latitude), Number(value.longitude)], { draggable: true }).addTo(map);
        markerRef.current.bindTooltip('Drag me to the exact fellowship location', { direction: 'top' });
        markerRef.current.on('dragend', () => {
          const p = markerRef.current.getLatLng();
          onChange({ latitude: p.lat.toFixed(6), longitude: p.lng.toFixed(6) });
        });
      }
      setTimeout(() => map.invalidateSize(), 80);
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (mapRef.current) mapRef.current.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const L = window.L;
    const lat = Number(value.latitude);
    const lng = Number(value.longitude);
    if (!map || !L || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const point = [lat, lng];
    if (!markerRef.current) {
      markerRef.current = L.marker(point, { draggable: true }).addTo(map);
      markerRef.current.bindTooltip('Drag me to the exact fellowship location', { direction: 'top' });
      markerRef.current.on('dragend', () => {
        const p = markerRef.current.getLatLng();
        onChange({ latitude: p.lat.toFixed(6), longitude: p.lng.toFixed(6) });
      });
    } else {
      markerRef.current.setLatLng(point);
    }
    map.setView(point, Math.max(map.getZoom(), 15), { animate: true });
  }, [value.latitude, value.longitude, onChange]);

  return <div ref={containerRef} className="h-[360px] w-full" />;
}

export default function FellowshipLocationsAdmin() {
  const [token, setToken] = useState(() => sessionStorage.getItem('blw_leader_admin_token') || '');
  const [code, setCode] = useState('');
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [mapQuery, setMapQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const authedFetch = async (path, options = {}) => apiFetch(path, {
    ...options,
    headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` },
  });

  const loadLocations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await authedFetch('/api/fellowships/admin');
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to load fellowship locations.');
      setLocations(Array.isArray(body.fellowships) ? body.fellowships : []);
    } catch (err) {
      setError(err.message || 'Unable to load fellowship locations.');
      if (String(err.message || '').toLowerCase().includes('leadership')) {
        sessionStorage.removeItem('blw_leader_admin_token');
        setToken('');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (token) loadLocations(); }, [token]);

  const unlock = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await apiFetch('/api/fellowships/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessCode: code.trim() }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Invalid leadership access code.');
      sessionStorage.setItem('blw_leader_admin_token', body.token);
      setToken(body.token);
      setCode('');
    } catch (err) {
      setError(err.message || 'Unable to unlock fellowship management.');
    } finally {
      setLoading(false);
    }
  };

  const setField = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  const updatePin = ({ latitude, longitude }) => setForm((current) => ({ ...current, latitude, longitude }));

  const searchMapPlace = async () => {
    const query = mapQuery.trim();
    if (query.length < 2) return;
    setError('');
    setMessage('Searching for the place…');
    try {
      const response = await apiFetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to search for that place.');
      const result = Array.isArray(body.results) ? body.results[0] : null;
      if (!result) throw new Error(`No map result found for “${query}”.`);
      updatePin({ latitude: Number(result.lat).toFixed(6), longitude: Number(result.lon).toFixed(6) });
      setMessage(`Map centered on ${result.displayName || query}. Click the map or drag the pin to the exact fellowship.`);
    } catch (err) {
      setError(err.message || 'Unable to search for that place.');
      setMessage('');
    }
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setMapQuery('');
    setMessage('');
  };

  const saveLocation = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (!Number.isFinite(Number(form.latitude)) || !Number.isFinite(Number(form.longitude))) {
        throw new Error('Place a pin on the map before saving.');
      }
      const response = await authedFetch(editingId ? `/api/fellowships/admin/${editingId}` : '/api/fellowships/admin', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to save fellowship location.');
      resetForm();
      await loadLocations();
      setMessage('Fellowship location saved successfully.');
    } catch (err) {
      setError(err.message || 'Unable to save fellowship location.');
    } finally {
      setSaving(false);
    }
  };

  const editLocation = (location) => {
    setEditingId(location.id);
    setForm({ ...emptyForm, ...location, latitude: String(location.latitude || ''), longitude: String(location.longitude || '') });
    setMessage('Edit mode: move the pin or update the details, then save.');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteLocation = async (location) => {
    if (!window.confirm(`Delete “${location.fellowshipName}”?`)) return;
    setError('');
    try {
      const response = await authedFetch(`/api/fellowships/admin/${location.id}`, { method: 'DELETE' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to delete fellowship location.');
      if (editingId === location.id) resetForm();
      await loadLocations();
      setMessage('Fellowship location removed.');
    } catch (err) {
      setError(err.message || 'Unable to delete fellowship location.');
    }
  };

  if (!token) {
    return (
      <section className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center px-4 py-16">
        <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#8A2BE2]/15 text-[#D8B2FF]"><FiMapPin className="h-7 w-7" /></div>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.35em] text-[#F2A31C]">Leaders tool</p>
            <h1 className="mt-2 text-2xl font-bold text-white">Manage Fellowship Locations</h1>
            <p className="mt-3 text-sm leading-relaxed text-white/45">Use the same leadership access code used for the Leaders Forum.</p>
          </div>
          <form onSubmit={unlock} className="space-y-4">
            <input value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" type="password" maxLength={12} autoFocus placeholder="Leadership access code" className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white outline-none focus:border-[#A53DFF]" />
            {error && <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
            <button disabled={loading || !code.trim()} className="w-full rounded-2xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] py-3 text-sm font-bold text-white disabled:opacity-50">{loading ? 'Checking…' : 'Enter Fellowship Manager'}</button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D8B2FF]">Leaders tool</p>
          <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Manage Fellowship Locations</h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/45">Search a town or university, then click the map to place the fellowship exactly where it meets. The pin is draggable for fine adjustment.</p>
        </div>
        <button onClick={() => { sessionStorage.removeItem('blw_leader_admin_token'); setToken(''); }} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/70 hover:bg-white/10"><FiX /> Sign out</button>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <form onSubmit={saveLocation} className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#F2A31C]">{editingId ? 'Edit fellowship' : 'Add fellowship'}</p><h2 className="mt-1 text-xl font-bold text-white">Place the pin on the map</h2></div>{editingId && <button type="button" onClick={resetForm} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-white/60 hover:bg-white/10"><FiArrowLeft /> New location</button>}</div>

          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input value={mapQuery} onChange={(event) => setMapQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); searchMapPlace(); } }} placeholder="Search Juja, Thika, Ruiru, JKUAT…" className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF]" />
            <button type="button" onClick={searchMapPlace} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/[0.07] px-5 py-3 text-sm font-semibold text-white hover:bg-white/10"><FiSearch /> Find place</button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20"><PinMap value={form} onChange={updatePin} /></div>
          <div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"><p className="text-[9px] uppercase tracking-[0.2em] text-white/30">Latitude</p><p className="mt-1 text-xs text-white/70">{form.latitude || 'Click the map'}</p></div><div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"><p className="text-[9px] uppercase tracking-[0.2em] text-white/30">Longitude</p><p className="mt-1 text-xs text-white/70">{form.longitude || 'Click the map'}</p></div></div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              ['fellowshipName', 'Fellowship name', 'e.g. JKUAT Fellowship'],
              ['country', 'Country', 'Kenya'],
              ['city', 'City', 'e.g. Nairobi'],
              ['town', 'Town', 'e.g. Juja'],
              ['area', 'Area', 'e.g. Gachororo'],
              ['university', 'University', 'e.g. JKUAT'],
              ['address', 'Address / landmark', 'e.g. Main campus gate'],
              ['serviceTime', 'Service time', 'e.g. Sundays 9:00 AM'],
            ].map(([key, label, placeholder]) => (
              <label key={key} className="block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">{label}</span><input value={form[key]} onChange={setField(key)} placeholder={placeholder} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-[#A53DFF]" /></label>
            ))}
          </div>
          <label className="mt-3 block"><span className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Description</span><textarea value={form.description} onChange={setField('description')} rows={3} placeholder="Anything members should know about this fellowship" className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-[#A53DFF]" /></label>

          {error && <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
          {message && <p className="mt-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{message}</p>}
          <button disabled={saving} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? <FiLoader className="h-4 w-4 animate-spin" /> : <FiCheck />} {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Save Fellowship Location'}</button>
        </form>

        <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#D8B2FF]">Saved locations</p><h2 className="mt-1 text-xl font-bold text-white">Fellowships on the map</h2></div><span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs font-semibold text-white/50">{locations.length}</span></div>
          {loading && <p className="text-sm text-white/40">Loading locations…</p>}
          {!loading && locations.length === 0 && <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center"><FiMapPin className="mx-auto h-7 w-7 text-white/20" /><p className="mt-3 text-sm text-white/40">No fellowship locations yet.</p></div>}
          <div className="space-y-2">
            {locations.map((location) => (
              <div key={location.id} className="rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                <div className="flex items-start gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8A2BE2]/10 text-[#D8B2FF]"><FiMapPin /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{location.fellowshipName}</p><p className="mt-0.5 truncate text-xs text-white/40">{[location.town || location.city, location.area, location.university].filter(Boolean).join(' • ')}</p></div></div>
                <div className="mt-3 flex gap-2"><button onClick={() => editLocation(location)} className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-2 text-xs font-semibold text-white/70 hover:bg-white/10"><FiEdit2 /> Edit / move pin</button><button onClick={() => deleteLocation(location)} className="inline-flex items-center justify-center rounded-xl border border-red-500/20 bg-red-500/5 px-3 text-red-300 hover:bg-red-500/10"><FiTrash2 /></button></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
