import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBell, FiCalendar, FiCheckCircle, FiFilm, FiImage, FiMapPin, FiRadio, FiSearch, FiUsers, FiShield, FiLock, FiX } from 'react-icons/fi';
import { MdQrCodeScanner } from 'react-icons/md';
import jsQR from 'jsqr';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import { fetchAllMembers, searchMembers, checkInMember } from '../utils/members';
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
  return (
    <section className="mx-auto max-w-xl px-5 py-20 text-center">
      <Card variant="raised" className="p-8">
        <FiShield className="mx-auto h-10 w-10 text-red-300" />
        <Eyebrow className="mt-5">Restricted access</Eyebrow>
        <h1 className="mt-2 text-3xl font-extrabold text-white">Administrator access required</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/50">Leaders Forum management tools are available only to accounts marked as administrators.</p>
        <button onClick={() => navigate('/auth')} className="mt-6 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15">
          Sign in with an authorized account
        </button>
      </Card>
    </section>
  );
}

function buildQRPayload(member) {
  return [member.membershipId, member.name, member.phone, member.email].join('|');
}

function parseQRPayload(raw) {
  const parts = String(raw || '').split('|');
  if (parts.length < 2 || !parts[0]?.trim()) return null;
  return {
    membershipId: parts[0].trim(),
    name: (parts[1] || '').trim(),
    phone: (parts[2] || '').trim(),
    email: (parts[3] || '').trim(),
  };
}

