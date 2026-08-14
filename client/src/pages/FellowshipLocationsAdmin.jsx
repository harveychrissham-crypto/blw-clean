import { useEffect, useRef, useState } from 'react';
import { FiArrowLeft, FiCheck, FiEdit2, FiLoader, FiPlus, FiSearch, FiTrash2, FiX } from 'react-icons/fi';
import { apiFetch } from '../config/api';
import { Card, Eyebrow } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';

const LEADER_CODE = '1120363';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const DEFAULT_CENTER = [-1.286389, 36.817223];
const emptyForm = { fellowshipName: '', country: 'Kenya', city: '', town: '', area: '', university: '', address: '', serviceTime: '', description: '', latitude: '', longitude: '', isActive: true };

function loadLeaflet() {
  return new Promise((resolve, reject) => {
    if (window.L) return resolve(window.L);
    if (!document.querySelector('link[data-blw-admin-leaflet]')) { const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = LEAFLET_CSS; css.dataset.blwAdminLeaflet = 'true'; document.head.appendChild(css); }
    const script = document.querySelector('script[data-blw-admin-leaflet]') || document.createElement('script');
    script.src = LEAFLET_JS; script.async = true; script.dataset.blwAdminLeaflet = 'true'; script.onload = () => resolve(window.L); script.onerror = reject; if (!script.parentNode) document.body.appendChild(script);
  });
}

function redPinIcon(L, opacity = 1) {
  return L.divIcon({
    className: 'blw-red-pin-icon',
    html: `<div style="width:28px;height:28px;background:#dc2626;border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 9px rgba(0,0,0,.5);position:relative"><span style="position:absolute;left:6px;top:6px;width:10px;height:10px;border-radius:50%;background:#fff;opacity:${opacity}"></span></div>`,
    iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -28],
  });
}

function addEditableMarker(L, map, point, onChange, markerRef) {
  markerRef.current = L.marker(point, { draggable: true, icon: redPinIcon(L, 0.85) }).addTo(map);
  markerRef.current.bindTooltip('Drag me to the exact fellowship location', { direction: 'top' });
  markerRef.current.on('dragend', () => { const p = markerRef.current.getLatLng(); onChange({ latitude: p.lat.toFixed(6), longitude: p.lng.toFixed(6) }); });
}

