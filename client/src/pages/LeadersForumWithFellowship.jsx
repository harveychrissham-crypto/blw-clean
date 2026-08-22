import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCalendar, FiCheckCircle, FiClock, FiFilm, FiImage, FiMapPin, FiRadio, FiSearch, FiShield, FiLock, FiUsers, FiX, FiDownload, FiZap } from 'react-icons/fi';
import { MdQrCodeScanner, MdFlashlightOn } from 'react-icons/md';
import jsQR from 'jsqr';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import { fetchAllMembers, searchMembers, checkInMember } from '../utils/members';
import { getOfflineCheckinQueue, syncOfflineCheckins } from '../utils/offlineCheckin';
import NotificationCenter from './NotificationCenter';
import FellowshipLocationsAdminSecure from './FellowshipLocationsAdminSecure';
import { Card, Eyebrow } from '../components/ui/Card';

const tools = [
  { label: 'Check Attendance', description: 'Search members, scan QR badges, and record attendance.', icon: FiCheckCircle, path: 'attendance' },
  { label: 'Manage Events', description: 'Open administrator content tools.', icon: FiCalendar, path: 'admin' },
  { label: 'Manage Outreach', description: 'Open administrator content tools.', icon: FiImage, path: 'admin' },
  { label: 'Manage Sermons', description: 'Open administrator content tools.', icon: FiFilm, path: 'admin' },
  { label: 'Manage Fellowship Locations', description: 'Add and update fellowship locations.', icon: FiMapPin, path: 'fellowship' },
  { label: 'Manage Service Venues', description: 'Open administrator content tools.', icon: FiMapPin, path: 'admin' },
  { label: 'Manage Live Stream', description: 'Open administrator content tools.', icon: FiRadio, path: 'admin' },
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
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.13);
    setTimeout(() => ctx.close().catch(() => {}), 250);
  } catch { /* optional feedback */ }
}

function parseQRPayload(raw) {
  const parts = String(raw || '').split('|');
  const membershipId = String(parts[0] || '').trim();
  if (!membershipId) return null;
  return { membershipId, name: String(parts[1] || '').trim() };
}

