import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCalendar, FiCheckCircle, FiFilm, FiImage, FiMapPin, FiRadio, FiSearch, FiShield, FiLock, FiUsers, FiX, FiDownload, FiZap } from 'react-icons/fi';
import { MdQrCodeScanner, MdFlashlightOn } from 'react-icons/md';
import jsQR from 'jsqr';
import { useAuth } from '../context/AuthContext';
import { useIsAdmin } from '../hooks/useIsAdmin';
import { apiFetch } from '../config/api';
import { fetchAllMembers, searchMembers, checkInMember, syncOfflineCheckins } from '../utils/members';
import { getOfflineCheckinQueue } from '../utils/offlineCheckin';
import { fetchEvents } from '../utils/events';
import NotificationCenter from './NotificationCenter';
import FellowshipLocationsAdminSecure from './FellowshipLocationsAdminSecure';
import LiveStreamAdminPanel from './LiveStreamAdminPanel';
import ContentAdminPanel from './ContentAdminPanel';
import { Card, Eyebrow } from '../components/ui/Card';

const tools = [
  { label: 'Check Attendance', description: 'Search members, scan QR badges, and record attendance.', icon: FiCheckCircle, path: 'attendance' },
  { label: 'Manage Events', description: 'Open administrator content tools.', icon: FiCalendar, path: 'admin-events' },
  { label: 'Manage Outreach', description: 'Open administrator content tools.', icon: FiImage, path: 'admin-outreach' },
  { label: 'Manage Sermons', description: 'Open administrator content tools.', icon: FiFilm, path: 'admin-sermons' },
  { label: 'Manage Fellowship Locations', description: 'Add and update fellowship locations.', icon: FiMapPin, path: 'fellowship' },
  { label: 'Manage Service Venues', description: 'Open administrator content tools.', icon: FiMapPin, path: 'admin-venues' },
  { label: 'Manage Live Stream', description: 'Update the title, stream links, and live status.', icon: FiRadio, path: 'live' },
  { label: 'Push Notifications', description: 'Send announcements to registered devices.', icon: FiBell, path: 'notifications' },
];

function AccessDenied() {
  const navigate = useNavigate();
  return <section className="mx-auto max-w-xl px-5 py-20 text-center"><Card variant="raised" className="p-8"><FiShield className="mx-auto h-10 w-10 text-red-300"/><Eyebrow className="mt-5">Restricted access</Eyebrow><h1 className="mt-2 text-3xl font-extrabold text-white">Administrator access required</h1><p className="mt-3 text-sm leading-relaxed text-white/50">Leaders Forum management tools are available only to accounts marked as administrators.</p><button onClick={() => navigate('/auth')} className="mt-6 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15">Sign in with an authorized account</button></Card></section>;
}

function feedbackTone(kind) {
  try {
    if (navigator.vibrate) navigator.vibrate(kind === 'success' ? [55] : [35, 45, 35]);
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = kind === 'success' ? 880 : 300;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.13);
    setTimeout(() => ctx.close().catch(() => {}), 250);
  } catch { /* feedback is optional */ }
}

function parseQRPayload(raw) {
  const parts = String(raw || '').split('|');
  const membershipId = String(parts[0] || '').trim();
  if (!membershipId) return null;
  return { membershipId, name: String(parts[1] || '').trim() };
}