function escapeHtml(value) { return String(value ?? '').replace(/[&<>\"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char])); }

function addSavedMarker(L, map, location) {
  const lat = Number(location.latitude), lng = Number(location.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const marker = L.marker([lat, lng], { icon: redPinIcon(L, 1), interactive: true }).addTo(map);
  const details = [location.fellowshipName, location.university, location.town || location.area, location.serviceTime].filter(Boolean).join(' • ');
  marker.bindPopup(`<strong>${escapeHtml(location.fellowshipName || 'Fellowship')}</strong>${details ? `<br/><span>${escapeHtml(details)}</span>` : ''}`);
  marker.bindTooltip(location.fellowshipName || 'Fellowship location', { direction: 'top' });
  return marker;
}

function PinMap({ value, locations, onChange }) {
  const containerRef = useRef(null), mapRef = useRef(null), markerRef = useRef(null), savedMarkersRef = useRef([]);
  useEffect(() => {
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !containerRef.current) return;
      const lat = Number(value.latitude), lng = Number(value.longitude), has = Number.isFinite(lat) && Number.isFinite(lng);
      const map = L.map(containerRef.current).setView(has ? [lat, lng] : DEFAULT_CENTER, has ? 15 : 11);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors', maxZoom: 19 }).addTo(map);
      map.on('click', (e) => onChange({ latitude: e.latlng.lat.toFixed(6), longitude: e.latlng.lng.toFixed(6) }));
      mapRef.current = map;
      if (has) addEditableMarker(L, map, [lat, lng], onChange, markerRef);
      setTimeout(() => map.invalidateSize(), 100);
    }).catch(() => {});
    return () => { cancelled = true; if (mapRef.current) mapRef.current.remove(); mapRef.current = null; markerRef.current = null; savedMarkersRef.current = []; };
  }, []);
  useEffect(() => {
    const map = mapRef.current, L = window.L;
    if (!map || !L) return;
    savedMarkersRef.current.forEach((marker) => marker.remove());
    savedMarkersRef.current = locations.map((location) => addSavedMarker(L, map, location)).filter(Boolean);
  }, [locations]);
  useEffect(() => {
    const map = mapRef.current, L = window.L, lat = Number(value.latitude), lng = Number(value.longitude);
    if (!map || !L || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
    if (!markerRef.current) addEditableMarker(L, map, [lat, lng], onChange, markerRef); else markerRef.current.setLatLng([lat, lng]);
    if (markerRef.current) markerRef.current.setIcon(redPinIcon(L, 0.85));
    map.setView([lat, lng], Math.max(map.getZoom(), 15), { animate: true });
  }, [value.latitude, value.longitude]);
  return <div ref={containerRef} className="h-[360px] w-full" />;
}

export default function FellowshipLocationsAdmin() {
  const [token, setToken] = useState(() => sessionStorage.getItem('blw_leader_admin_token') || '');
  const [authenticating, setAuthenticating] = useState(false), [locations, setLocations] = useState([]), [form, setForm] = useState(emptyForm), [editingId, setEditingId] = useState(null), [mapQuery, setMapQuery] = useState(''), [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('');
  useEffect(() => { if (token) return; let cancelled = false; (async () => { setAuthenticating(true); try { const response = await apiFetch('/api/fellowships/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessCode: LEADER_CODE }) }); const body = await response.json().catch(() => ({})); if (!response.ok || !body.token) throw new Error(body.error || 'Leadership session could not be established.'); if (!cancelled) { sessionStorage.setItem('blw_leader_admin_token', body.token); setToken(body.token); } } catch (err) { if (!cancelled) setError(err.message || 'Leadership session could not be established.'); } finally { if (!cancelled) setAuthenticating(false); } })(); return () => { cancelled = true; }; }, [token]);
  const authedFetch = (path, options = {}) => apiFetch(path, { ...options, headers: { ...(options.headers || {}), Authorization: `Bearer ${token}` } });
  const loadLocations = async () => { if (!token) return; setLoading(true); try { const r = await authedFetch('/api/fellowships/admin'); const b = await r.json().catch(() => ({})); if (!r.ok) throw new Error(b.error || 'Unable to load fellowship locations.'); setLocations(Array.isArray(b.fellowships) ? b.fellowships : []); } catch (e) { setError(e.message); } finally { setLoading(false); } };
  useEffect(() => { if (token) loadLocations(); }, [token]);
  const setField = key => e => setForm(f => ({ ...f, [key]: e.target.value }));
  const updatePin = p => setForm(f => ({ ...f, ...p }));
  const searchMapPlace = async () => { const q = mapQuery.trim(); if (q.length < 2) return; setError(''); setMessage('Searching for the place…'); try { const r = await apiFetch(`/api/geocode?q=${encodeURIComponent(q)}`); const b = await r.json().catch(() => ({})); if (!r.ok) throw new Error(b.error || 'Unable to search for that place.'); const result = b.results?.[0]; if (!result) throw new Error(`No map result found for “${q}”.`); updatePin({ latitude: Number(result.lat).toFixed(6), longitude: Number(result.lon).toFixed(6) }); setMessage(`Map centered on ${result.displayName || q}. Click the map or drag the red pin to the exact fellowship.`); } catch (e) { setError(e.message); setMessage(''); } };
  const resetForm = () => { setForm(emptyForm); setEditingId(null); setMapQuery(''); };
  const saveLocation = async e => { e.preventDefault(); setSaving(true); setError(''); setMessage(''); try { const latitude = Number(form.latitude), longitude = Number(form.longitude); if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('Place a pin on the map before saving.'); const payload = { ...form, latitude, longitude, country: form.country || 'Kenya' }; const r = await authedFetch(editingId ? `/api/fellowships/admin/${editingId}` : '/api/fellowships/admin', { method: editingId ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const b = await r.json().catch(() => ({})); if (!r.ok) throw new Error(b.error || 'Unable to save fellowship location.'); const saved = b.fellowship; if (saved) setLocations(current => editingId ? current.map(item => item.id === saved.id ? saved : item) : [...current, saved]); setMessage(`Fellowship saved at ${latitude.toFixed(6)}, ${longitude.toFixed(6)}.`); resetForm(); await loadLocations(); } catch (err) { setError(err.message); } finally { setSaving(false); } };
  const editLocation = l => { setEditingId(l.id); setForm({ ...emptyForm, ...l, latitude: String(l.latitude ?? ''), longitude: String(l.longitude ?? '') }); setMessage('Edit mode: move the red pin or update the details, then save.'); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const deleteLocation = async l => { if (!window.confirm(`Delete “${l.fellowshipName}”?`)) return; try { const r = await authedFetch(`/api/fellowships/admin/${l.id}`, { method: 'DELETE' }); const b = await r.json().catch(() => ({})); if (!r.ok) throw new Error(b.error || 'Unable to delete fellowship location.'); if (editingId === l.id) resetForm(); await loadLocations(); } catch (e) { setError(e.message); } };
  if (!token) return <section className="mx-auto max-w-3xl px-4 py-20 text-center"><FiLoader className="mx-auto h-8 w-8 animate-spin text-[#D8B2FF]" /><h1 className="mt-4 text-xl font-bold text-white">Opening Fellowship Manager…</h1><p className="mt-2 text-sm text-white/45">Using your Leaders Forum session.</p>{error && <p className="mx-auto mt-4 max-w-md rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}</section>;
  return <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8"><div className="mb-8 flex items-start justify-between gap-4"><div><Eyebrow color="#D8B2FF">Leaders tool</Eyebrow><h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">Manage Fellowship Locations</h1><p className="mt-3 max-w-3xl text-sm leading-relaxed text-white/45">Search a town or university, click the exact fellowship location, drag the red pin to fine-tune it, and save the fellowship details. Saved fellowships appear as red pins.</p></div><button onClick={() => { sessionStorage.removeItem('blw_leader_admin_token'); setToken(''); }} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white/70"><FiX /> Close session</button></div><div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]"><Card as="form" onSubmit={saveLocation} variant="raised" className="p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><Eyebrow>{editingId ? 'Edit fellowship' : 'Add fellowship'}</Eyebrow><h2 className="mt-1 text-xl font-bold text-white">Place the pin on the map</h2></div>{editingId && <button type="button" onClick={resetForm} className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-white/60"><FiArrowLeft /> New location</button>}</div><div className="mb-4 flex flex-col gap-2 sm:flex-row"><input value={mapQuery} onChange={e => setMapQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); searchMapPlace(); } }} placeholder="Search Juja, Thika, Ruiru, JKUAT…" className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none" /><button type="button" onClick={searchMapPlace} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/[0.07] px-5 py-3 text-sm font-semibold text-white"><FiSearch /> Find place</button></div><div className="overflow-hidden rounded-2xl border border-white/10 bg-black/20"><PinMap value={form} locations={locations} onChange={updatePin} /></div><div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"><p className="text-[9px] uppercase tracking-[0.2em] text-white/30">Latitude</p><p className="mt-1 text-xs text-white/70">{form.latitude || 'Click the map'}</p></div><div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"><p className="text-[9px] uppercase tracking-[0.2em] text-white/30">Longitude</p><p className="mt-1 text-xs text-white/70">{form.longitude || 'Click the map'}</p></div></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-white/55">Fellowship Name *</span><input required value={form.fellowshipName} onChange={setField('fellowshipName')} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white" /></label><label><span className="mb-1 block text-xs font-semibold text-white/55">University</span><input value={form.university} onChange={setField('university')} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white" /></label><label><span className="mb-1 block text-xs font-semibold text-white/55">Town / Area</span><input value={form.town} onChange={setField('town')} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white" /></label><label><span className="mb-1 block text-xs font-semibold text-white/55">Service Time</span><input value={form.serviceTime} onChange={setField('serviceTime')} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white" /></label><label><span className="mb-1 block text-xs font-semibold text-white/55">Address / Landmark</span><input value={form.address} onChange={setField('address')} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white" /></label><label className="sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-white/55">Description</span><textarea value={form.description} onChange={setField('description')} rows={3} className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white" /></label></div>{error && <p className="mt-5 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}{message && <p className="mt-5 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{message}</p>}<button disabled={saving} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] py-3.5 text-sm font-bold text-white disabled:opacity-50">{saving ? <FiLoader className="animate-spin" /> : <FiCheck />}{saving ? 'Saving…' : editingId ? 'Save Changes' : 'Save Fellowship'}</button></Card><Card as="aside" variant="raised" className="p-5 sm:p-6"><div className="mb-5 flex items-center justify-between"><div><Eyebrow>Saved locations</Eyebrow><h2 className="mt-1 text-xl font-bold text-white">Fellowship pins</h2></div>{loading && <FiLoader className="animate-spin text-white/40" />}</div><div className="space-y-3">{locations.map(l => <Card key={l.id} variant="subtle" className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-white">{l.fellowshipName}</p><p className="mt-1 text-xs text-white/45">{[l.university, l.town || l.area, l.serviceTime].filter(Boolean).join(' • ')}</p><p className="mt-2 text-[10px] text-white/25">{Number(l.latitude).toFixed(6)}, {Number(l.longitude).toFixed(6)}</p></div><div className="flex gap-1"><button type="button" onClick={() => editLocation(l)} className="rounded-lg p-2 text-white/50 hover:bg-white/10"><FiEdit2 /></button><button type="button" onClick={() => deleteLocation(l)} className="rounded-lg p-2 text-white/50 hover:bg-white/10"><FiTrash2 /></button></div></div></Card>)}{!locations.length && !loading && <EmptyState icon={FiPlus} title="No fellowship locations yet" hint="Saved fellowships will appear here as red pins." />}</div></Card></div></section>;
}