function CSVDownload({ members }) {
  const exportCsv = () => {
    const date = new Date().toISOString().slice(0, 10);
    const rows = [
      ['Membership ID', 'Name', 'Chapter', 'Phone', 'Email', 'Checked In', 'Checked In At', 'Checked In By'],
      ...members.map((member) => [member.membershipId, member.name, member.chapter || '', member.phone || '', member.email || '', member.checkedIn ? 'Yes' : 'No', member.checkedInAt || '', member.checkedInBy || '']),
    ];
    const csv = rows.map((row) => row.map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `blw-attendance-${date}.csv`; anchor.click(); URL.revokeObjectURL(url);
  };
  return <button onClick={exportCsv} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/[0.08]"><FiDownload/> CSV</button>;
}

function QRScannerPanel({ onCheckIn, onClose, checkedInCount, pendingCount }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const busyRef = useRef(false);
  const closeStartYRef = useRef(null);
  const saveTimerRef = useRef(null);
  const [tab, setTab] = useState('scan');
  const [scanning, setScanning] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [continuous, setContinuous] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [manual, setManual] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanFlash, setScanFlash] = useState(null);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef(null);

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

  const triggerScanFeedback = useCallback((kind) => {
    setScanFlash(kind);
    feedbackTone(kind === 'success' ? 'success' : 'already');
    window.setTimeout(() => setScanFlash(null), 180);
  }, []);

  const handleLookup = useCallback(async (membershipId, badgeName = '') => {
    setLoading(true); setError('');
    try {
      const matches = await searchMembers(membershipId);
      const member = matches.find((item) => item.membershipId === membershipId) || matches[0];
      if (!member) { setError(`No member found for ${badgeName || membershipId}.`); return; }
      setResult({ member, confirmed: false, already: !!member.checkedIn });
      if (member.checkedIn) triggerScanFeedback('already');
    } catch (err) { setError(err.message || 'Unable to look up this member.'); }
    finally { setLoading(false); }
  }, [triggerScanFeedback]);

  const handleScannedData = useCallback(async (raw) => {
    stopCamera();
    const parsed = parseQRPayload(raw);
    if (!parsed) { setError('Invalid QR code — not a recognised BLW member badge.'); triggerScanFeedback('already'); return; }
    await handleLookup(parsed.membershipId, parsed.name);
  }, [handleLookup, stopCamera, triggerScanFeedback]);

  const scanFrame = useCallback(() => {
    if (!scanning || busyRef.current) {
      if (scanning) frameRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    const video = videoRef.current, canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA || !video.videoWidth) {
      frameRef.current = requestAnimationFrame(scanFrame); return;
    }
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const image = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(image.data, image.width, image.height, { inversionAttempts: 'attemptBoth' });
    if (code?.data) { busyRef.current = true; void handleScannedData(code.data); return; }
    frameRef.current = requestAnimationFrame(scanFrame);
  }, [handleScannedData, scanning]);

  const startCamera = useCallback(async () => {
    setError(''); setResult(null); setTab('scan');
    try {
      stopCamera();
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera is unavailable on this device.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      streamRef.current = stream;
      const track = stream.getVideoTracks()[0];
      const caps = track?.getCapabilities?.() || {};
      setTorchAvailable(caps.torch === true);
      if (!videoRef.current) throw new Error('Camera view is unavailable.');
      videoRef.current.srcObject = stream; await videoRef.current.play(); setScanning(true);
    } catch (err) { setError(err.message || 'Camera access was denied or is unavailable.'); }
  }, [stopCamera]);

  useEffect(() => {
    if (scanning) frameRef.current = requestAnimationFrame(scanFrame);
    return () => { if (frameRef.current) cancelAnimationFrame(frameRef.current); };
  }, [scanning, scanFrame]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks?.()[0]; if (!track?.applyConstraints) return;
    const next = !torchOn;
    try { await track.applyConstraints({ advanced: [{ torch: next }] }); setTorchOn(next); }
    catch { setError('Flashlight control is not supported by this camera.'); }
  };

  const switchTab = (next) => {
    setTab(next); setError(''); setSuggestions([]); setScanFlash(null);
    if (next === 'manual') { stopCamera(); setManual(''); }
    else { setManual(''); }
  };

  const handleManualChange = (event) => {
    const value = event.target.value; setManual(value); setError(''); setResult(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setSuggestions([]); return; }
    debounceRef.current = window.setTimeout(async () => {
      try { setSuggestions((await searchMembers(value.trim())).slice(0, 6)); }
      catch { setSuggestions([]); }
    }, 250);
  };

  const lookupManual = async (value = manual) => {
    const raw = String(value || '').trim(); if (!raw) return;
    await handleLookup(raw); setSuggestions([]);
  };

  const confirmCheckIn = async () => {
    if (!result?.member || saving) return;
    if (result.member.checkedIn || result.already) { triggerScanFeedback('already'); setResult((current) => ({ ...current, confirmed: true, already: true })); return; }
    setSaving(true); setError('');
    const startedAt = Date.now();
    try {
      const updated = await onCheckIn(result.member.membershipId, result.member);
      const elapsed = Date.now() - startedAt;
      const wait = Math.max(0, 400 - elapsed);
      saveTimerRef.current = window.setTimeout(() => {
        const member = { ...result.member, ...(updated || {}), checkedIn: true };
        setResult({ member, confirmed: true, already: false });
        triggerScanFeedback('success');
        setSaving(false);
        if (continuous) {
          window.setTimeout(() => { setResult(null); setManual(''); setError(''); void startCamera(); }, 420);
        }
      }, wait);
    } catch (err) {
      setSaving(false); setError(err.message || 'Unable to check in this member right now.'); triggerScanFeedback('already');
    }
  };

  const handleTouchStart = (event) => { closeStartYRef.current = event.touches?.[0]?.clientY ?? null; };
  const handleTouchEnd = (event) => {
    const startY = closeStartYRef.current; const endY = event.changedTouches?.[0]?.clientY ?? null;
    closeStartYRef.current = null;
    if (startY !== null && endY !== null && endY - startY > 100) onClose();
  };

  useEffect(() => () => {
    stopCamera();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
  }, [stopCamera]);

  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0d0c18]/95 px-3 py-4 sm:px-4 sm:py-6" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
    <Card variant="raised" className="relative w-full max-w-6xl overflow-hidden rounded-[2rem] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4 sm:px-6">
        <div><Eyebrow>Leaders tool</Eyebrow><h2 className="mt-1 text-xl font-bold text-white">Member Check-In</h2><p className="mt-1 text-xs text-white/40">{checkedInCount} checked in this session{pendingCount ? ` · ${pendingCount} pending sync` : ''}</p></div>
        <button onClick={onClose} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/70" aria-label="Close scanner"><FiX/></button>
      </div>

      <div className="flex border-b border-white/10">
        <button disabled={!!result} onClick={() => switchTab('scan')} className={`flex min-h-12 flex-1 items-center justify-center gap-2 text-sm font-semibold transition ${tab === 'scan' ? 'border-b-2 border-[#F2A31C] text-[#F2A31C]' : 'text-white/35'} ${result ? 'cursor-default opacity-60' : ''}`}><MdQrCodeScanner/> Scan QR</button>
        <button disabled={!!result} onClick={() => switchTab('manual')} className={`flex min-h-12 flex-1 items-center justify-center gap-2 text-sm font-semibold transition ${tab === 'manual' ? 'border-b-2 border-[#F2A31C] text-[#F2A31C]' : 'text-white/35'} ${result ? 'cursor-default opacity-60' : ''}`}><FiSearch/> Manual</button>
      </div>

      <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-start">
        <div className="min-w-0">
          {tab === 'scan' && !result && <>
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-black/50 sm:aspect-[4/3] lg:aspect-[4/3]">
              <video ref={videoRef} className="h-full w-full object-cover" muted playsInline/><canvas ref={canvasRef} className="hidden"/>
              {scanning && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className={`relative h-52 w-52 rounded-2xl border-2 transition-all duration-150 ${scanFlash === 'success' ? 'scale-105 border-emerald-400 opacity-100' : 'border-[#F2A31C]/80 animate-pulse'}`}>{['left-0 top-0','right-0 top-0','left-0 bottom-0','right-0 bottom-0'].map((position) => <span key={position} className={`absolute h-8 w-8 border-[#F2A31C] ${position} ${position.includes('left') ? 'border-l-[4px]' : 'border-r-[4px]'} ${position.includes('top') ? 'border-t-[4px]' : 'border-b-[4px]'} rounded-sm transition-colors duration-150 ${scanFlash === 'success' ? 'border-emerald-400' : ''}`}/>)}</div></div>}
              {!scanning && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3"><MdQrCodeScanner className="h-14 w-14 text-white/25"/><p className="text-sm text-white/50">Camera inactive</p></div>}
              {scanFlash && <div className={`pointer-events-none absolute inset-0 ${scanFlash === 'success' ? 'bg-emerald-400/25' : 'bg-amber-400/10'} animate-pulse`}/>} 
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => void startCamera()} className="flex min-h-14 flex-1 items-center justify-center rounded-2xl bg-[#F2A31C] px-4 text-sm font-bold text-[#0d0c18]">{scanning ? 'Restart camera' : 'Start camera'}</button>
              {scanning && <button onClick={stopCamera} className="min-h-14 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-semibold text-white/80">Stop scanning</button>}
              {scanning && torchAvailable && <button onClick={() => void toggleTorch()} className={`min-h-14 rounded-2xl border px-4 text-sm font-semibold ${torchOn ? 'border-[#F2A31C] text-[#F2A31C]' : 'border-white/10 text-white/70'}`} aria-label="Toggle flashlight"><MdFlashlightOn className="h-5 w-5"/></button>}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"><span className="text-xs text-white/55">Continuous scan</span><button onClick={() => setContinuous((v) => !v)} className={`h-7 w-12 rounded-full p-1 transition ${continuous ? 'bg-emerald-500' : 'bg-white/15'}`}><span className={`block h-5 w-5 rounded-full bg-white transition ${continuous ? 'translate-x-5' : ''}`}/></button></div>
            <p className="mt-3 text-center text-xs text-white/35">Point the camera at the member's QR badge.</p>
          </>}

          {tab === 'manual' && !result && <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><label className="text-sm font-semibold text-white">Manual lookup</label><div className="mt-2 flex gap-2"><input value={manual} onChange={handleManualChange} onKeyDown={(e) => { if (e.key === 'Enter') void lookupManual(); }} placeholder="Membership ID, name, phone, or email" className="min-h-14 min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm text-white outline-none"/><button onClick={() => void lookupManual()} disabled={loading} className="min-h-14 rounded-2xl bg-[#F2A31C] px-5 text-sm font-bold text-[#0d0c18]">{loading ? 'Finding…' : 'Find'}</button></div>{suggestions.length > 0 && <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">{suggestions.map((member, index) => <button key={member.membershipId} onClick={() => { setResult({ member, confirmed: false, already: !!member.checkedIn }); setSuggestions([]); }} className="block w-full border-b border-white/5 px-4 py-3 text-left last:border-0 hover:bg-white/[0.05]" style={{ animation: `suggestion-in 180ms ease both`, animationDelay: `${index * 30}ms` }}><p className="text-sm font-semibold text-white">{member.name}</p><p className="text-xs text-white/40">{member.membershipId}{member.chapter ? ` · ${member.chapter}` : ''}</p></button>)}</div>}</div>}
        </div>

        <div className="min-w-0">
          {error && <p className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}
          {result?.member && <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
            <Eyebrow>Member found</Eyebrow><h3 className="mt-2 text-2xl font-bold text-white">{result.member.name}</h3><p className="mt-1 text-sm text-white/45">{result.member.membershipId}{result.member.chapter ? ` · ${result.member.chapter}` : ''}</p>
            {result.already || result.member.checkedIn ? <div className="mt-5 rounded-2xl border border-amber-400/20 bg-amber-500/15 px-4 py-4 text-sm font-semibold text-amber-200"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-400/20"><FiCheckCircle className="h-5 w-5"/></span><div><p>Already checked in</p><p className="mt-1 text-xs font-normal text-amber-100/60">Today{result.member.checkedInAt ? ` at ${new Date(result.member.checkedInAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}</p></div></div></div> : result.confirmed ? <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-500/15 px-4 py-4 text-sm font-semibold text-emerald-200"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/20"><FiCheckCircle className="h-5 w-5"/></span><div><p>Checked in successfully</p><p className="mt-1 text-xs font-normal text-emerald-100/60">Attendance recorded for today</p></div></div></div> : <button onClick={() => void confirmCheckIn()} disabled={saving} className="mt-5 w-full min-h-14 rounded-2xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] py-3 text-sm font-bold text-white disabled:opacity-60">{saving ? 'Checking in…' : 'Confirm Check-In'}</button>}
            {!continuous && <button onClick={() => { setResult(null); setManual(''); setError(''); }} className="mt-3 w-full min-h-12 rounded-2xl border border-white/10 py-3 text-sm font-semibold text-white/60">Scan another member</button>}
          </div>}
          {!result && tab === 'scan' && <div className="mt-4 hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 lg:block"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/35">Door mode</p><p className="mt-2 text-sm text-white/55">Use continuous scan for a busy entrance. The result panel will confirm each member without leaving the camera workflow.</p></div>}
        </div>
      </div>
      <style>{`@keyframes suggestion-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </Card>
  </div>;
}

function AttendancePanel() {
  const [members, setMembers] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const refreshQueue = useCallback(async () => setPendingCount((await getOfflineCheckinQueue()).length), []);
  const refreshMembers = useCallback(async () => { const list = await fetchAllMembers(); setMembers(list); return list; }, []);
  useEffect(() => {
    void refreshMembers().catch((e) => setError(e.message || 'Unable to load members.')).finally(() => setLoading(false));
    void refreshQueue();
    const onOnline = async () => { try { await syncOfflineCheckins(); await refreshMembers(); } catch {} await refreshQueue(); };
    window.addEventListener('online', onOnline); return () => window.removeEventListener('online', onOnline);
  }, [refreshMembers, refreshQueue]);
  const checkIn = async (membershipId, memberHint = null) => {
    setSaving(membershipId); setError('');
    try { const updated = await checkInMember(membershipId, memberHint); setMembers((current) => current.map((member) => member.membershipId === membershipId ? { ...member, ...updated, checkedIn: true } : member)); await refreshQueue(); return updated; }
    catch (e) { setError(e.message || 'Unable to check in this member.'); throw e; }
    finally { setSaving(''); }
  };
  const filtered = useMemo(() => { const q = query.trim().toLowerCase(); if (!q) return members; return members.filter((member) => [member.name, member.email, member.phone, member.membershipId, member.chapter].some((value) => String(value || '').toLowerCase().includes(q))); }, [members, query]);
  const checkedInCount = members.filter((member) => member.checkedIn).length;
  return <><Card variant="raised" className="p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-center gap-3"><FiUsers className="text-emerald-300"/><div><Eyebrow>Attendance</Eyebrow><h2 className="text-xl font-bold text-white">Member check-in</h2><p className="text-xs text-white/40">{checkedInCount} checked in today</p></div></div><div className="flex gap-2"><CSVDownload members={members}/><button onClick={() => { setError(''); setScannerOpen(true); }} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#F2A31C] px-4 text-sm font-bold text-[#0d0c18]"><MdQrCodeScanner className="h-5 w-5"/> Scan QR</button></div></div>{pendingCount > 0 && <div className="mt-4 flex items-center gap-2 rounded-2xl bg-amber-500/10 px-4 py-3 text-xs font-semibold text-amber-300"><FiZap/> {pendingCount} check-in{pendingCount === 1 ? '' : 's'} pending sync{navigator.onLine ? ' — syncing when connection is ready.' : ' — device is offline.'}</div>}<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, ID, phone, or email" className="mt-5 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none"/>{error && <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}{loading ? <p className="mt-5 text-sm text-white/50">Loading members…</p> : <div className="mt-5 divide-y divide-white/5">{filtered.map((member) => <div key={member.membershipId} className="flex items-center gap-3 py-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-white">{member.name}</p><p className="truncate text-xs text-white/45">{member.membershipId} · {member.chapter}</p></div>{member.checkedIn ? <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">Checked in</span> : <button disabled={saving === member.membershipId} onClick={() => void checkIn(member.membershipId, member)} className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 disabled:opacity-50">{saving === member.membershipId ? 'Saving…' : 'Check in'}</button>}</div>)}{!filtered.length && <p className="py-8 text-center text-sm text-white/40">No members match your search.</p>}</div>}</Card>{scannerOpen && <QRScannerPanel onCheckIn={checkIn} onClose={() => setScannerOpen(false)} checkedInCount={checkedInCount} pendingCount={pendingCount}/>}</>;
}

export default function LeadersForumWithFellowship() {
  const { loading } = useAuth(); const [isAdmin, setIsAdmin] = useState(false); const [checkingRole, setCheckingRole] = useState(true); const [view, setView] = useState('dashboard');
  useEffect(() => { let cancelled = false; (async () => { try { const response = await apiFetch('/api/auth/admin-status'); const body = await response.json().catch(() => ({})); if (!cancelled) setIsAdmin(response.ok && body.isAdmin === true); } catch { if (!cancelled) setIsAdmin(false); } finally { if (!cancelled) setCheckingRole(false); } })(); return () => { cancelled = true; }; }, []);
  if (loading || checkingRole) return <div className="mx-auto max-w-xl px-5 py-20 text-center text-sm text-white/50">Checking administrator access…</div>;
  if (!isAdmin) return <AccessDenied />;
  return <section className="mx-auto max-w-6xl px-5 py-12"><div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><Eyebrow>Leaders Forum</Eyebrow><h1 className="mt-2 text-3xl font-extrabold text-white">Leadership Tools</h1><p className="mt-2 max-w-3xl text-sm text-white/45">Administrator-only management for attendance, content, fellowship locations, live streaming, and notifications.</p></div><button onClick={() => setView('dashboard')} className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white"><FiLock/> Admin session</button></div>{view === 'dashboard' && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{tools.map((tool) => { const Icon = tool.icon; return <Card as="button" key={tool.label} onClick={() => setView(tool.path)} variant="raised" className="p-5 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.06]"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-white">{tool.label}</h2><p className="mt-2 text-sm leading-relaxed text-white/45">{tool.description}</p></div><Icon className="h-6 w-6 shrink-0 text-[#D8B2FF]"/></div></Card>; })}</div>}{view === 'attendance' && <><button onClick={() => setView('dashboard')} className="mb-4 text-sm text-white/50 hover:text-white">← Back</button><AttendancePanel/></>}{view === 'fellowship' && <><button onClick={() => setView('dashboard')} className="mb-4 text-sm text-white/50 hover:text-white">← Back</button><FellowshipLocationsAdminSecure/></>}{view === 'notifications' && <><button onClick={() => setView('dashboard')} className="mb-4 text-sm text-white/50 hover:text-white">← Back</button><NotificationCenter/></>}{view === 'admin' && <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center"><FiShield className="mx-auto h-10 w-10 text-[#D8B2FF]"/><h2 className="mt-4 text-2xl font-bold text-white">Content administration</h2><p className="mt-2 text-sm text-white/45">The existing administrator dashboard remains available behind the same server-verified admin authorization.</p><button onClick={() => window.location.assign('/admin')} className="mt-5 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15">Open Admin Dashboard</button></div>}</section>;
}
