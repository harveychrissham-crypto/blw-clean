import { useEffect, useMemo, useRef, useState } from 'react';
import { FiEdit2, FiMapPin, FiSave, FiTrash2, FiX } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import { SkeletonList } from '../components/ui/Skeleton';

const DEFAULT_CENTER = [-1.286389, 36.817223];
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

const emptyForm = {
  fellowshipName: '', country: 'Kenya', city: '', town: '', area: '', university: '',
  address: '', description: '', serviceTime: '', latitude: '', longitude: '', isActive: true,
};

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

function MapPicker({ latitude, longitude, onPick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const callbackRef = useRef(onPick);
  callbackRef.current = onPick;

  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current || mapRef.current) return;
      const hasCoords = Number.isFinite(latitude) && Number.isFinite(longitude);
      const center = hasCoords ? [latitude, longitude] : DEFAULT_CENTER;
      const map = L.map(containerRef.current, { scrollWheelZoom: true }).setView(center, hasCoords ? 16 : 6);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);
      map.on('click', (event) => callbackRef.current(event.latlng.lat, event.latlng.lng));
      mapRef.current = map;
      if (hasCoords) {
        markerRef.current = L.circleMarker(center, { radius: 9, color: '#EC2FA8', fillColor: '#8A2BE2', fillOpacity: 0.9 }).addTo(map);
      }
      setTimeout(() => map.invalidateSize(), 50);
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const valid = Number.isFinite(latitude) && Number.isFinite(longitude);
    if (!valid) return;
    const center = [latitude, longitude];
    map.setView(center, Math.max(map.getZoom(), 15), { animate: true });
    if (markerRef.current) markerRef.current.setLatLng(center);
    else {
      const L = window.L;
      markerRef.current = L.circleMarker(center, { radius: 9, color: '#EC2FA8', fillColor: '#8A2BE2', fillOpacity: 0.9 }).addTo(map);
    }
  }, [latitude, longitude]);

  return <div ref={containerRef} className="h-[480px] w-full" />;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const latitude = Number(form.latitude);
  const longitude = Number(form.longitude);
  const validCoords = Number.isFinite(latitude) && Number.isFinite(longitude);
  const countries = useMemo(() => [...new Set(locations.map((location) => location.country).filter(Boolean))], [locations]);

  const loadLocations = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch('/api/fellowships/admin');
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to load fellowship locations.');
      setLocations(Array.isArray(body.fellowships) ? body.fellowships : []);
    } catch (err) {
      setError(err.message || 'Unable to load fellowship locations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) loadLocations();
  }, [user?.isAdmin]);

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const resetForm = () => { setForm(emptyForm); setEditingId(null); };
  const pickLocation = (lat, lng) => {
    setField('latitude', lat.toFixed(6));
    setField('longitude', lng.toFixed(6));
    setNotice(`Map location set to ${lat.toFixed(6)}, ${lng.toFixed(6)}.`);
    setError('');
  };

  const startEdit = (location) => {
    setEditingId(location.id);
    setForm({ fellowshipName: location.fellowshipName || '', country: location.country || 'Kenya', city: location.city || '', town: location.town || '', area: location.area || '', university: location.university || '', address: location.address || '', description: location.description || '', serviceTime: location.serviceTime || '', latitude: location.latitude ?? '', longitude: location.longitude ?? '', isActive: location.isActive !== false });
    setNotice('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveLocation = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const path = editingId ? `/api/fellowships/admin/${editingId}` : '/api/fellowships/admin';
      const response = await apiFetch(path, { method: editingId ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, latitude: Number(form.latitude), longitude: Number(form.longitude) }) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to save fellowship location.');
      await loadLocations();
      setNotice(editingId ? 'Fellowship location updated.' : 'Fellowship location added.');
      resetForm();
    } catch (err) {
      setError(err.message || 'Unable to save fellowship location.');
    } finally {
      setSaving(false);
    }
  };

  const deleteLocation = async (id) => {
    if (!window.confirm('Delete this fellowship location?')) return;
    setError('');
    try {
      const response = await apiFetch(`/api/fellowships/admin/${id}`, { method: 'DELETE' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to delete fellowship location.');
      setLocations((current) => current.filter((location) => location.id !== id));
      if (editingId === id) resetForm();
      setNotice('Fellowship location deleted.');
    } catch (err) {
      setError(err.message || 'Unable to delete fellowship location.');
    }
  };

  if (!user?.isAdmin) {
    return (
      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-soft">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D8B2FF]">Admin Dashboard</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Administrator access required.</h1>
          <p className="mt-4 max-w-2xl text-base text-slate-400">Sign in with an administrator account to manage fellowship locations and map pins.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D8B2FF]">Admin Dashboard</p>
        <h1 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">Fellowship Locations</h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-slate-400">Add every fellowship as its own location. Towns, cities, estates, areas, and universities are all supported. Click the map to place the exact fellowship marker.</p>
      </div>

      {(error || notice) && <div className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${error ? 'border-red-500/20 bg-red-500/10 text-red-300' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'}`}>{error || notice}</div>}

      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={saveLocation} className="rounded-3xl border border-white/10 bg-slate-900/70 p-6 shadow-soft sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div><p className="text-xs font-bold uppercase tracking-widest text-[#F2A31C]">{editingId ? 'Edit location' : 'Add location'}</p><h2 className="mt-1 text-2xl font-bold text-white">{editingId ? 'Update fellowship' : 'New fellowship'}</h2></div>
            {editingId && <button type="button" onClick={resetForm} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"><FiX /> Cancel</button>}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ['fellowshipName', 'Fellowship name'], ['country', 'Country'], ['city', 'City'], ['town', 'Town'],
              ['area', 'Area / estate'], ['university', 'University / campus'], ['address', 'Address / landmark'], ['serviceTime', 'Service time'],
            ].map(([name, label]) => (
              <label key={name} className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/45">{label}</span><input value={form[name]} onChange={(event) => setField(name, event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF]" /></label>
            ))}
          </div>

          <label className="mt-4 block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/45">Description</span><textarea value={form.description} onChange={(event) => setField('description', event.target.value)} className="min-h-[100px] w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF]" /></label>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/45">Latitude</span><input value={form.latitude} onChange={(event) => setField('latitude', event.target.value)} inputMode="decimal" className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF]" /></label>
            <label><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/45">Longitude</span><input value={form.longitude} onChange={(event) => setField('longitude', event.target.value)} inputMode="decimal" className="w-full rounded-xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF]" /></label>
          </div>

          <label className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/75"><input type="checkbox" checked={form.isActive} onChange={(event) => setField('isActive', event.target.checked)} /> Show this fellowship in public search</label>
          <div className="mt-6 flex flex-wrap gap-3"><button type="submit" disabled={saving || !validCoords} className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] px-5 py-3 text-sm font-bold text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"><FiSave /> {saving ? 'Saving...' : editingId ? 'Save Changes' : 'Add Fellowship'}</button><button type="button" onClick={resetForm} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white/80 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"><FiMapPin /> Reset Form</button></div>
        </form>

        <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-4 shadow-soft sm:p-5">
          <div className="flex items-center justify-between gap-4 px-2 pb-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#F2A31C]">Map picker</p><h2 className="mt-1 text-xl font-bold text-white">Click the exact fellowship location</h2></div><span className="text-xs text-white/35">{countries.length} countries</span></div>
          <div className="overflow-hidden rounded-2xl border border-white/10"><MapPicker latitude={validCoords ? latitude : NaN} longitude={validCoords ? longitude : NaN} onPick={pickLocation} /></div>
          <p className="mt-3 px-2 text-xs text-white/35">Click anywhere on the map to set the pin. You can fine-tune the coordinates manually.</p>
        </div>
      </div>

      <div className="mt-10 rounded-3xl border border-white/10 bg-slate-900/70 p-5 shadow-soft sm:p-6">
        <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-[#F2A31C]">Locations</p><h2 className="mt-1 text-2xl font-bold text-white">All fellowship points</h2></div><span className="rounded-full bg-white/5 px-3 py-1 text-xs text-white/50">{locations.length} total</span></div>
        <div className="mt-5 space-y-3">{loading ? <SkeletonList rows={3} /> : locations.length === 0 ? <div className="py-8 text-center text-sm text-white/30">No fellowship locations have been added yet.</div> : locations.map((location) => (
          <div key={location.id} className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0"><div className="flex items-center gap-2"><FiMapPin className="h-4 w-4 shrink-0 text-[#D8B2FF]" /><h3 className="truncate text-base font-bold text-white">{location.fellowshipName}</h3></div><p className="mt-1 text-sm text-white/45">{[location.university, location.area || location.town || location.city, location.country].filter(Boolean).join(' • ')}</p>{location.latitude != null && <p className="mt-1 text-xs text-white/25">{location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}</p>}</div>
            <div className="flex shrink-0 gap-2"><button onClick={() => startEdit(location)} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-white/75 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"><FiEdit2 /> Edit</button><button onClick={() => deleteLocation(location.id)} className="inline-flex items-center gap-2 rounded-full border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"><FiTrash2 /> Delete</button></div>
          </div>
        ))}</div>
      </div>
    </section>
  );
}