function CSVDownload({ members, event }) {
  const exportCsv = () => {
    const date = new Date().toISOString().slice(0, 10);
    const rows = [
      ['Event', 'Event Date', 'Membership ID', 'Name', 'Chapter', 'Phone', 'Email', 'Checked In', 'Checked In At', 'Checked In By'],
      ...members.map((member) => [
        event?.title || 'Attendance',
        event?.date || '',
        member.membershipId,
        member.name,
        member.chapter || '',
        member.phone || '',
        member.email || '',
        member.checkedIn ? 'Yes' : 'No',
        member.checkedInAt || '',
        member.checkedInBy || '',
      ]),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `blw-attendance-${event?.date || date}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return <button onClick={exportCsv} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/[0.08]"><FiDownload/> CSV</button>;
}

function QRScannerPanel({ onCheckIn, onClose, checkedInCount, pendingCount, event }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const busyRef = useRef(false);
  const [scanning, setScanning] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [continuous, setContinuous] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [manual, setManual] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('scan');
  const timerRef = useRef(null);

  const stopCamera = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    busyRef.current = false;
    setScanning(false);
    setTorchAvailable(false);
    setTorchOn(false);
  }, []);

  const handleLookup = useCallback(async (membershipId, badgeName = '') => {
    setLoading(true);
    setError('');
    try {
      const matches = await searchMembers(membershipId, event?.id);
      const member = matches.find((item) => item.membershipId === membershipId) || matches[0];
      if (!member) {
        setError(`No member found for ${badgeName || membershipId}.`);
        return;
      }
      setResult({ member, confirmed: false });
    } catch (err) {
      setError(err.message || 'Unable to look up this member.');
    } finally {
      setLoading(false);
    }
  }, [event?.id]);

  const handleScannedData = useCallback(async (raw) => {
    stopCamera();
    const parsed = parseQRPayload(raw);
    if (!parsed) {
      setError('Invalid QR code — not a recognised BLW member badge.');
      feedbackTone('already');
      return;
    }
    await handleLookup(parsed.membershipId, parsed.name);
  }, [handleLookup, stopCamera]);

  const scanFrame = useCallback(() => {
    if (!scanning || busyRef.current) {
      if (scanning) frameRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA || !video.videoWidth) {
      frameRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' });
    if (code?.data) {
      busyRef.current = true;
      void handleScannedData(code.data);
      return;
    }
    frameRef.current = requestAnimationFrame(scanFrame);
  }, [handleScannedData, scanning]);

  const startCamera = useCallback(async () => {
    setError('');
    setResult(null);
    try {
      stopCamera();
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera is unavailable on this device.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      const caps = track?.getCapabilities?.() || {};
      setTorchAvailable(caps.torch === true);
      if (!videoRef.current) throw new Error('Camera view is unavailable.');
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setScanning(true);
    } catch (err) {
      setError(err.message || 'Camera access was denied or is unavailable.');
    }
  }, [stopCamera]);

  useEffect(() => {
    if (scanning) frameRef.current = requestAnimationFrame(scanFrame);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [scanning, scanFrame]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks?.()[0];
    if (!track?.applyConstraints) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] });
      setTorchOn(next);
    } catch {
      setError('Flashlight control is not supported by this camera.');
    }
  };

  const lookupManual = async (value = manual) => {
    const raw = String(value || '').trim();
    if (!raw) return;
    await handleLookup(raw);
    setSuggestions([]);
  };

  const handleManualChange = (event) => {
    const value = event.target.value;
    setManual(value);
    setResult(null);
    setError('');
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value.trim()) { setSuggestions([]); return; }
    timerRef.current = setTimeout(async () => {
      try { setSuggestions((await searchMembers(value.trim(), event?.id)).slice(0, 6)); } catch { setSuggestions([]); }
    }, 250);
  };

  const confirmCheckIn = async () => {
    if (!result?.member || loading) return;
    if (result.member.checkedIn) {
      feedbackTone('already');
      setResult((current) => ({ ...current, confirmed: true, already: true }));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const updated = await onCheckIn(result.member.membershipId, result.member);
      const member = { ...result.member, ...(updated || {}), checkedIn: true };
      feedbackTone('success');
      setResult({ member, confirmed: true, already: false });
      if (continuous) {
        setTimeout(() => {
          setResult(null);
          setManual('');
          setError('');
          void startCamera();
        }, 450);
      }
    } catch (err) {
      setError(err.message || 'Unable to check in this member right now.');
      feedbackTone('already');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => () => {
    stopCamera();
    if (timerRef.current) clearTimeout(timerRef.current);
  }, [stopCamera]);

  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink-900/95 px-4 py-6">
    <Card variant="raised" className="relative w-full max-w-lg rounded-[2rem] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div><Eyebrow>Leaders tool</Eyebrow><h2 className="mt-1 text-xl font-bold text-white">Member Check-In</h2><p className="mt-1 text-xs text-white/40">{event?.title || 'Selected event'}{event?.date ? ` · ${event.date}` : ''} · {checkedInCount} checked in{pendingCount ? ` · ${pendingCount} pending sync` : ''}</p></div>
        <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/70" aria-label="Close scanner"><FiX/></button>
      </div>
      <div className="flex border-b border-white/10">
        <button onClick={() => { setTab('scan'); setResult(null); setError(''); }} className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition ${tab === 'scan' ? 'border-b-2 border-gold-500 text-gold-500' : 'text-white/45'}`}><MdQrCodeScanner/> Scan QR</button>
        <button onClick={() => { stopCamera(); setTab('manual'); setResult(null); setError(''); }} className={`flex flex-1 items-center justify-center gap-2 py-3 text-sm font-semibold transition ${tab === 'manual' ? 'border-b-2 border-gold-500 text-gold-500' : 'text-white/45'}`}><FiSearch/> Manual</button>
      </div>
      <div className="max-h-[78vh] overflow-y-auto p-5">
        {!result && tab === 'scan' && <>
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-black/50"><video ref={videoRef} className="h-full w-full object-cover" muted playsInline/><canvas ref={canvasRef} className="hidden"/>{scanning && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="h-52 w-52 rounded-2xl border-2 border-gold-500/70"/></div>}{!scanning && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"><MdQrCodeScanner className="h-14 w-14 text-white/25"/><p className="text-sm text-white/50">Camera inactive</p></div>}</div>
          <div className="mt-4 flex gap-2"><button onClick={() => void startCamera()} className="flex-1 rounded-2xl bg-gold-500 py-3 text-sm font-bold text-ink-900">{scanning ? 'Restart camera' : 'Start camera'}</button>{scanning && torchAvailable && <button onClick={() => void toggleTorch()} className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${torchOn ? 'border-gold-500 text-gold-500' : 'border-white/10 text-white/70'}`} aria-label="Toggle flashlight"><MdFlashlightOn/></button>}</div>
          <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"><span className="text-xs text-white/55">Continuous scan</span><button onClick={() => setContinuous((v) => !v)} className={`h-6 w-11 rounded-full p-1 transition ${continuous ? 'bg-emerald-500' : 'bg-white/15'}`}><span className={`block h-4 w-4 rounded-full bg-white transition ${continuous ? 'translate-x-5' : ''}`}/></button></div>
          <p className="mt-3 text-center text-xs text-white/35">Point the camera at the member's QR badge.</p>
        </>}
        {!result && tab === 'manual' && <div className="mt-5"><label className="text-sm font-semibold text-white">Manual lookup</label><div className="mt-2 flex gap-2"><input value={manual} onChange={handleManualChange} onKeyDown={(e) => { if (e.key === 'Enter') void lookupManual(); }} placeholder="Membership ID, name, phone, or email" className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"/><button onClick={() => void lookupManual()} disabled={loading} className="rounded-2xl bg-gold-500 px-4 py-3 text-sm font-bold text-ink-900">Find</button></div>{suggestions.length > 0 && <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">{suggestions.map((member) => <button key={member.membershipId} onClick={() => { setResult({ member, confirmed: false }); setSuggestions([]); }} className="block w-full border-b border-white/5 px-4 py-3 text-left last:border-0 hover:bg-white/[0.05]"><p className="text-sm font-semibold text-white">{member.name}</p><p className="text-xs text-white/40">{member.membershipId}{member.chapter ? ` · ${member.chapter}` : ''}</p></button>)}</div>}</div>}
        {error && <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
        {result?.member && <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.04] p-5"><Eyebrow>Member found</Eyebrow><h3 className="mt-2 text-2xl font-bold text-white">{result.member.name}</h3><p className="mt-1 text-sm text-white/45">{result.member.membershipId}{result.member.chapter ? ` · ${result.member.chapter}` : ''}</p>{result.already || result.member.checkedIn ? <div className="mt-5 rounded-2xl bg-amber-500/10 px-4 py-4 text-sm font-semibold text-amber-300">Already checked in for this event{result.member.checkedInAt ? ` at ${new Date(result.member.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}.</div> : result.confirmed ? <div className="mt-5 rounded-2xl bg-emerald-500/10 px-4 py-4 text-sm font-semibold text-emerald-300">Checked in successfully.</div> : <button onClick={() => void confirmCheckIn()} disabled={loading} className="mt-5 w-full rounded-2xl bg-emerald-500/20 py-3 text-sm font-bold text-emerald-200 disabled:opacity-50">{loading ? 'Checking in…' : 'Confirm Check-In'}</button>} {!continuous && <button onClick={() => { setResult(null); setManual(''); setError(''); }} className="mt-3 w-full rounded-2xl border border-white/10 py-3 text-sm font-semibold text-white/60">Scan another member</button>}</div>}
      </div>
    </Card>
  </div>;
}

function AttendancePanel() {
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const selectedEvent = useMemo(() => events.find((event) => String(event.id) === String(selectedEventId)) || null, [events, selectedEventId]);
  const refreshQueue = useCallback(async () => setPendingCount((await getOfflineCheckinQueue()).length), []);
  const refreshMembers = useCallback(async (eventId = selectedEventId) => {
    if (!eventId) { setMembers([]); return []; }
    const list = await fetchAllMembers(eventId);
    setMembers(list);
    return list;
  }, [selectedEventId]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setEventsLoading(true);
      try {
        const list = await fetchEvents();
        const sorted = [...list].sort((a, b) => `${a.date || ''} ${a.time || ''}`.localeCompare(`${b.date || ''} ${b.time || ''}`));
        if (!cancelled) {
          setEvents(sorted);
          const today = new Date().toISOString().slice(0, 10);
          const preferred = sorted.find((event) => event.date >= today) || sorted[sorted.length - 1];
          if (preferred) setSelectedEventId(String(preferred.id));
        }
      } catch (e) { if (!cancelled) setError(e.message || 'Unable to load events.'); }
      finally { if (!cancelled) setEventsLoading(false); }
    })();
    void refreshQueue();
    return () => { cancelled = true; };
  }, [refreshQueue]);
  useEffect(() => {
    setLoading(true);
    setError('');
    void refreshMembers(selectedEventId).catch((e) => setError(e.message || 'Unable to load attendance.')).finally(() => setLoading(false));
  }, [refreshMembers, selectedEventId]);
  useEffect(() => {
    const onOnline = async () => {
      try { await syncOfflineCheckins(); await refreshMembers(selectedEventId); } catch { /* banner handles connectivity */ }
      await refreshQueue();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [refreshMembers, refreshQueue, selectedEventId]);
  const checkIn = async (membershipId, memberHint = null, eventId = selectedEventId) => {
    if (!eventId) { setError('Select an event before checking members in.'); throw new Error('Select an event before checking members in.'); }
    setSaving(membershipId);
    setError('');
    try {
      const updated = await checkInMember(membershipId, memberHint, eventId);
      setMembers((current) => current.map((member) => member.membershipId === membershipId ? { ...member, ...updated, checkedIn: true } : member));
      await refreshQueue();
      return updated;
    } catch (e) { setError(e.message || 'Unable to check in this member.'); throw e; }
    finally { setSaving(''); }
  };
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((member) => [member.name, member.email, member.phone, member.membershipId, member.chapter].some((value) => String(value || '').toLowerCase().includes(q)));
  }, [members, query]);
  const checkedInCount = members.filter((member) => member.checkedIn).length;
  return <>
    <Card variant="raised" className="p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-3"><FiUsers className="text-emerald-300"/><div><Eyebrow>Attendance</Eyebrow><h2 className="text-xl font-bold text-white">Member check-in</h2><p className="text-xs text-white/40">{selectedEvent ? `${selectedEvent.title} · ${selectedEvent.date || 'No date'}` : 'Select an event'} · {checkedInCount} checked in</p></div></div><div className="flex gap-2"><CSVDownload members={members} event={selectedEvent}/><button disabled={!selectedEventId} onClick={() => { setError(''); setScannerOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold-500 px-4 py-3 text-sm font-bold text-ink-900 disabled:cursor-not-allowed disabled:opacity-50"><MdQrCodeScanner className="h-5 w-5"/> Scan QR</button></div></div>
      <div className="mt-5"><label className="text-xs font-semibold uppercase tracking-wider text-white/40">Attendance event</label><select value={selectedEventId} onChange={(e) => setSelectedEventId(e.target.value)} disabled={eventsLoading} className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none disabled:opacity-50"><option value="">{eventsLoading ? 'Loading events…' : 'Select an event'}</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title}{event.date ? ` · ${event.date}` : ''}{event.time ? ` · ${event.time}` : ''}</option>)}</select></div>
      {pendingCount > 0 && <div className="mt-4 flex items-center gap-2 rounded-2xl bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-300"><FiZap/> {pendingCount} check-in{pendingCount === 1 ? '' : 's'} pending sync{navigator.onLine ? ' — syncing when connection is ready.' : ' — device is offline.'}</div>}
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, ID, phone, or email" disabled={!selectedEventId} className="mt-5 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none disabled:opacity-50"/>
      {error && <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
      {!selectedEventId && !eventsLoading && <p className="mt-5 rounded-2xl border border-amber-400/10 bg-amber-400/5 px-4 py-4 text-sm text-amber-200">Choose an event before searching or checking members in.</p>}
      {loading ? <p className="mt-5 text-sm text-white/50">Loading attendance…</p> : <div className="mt-5 divide-y divide-white/5">{filtered.map((member) => <div key={member.membershipId} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{member.name}</p><p className="truncate text-xs text-white/45">{member.membershipId} · {member.chapter}</p></div>{member.checkedIn ? <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">Checked in</span> : <button disabled={saving === member.membershipId || !selectedEventId} onClick={() => void checkIn(member.membershipId, member)} className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 disabled:opacity-50">{saving === member.membershipId ? 'Saving…' : 'Check in'}</button>}</div>)}{!filtered.length && selectedEventId && <p className="py-8 text-center text-sm text-white/40">No members match your search.</p>}</div>}
    </Card>
    {scannerOpen && selectedEvent && <QRScannerPanel onCheckIn={checkIn} onClose={() => setScannerOpen(false)} checkedInCount={checkedInCount} pendingCount={pendingCount} event={selectedEvent}/>} 
  </>;
}

export default function LeadersForumWithFellowship() {
  const { loading } = useAuth();
  const { isAdmin, checking:checkingRole } = useIsAdmin();
  const [view, setView] = useState('dashboard');
  if (loading || checkingRole) return <div className="mx-auto max-w-xl px-5 py-20 text-center text-sm text-white/50">Checking administrator access…</div>;
  if (!isAdmin) return <AccessDenied />;
  return <section className="mx-auto max-w-6xl px-5 py-12"><div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><Eyebrow>Leaders Forum</Eyebrow><h1 className="mt-2 text-3xl font-extrabold text-white">Leadership Tools</h1><p className="mt-2 max-w-3xl text-sm text-white/45">Administrator-only management for attendance, content, fellowship locations, live streaming, and notifications.</p></div><button onClick={() => setView('dashboard')} className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white"><FiLock/> Admin session</button></div>{view === 'dashboard' && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{tools.map((tool) => { const Icon = tool.icon; return <Card as="button" key={tool.label} onClick={() => setView(tool.path)} variant="raised" className="p-5 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.06]"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-white">{tool.label}</h2><p className="mt-2 text-sm leading-relaxed text-white/45">{tool.description}</p></div><Icon className="h-6 w-6 shrink-0 text-purple-300"/></div></Card>; })}</div>}{view === 'attendance' && <><button onClick={() => setView('dashboard')} className="mb-4 text-sm text-white/50 hover:text-white">← Back</button><AttendancePanel/></>}{view === 'fellowship' && <><button onClick={() => setView('dashboard')} className="mb-4 text-sm text-white/50 hover:text-white">← Back</button><FellowshipLocationsAdminSecure/></>}{view === 'notifications' && <><button onClick={() => setView('dashboard')} className="mb-4 text-sm text-white/50 hover:text-white">← Back</button><NotificationCenter/></>}{view === 'live' && <><button onClick={() => setView('dashboard')} className="mb-4 text-sm text-white/50 hover:text-white">← Back</button><LiveStreamAdminPanel/></>}{view === 'admin-events' && <><button onClick={() => setView('dashboard')} className="mb-4 text-sm text-white/50 hover:text-white">← Back</button><ContentAdminPanel initialTab="events" onClose={() => setView('dashboard')}/></>}{view === 'admin-outreach' && <><button onClick={() => setView('dashboard')} className="mb-4 text-sm text-white/50 hover:text-white">← Back</button><ContentAdminPanel initialTab="outreach" onClose={() => setView('dashboard')}/></>}{view === 'admin-sermons' && <><button onClick={() => setView('dashboard')} className="mb-4 text-sm text-white/50 hover:text-white">← Back</button><ContentAdminPanel initialTab="sermons" onClose={() => setView('dashboard')}/></>}{view === 'admin-venues' && <><button onClick={() => setView('dashboard')} className="mb-4 text-sm text-white/50 hover:text-white">← Back</button><ContentAdminPanel initialTab="venues" onClose={() => setView('dashboard')}/></>}</section>;
}