function QRScannerPanel({ onCheckIn, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const scanningRef = useRef(false);
  const scanBusyRef = useRef(false);
  const manualTimerRef = useRef(null);
  const [tab, setTab] = useState('scan');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [manualId, setManualId] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const stopCamera = useCallback(() => {
    scanningRef.current = false;
    scanBusyRef.current = false;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  const handleMemberLookup = useCallback(async (membershipId) => {
    const rawId = String(membershipId || '').trim();
    if (!rawId) return;
    setLookupLoading(true);
    setError('');
    setSuggestions([]);
    try {
      const matches = await searchMembers(rawId);
      const member = matches.find((item) => item.membershipId === rawId) || matches[0];
      if (!member) {
        setError(`No member found for "${rawId}".`);
        return;
      }
      setResult({ member, confirmed: false });
    } catch (err) {
      setError(err.message || `Unable to find member "${rawId}".`);
    } finally {
      setLookupLoading(false);
    }
  }, []);

  const handleScannedData = useCallback(async (raw) => {
    stopCamera();
    const parsed = parseQRPayload(raw);
    if (!parsed) {
      setError('Invalid QR code — not a recognised BLW member badge.');
      return;
    }
    setLookupLoading(true);
    setError('');
    try {
      const matches = await searchMembers(parsed.membershipId);
      const member = matches.find((item) => item.membershipId === parsed.membershipId) || matches[0];
      if (!member) {
        setError(`Scanned "${parsed.name || parsed.membershipId}", but that member is not in the registry.`);
        return;
      }
      setResult({ member, confirmed: false });
    } catch (err) {
      setError(err.message || 'Unable to look up the scanned member.');
    } finally {
      setLookupLoading(false);
    }
  }, [stopCamera]);

  const scanFrame = useCallback(() => {
    if (!scanningRef.current || scanBusyRef.current) {
      if (scanningRef.current) frameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      frameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    if (video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA || video.videoWidth === 0 || video.videoHeight === 0) {
      frameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) {
      frameRef.current = requestAnimationFrame(scanFrame);
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'attemptBoth' });

    if (code?.data) {
      scanBusyRef.current = true;
      void handleScannedData(code.data);
      return;
    }

    frameRef.current = requestAnimationFrame(scanFrame);
  }, [handleScannedData]);

  const startCamera = useCallback(async () => {
    setError('');
    setResult(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera scanning is unavailable on this device. Use Manual Entry instead.');
      return;
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (!videoRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        setError('Camera view is unavailable. Please try again.');
        return;
      }
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      scanningRef.current = true;
      setScanning(true);
      frameRef.current = requestAnimationFrame(scanFrame);
    } catch (err) {
      setError('Camera access was denied or is unavailable. Please allow camera access or use Manual Entry.');
    }
  }, [scanFrame, stopCamera]);

  const switchTab = (nextTab) => {
    stopCamera();
    setTab(nextTab);
    setError('');
    setResult(null);
    setSuggestions([]);
  };

  const handleManualChange = (event) => {
    const value = event.target.value;
    setManualId(value);
    setResult(null);
    setError('');
    if (manualTimerRef.current) clearTimeout(manualTimerRef.current);
    if (!value.trim()) {
      setSuggestions([]);
      return;
    }
    manualTimerRef.current = setTimeout(async () => {
      try {
        const matches = await searchMembers(value.trim());
        setSuggestions(matches.slice(0, 6));
      } catch {
        setSuggestions([]);
      }
    }, 250);
  };

  const confirmCheckIn = async () => {
    if (!result?.member || saving) return;
    setSaving(true);
    setError('');
    try {
      const updated = await onCheckIn(result.member.membershipId, result.member);
      setResult((current) => ({ ...current, member: { ...current.member, ...(updated || {}), checkedIn: true }, confirmed: true }));
    } catch (err) {
      setError(err.message || 'Unable to check in this member right now.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => () => {
    stopCamera();
    if (manualTimerRef.current) clearTimeout(manualTimerRef.current);
  }, [stopCamera]);

  const selectedMember = result?.member;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#0d0c18]/95 px-4 pt-8 pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <Card variant="raised" className="relative w-full max-w-lg rounded-[2.5rem] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <Eyebrow>Leaders tool</Eyebrow>
            <h2 className="mt-1 text-xl font-bold text-white">Member Check-In</h2>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/70 hover:bg-white/10" aria-label="Close scanner">
            <FiX />
          </button>
        </div>

        {!result && (
          <div className="flex border-b border-white/10">
            <button onClick={() => switchTab('scan')} className={`flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-semibold ${tab === 'scan' ? 'border-b-2 border-[#F2A31C] text-[#F2A31C]' : 'text-white/40'}`}>
              <MdQrCodeScanner /> Scan QR
            </button>
            <button onClick={() => switchTab('manual')} className={`flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-semibold ${tab === 'manual' ? 'border-b-2 border-[#F2A31C] text-[#F2A31C]' : 'text-white/40'}`}>
              <FiSearch /> Manual Entry
            </button>
          </div>
        )}

        <div className="max-h-[78vh] overflow-y-auto p-6">
          {tab === 'scan' && !result && (
            <>
              <div className="relative aspect-square overflow-hidden rounded-2xl bg-black/50">
                <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
                <canvas ref={canvasRef} className="hidden" />
                {scanning && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative h-56 w-56">
                      <div className="absolute inset-0 rounded-2xl border-2 border-[#F2A31C]/60" />
                      <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-[#F2A31C]/70 animate-pulse" />
                    </div>
                  </div>
                )}
                {!scanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <MdQrCodeScanner className="h-16 w-16 text-white/25" />
                    <p className="text-sm text-white/60">Camera inactive</p>
                  </div>
                )}
              </div>
              <div className="mt-4 flex gap-3">
                {scanning ? (
                  <button onClick={stopCamera} className="flex-1 rounded-2xl border border-white/10 bg-white/[0.05] py-3 text-sm font-semibold text-white">Stop camera</button>
                ) : (
                  <button onClick={startCamera} className="flex-1 rounded-2xl bg-[#F2A31C] py-3 text-sm font-bold text-[#0d0c18]">Start camera</button>
                )}
                <button onClick={() => switchTab('manual')} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/70">Manual</button>
              </div>
              <p className="mt-3 text-center text-xs text-white/35">Point the camera at the member's QR badge.</p>
            </>
          )}

          {tab === 'manual' && !result && (
            <div>
              <label className="text-sm font-semibold text-white">Find a member</label>
              <div className="mt-2 flex gap-2">
                <input value={manualId} onChange={handleManualChange} onKeyDown={(event) => { if (event.key === 'Enter') void handleMemberLookup(manualId); }} placeholder="Membership ID, name, phone, or email" className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none" autoFocus />
                <button onClick={() => void handleMemberLookup(manualId)} disabled={lookupLoading} className="rounded-2xl bg-[#F2A31C] px-4 py-3 text-sm font-bold text-[#0d0c18] disabled:opacity-50">{lookupLoading ? '…' : 'Find'}</button>
              </div>
              {suggestions.length > 0 && (
                <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
                  {suggestions.map((member) => (
                    <button key={member.membershipId} onClick={() => setResult({ member, confirmed: false })} className="block w-full border-b border-white/5 px-4 py-3 text-left last:border-0 hover:bg-white/[0.05]">
                      <p className="text-sm font-semibold text-white">{member.name}</p>
                      <p className="text-xs text-white/40">{member.membershipId}{member.chapter ? ` · ${member.chapter}` : ''}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

          {lookupLoading && !selectedMember && <p className="mt-4 text-center text-sm text-white/45">Looking up member…</p>}

          {selectedMember && (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
              <Eyebrow>Member found</Eyebrow>
              <h3 className="mt-2 text-2xl font-bold text-white">{selectedMember.name}</h3>
              <p className="mt-1 text-sm text-white/45">{selectedMember.membershipId}{selectedMember.chapter ? ` · ${selectedMember.chapter}` : ''}</p>
              {selectedMember.phone && <p className="mt-4 text-sm text-white/60">{selectedMember.phone}</p>}
              {selectedMember.email && <p className="mt-1 text-sm text-white/60">{selectedMember.email}</p>}

              {result.confirmed ? (
                <div className="mt-5 rounded-2xl bg-emerald-500/10 px-4 py-4 text-sm font-semibold text-emerald-300">
                  Checked in successfully{result.member.offlineQueued ? ' — queued for sync when the connection returns.' : ''}
                </div>
              ) : (
                <button onClick={confirmCheckIn} disabled={saving} className="mt-5 w-full rounded-2xl bg-emerald-500/20 py-3 text-sm font-bold text-emerald-200 disabled:opacity-50">
                  {saving ? 'Checking in…' : 'Check in member'}
                </button>
              )}

              <button onClick={() => { setResult(null); setError(''); setManualId(''); setSuggestions([]); }} className="mt-3 w-full rounded-2xl border border-white/10 py-3 text-sm font-semibold text-white/60 hover:bg-white/[0.04]">
                Scan another member
              </button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function AttendancePanel() {
  const [members, setMembers] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    fetchAllMembers()
      .then(setMembers)
      .catch((e) => setError(e.message || 'Unable to load members.'))
      .finally(() => setLoading(false));
  }, []);

  const checkIn = async (membershipId, memberHint = null) => {
    setSaving(membershipId);
    setError('');
    try {
      const updated = await checkInMember(membershipId, memberHint);
      setMembers((current) => current.map((member) => member.membershipId === membershipId ? { ...member, ...updated } : member));
      return updated;
    } catch (e) {
      setError(e.message || 'Unable to check in this member.');
      throw e;
    } finally {
      setSaving('');
    }
  };

  const filtered = members.filter((member) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [member.name, member.email, member.phone, member.membershipId, member.chapter].some((value) => String(value || '').toLowerCase().includes(q));
  });

  return (
    <>
      <Card variant="raised" className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <FiUsers className="text-emerald-300" />
            <div>
              <Eyebrow>Attendance</Eyebrow>
              <h2 className="text-xl font-bold text-white">Member check-in</h2>
            </div>
          </div>
          <button onClick={() => { setError(''); setScannerOpen(true); }} className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#F2A31C] px-4 py-3 text-sm font-bold text-[#0d0c18]">
            <MdQrCodeScanner className="h-5 w-5" /> Scan QR
          </button>
        </div>

        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, ID, phone, or email" className="mt-5 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none" />
        {error && <p className="mt-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>}

        {loading ? (
          <p className="mt-5 text-sm text-white/50">Loading members…</p>
        ) : (
          <div className="mt-5 divide-y divide-white/5">
            {filtered.map((member) => (
              <div key={member.membershipId} className="flex items-center gap-3 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">{member.name}</p>
                  <p className="truncate text-xs text-white/45">{member.membershipId} · {member.chapter}</p>
                </div>
                {member.checkedIn ? (
                  <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-300">Checked in</span>
                ) : (
                  <button disabled={saving === member.membershipId} onClick={() => void checkIn(member.membershipId, member)} className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 disabled:opacity-50">
                    {saving === member.membershipId ? 'Saving…' : 'Check in'}
                  </button>
                )}
              </div>
            ))}
            {!filtered.length && <p className="py-8 text-center text-sm text-white/40">No members match your search.</p>}
          </div>
        )}
      </Card>

      {scannerOpen && (
        <QRScannerPanel
          onCheckIn={checkIn}
          onClose={() => setScannerOpen(false)}
        />
      )}
    </>
  );
}

export default function LeadersForumWithFellowship() {
  const { loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);
  const [view, setView] = useState('dashboard');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await apiFetch('/api/auth/admin-status');
        const body = await response.json().catch(() => ({}));
        if (!cancelled) setIsAdmin(response.ok && body.isAdmin === true);
      } catch {
        if (!cancelled) setIsAdmin(false);
      } finally {
        if (!cancelled) setCheckingRole(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading || checkingRole) return <div className="mx-auto max-w-xl px-5 py-20 text-center text-sm text-white/50">Checking administrator access…</div>;
  if (!isAdmin) return <AccessDenied />;

  return (
    <section className="mx-auto max-w-6xl px-5 py-12">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Eyebrow>Leaders Forum</Eyebrow>
          <h1 className="mt-2 text-3xl font-extrabold text-white">Leadership Tools</h1>
          <p className="mt-2 max-w-3xl text-sm text-white/45">Administrator-only management for attendance, content, fellowship locations, live streaming, and notifications.</p>
        </div>
        <button onClick={() => setView('dashboard')} className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white"><FiLock /> Admin session</button>
      </div>

      {view === 'dashboard' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <Card as="button" key={tool.label} onClick={() => setView(tool.path)} variant="raised" className="p-5 text-left transition hover:-translate-y-0.5 hover:bg-white/[0.06]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-white">{tool.label}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-white/45">{tool.description}</p>
                  </div>
                  <Icon className="h-6 w-6 shrink-0 text-[#D8B2FF]" />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {view === 'attendance' && <><button onClick={() => setView('dashboard')} className="mb-4 text-sm text-white/50 hover:text-white">← Back</button><AttendancePanel /></>}
      {view === 'fellowship' && <><button onClick={() => setView('dashboard')} className="mb-4 text-sm text-white/50 hover:text-white">← Back</button><FellowshipLocationsAdminSecure /></>}
      {view === 'notifications' && <><button onClick={() => setView('dashboard')} className="mb-4 text-sm text-white/50 hover:text-white">← Back</button><NotificationCenter /></>}
      {view === 'admin' && <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center"><FiShield className="mx-auto h-10 w-10 text-[#D8B2FF]" /><h2 className="mt-4 text-2xl font-bold text-white">Content administration</h2><p className="mt-2 text-sm text-white/45">The existing administrator dashboard remains available behind the same server-verified admin authorization.</p><button onClick={() => window.location.assign('/admin')} className="mt-5 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/15">Open Admin Dashboard</button></div>}
    </section>
  );
}

void buildQRPayload;
