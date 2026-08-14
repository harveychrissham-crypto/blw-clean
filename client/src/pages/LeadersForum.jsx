import { useState, useEffect, useRef, useCallback } from 'react';
import {
  FiShield,
  FiLock,
  FiUnlock,
  FiUsers,
  FiCheckCircle,
  FiXCircle,
  FiSearch,
  FiX,
  FiPhone,
  FiMail,
  FiMapPin,
  FiCalendar,
  FiGlobe,
  FiHeart,
  FiStar,
  FiAlertCircle,
  FiArrowLeft,
  FiBook,
  FiCamera,
  FiImage,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiFilm,
  FiRadio,
  FiVideo,
  FiUserCheck,
  FiPlayCircle,
} from 'react-icons/fi';
import { MdQrCodeScanner } from 'react-icons/md';
import { fetchAllMembers, searchMembers, checkInMember } from '../utils/members';
import { fetchEvents, createEvent, updateEvent, deleteEvent } from '../utils/events';
import {
  fetchOutreachStories,
  createOutreachStory,
  updateOutreachStory,
  deleteOutreachStory,
} from '../utils/outreachStories';
import { fetchSermons, createSermon, updateSermon, deleteSermon, setFeaturedSermon } from '../utils/sermons';
import { fetchVenues, saveVenue, deleteVenue as deleteVenueApi } from '../utils/venues';
import { fetchLiveStream, updateLiveStream, fetchLiveViewers } from '../utils/live';
import { apiFetch } from '../config/api';
import { Eyebrow, Card, StatGroup, ActionBanner } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';

// ─── Constants ────────────────────────────────────────────────────────────────
const LEADER_CODE = '1120363';

// Build QR payload for a member (same format as Checkin.jsx)
function buildQRPayload(member) {
  return [member.membershipId, member.name, member.phone, member.email].join('|');
}

// Parse QR payload back into member fields
function parseQRPayload(raw) {
  const parts = raw.split('|');
  if (parts.length < 2) return null;
  return {
    membershipId: parts[0],
    name: parts[1],
    phone: parts[2] || '',
    email: parts[3] || '',
  };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function AccessGate({ onUnlock }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (code === LEADER_CODE) {
      onUnlock();
    } else {
      setError('Incorrect access code. Leaders only.');
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Badge */}
        <div className="mb-8 flex flex-col items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-[2rem] overflow-hidden shadow-[0_20px_60px_rgba(242,163,28,0.25)]">
            <img src="/logo.png" alt="BLW Logo" className="h-full w-full object-cover" />
          </div>
          <div className="text-center">
            <Eyebrow>Restricted access</Eyebrow>
            <h1 className="mt-2 text-3xl font-extrabold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>Leaders Forum</h1>
            <p className="mt-2 text-sm text-white/50">Enter your 7-digit leader access code to continue.</p>
          </div>
        </div>

        {/* Code form */}
        <Card
          as="form"
          onSubmit={handleSubmit}
          variant="raised"
          className={`p-6 shadow-2xl transition-all ${shake ? 'animate-shake' : ''}`}
        >
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">Access code</span>
            <div className="relative mt-2">
              <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                type="password"
                inputMode="numeric"
                maxLength={7}
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(''); }}
                placeholder="•••••••"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.05] py-3 pl-10 pr-4 text-lg font-bold tracking-[0.5em] text-white placeholder-white/20 outline-none focus:border-[#EC2FA8] focus:ring-2 focus:ring-[#EC2FA8]/20"
                autoFocus
              />
            </div>
          </label>

          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-300">
              <FiAlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(236,47,168,0.28)] transition hover:opacity-90"
          >
            <FiUnlock className="mr-2 inline" /> Enter Leaders Forum
          </button>
        </Card>

        <p className="mt-5 text-center text-xs text-white/30">
          This area is exclusively for ordained leaders &amp; zone coordinators.
        </p>
      </div>

      <style>{`
        @keyframes shake {
          0%,100%{transform:translateX(0)}
          20%{transform:translateX(-8px)}
          40%{transform:translateX(8px)}
          60%{transform:translateX(-6px)}
          80%{transform:translateX(6px)}
        }
        .animate-shake { animation: shake 0.5s ease; }
      `}</style>
    </div>
  );
}

// ─── QR Scanner panel with Scan / Manual Entry tabs ─────────────────────────
function QRScannerPanel({ members, checkedInIds, onCheckIn, onClose, onViewProfile }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const streamRef = useRef(null);
  const [tab, setTab] = useState('scan'); // 'scan' | 'manual'
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [manualId, setManualId] = useState('');
  const [suggestions, setSuggestions] = useState([]);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    setScanning(false);
  }, []);

  // Stop camera when switching to manual tab
  const switchTab = (t) => {
    if (t === 'manual') stopCamera();
    setTab(t);
    setError('');
    setResult(null);
    setManualId('');
    setSuggestions([]);
  };

  const startCamera = useCallback(async () => {
    setError('');
    setResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
        scanFrame();
      }
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions or switch to Manual Entry.');
    }
  }, []); // eslint-disable-line

  const scanFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanFrame);
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    import('https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js').then(() => {
      if (window.jsQR) {
        const code = window.jsQR(imageData.data, imageData.width, imageData.height);
        if (code) { handleScannedData(code.data); return; }
      }
      rafRef.current = requestAnimationFrame(scanFrame);
    }).catch(() => { rafRef.current = requestAnimationFrame(scanFrame); });
  }, []); // eslint-disable-line

  useEffect(() => { return () => stopCamera(); }, [stopCamera]);

  const handleScannedData = useCallback(async (raw) => {
    stopCamera();
    const parsed = parseQRPayload(raw);
    if (!parsed) { setError('Invalid QR code — not a recognised BLW member badge.'); return; }
    try {
      const matches = await searchMembers(parsed.membershipId);
      const member = matches.find((m) => m.membershipId === parsed.membershipId) || matches[0];
      if (!member) { setError(`Scanned: "${parsed.name}" (${parsed.membershipId}) — not found in registry.`); return; }
      setResult({ member });
    } catch (err) {
      setError(`Scanned: "${parsed.name}" (${parsed.membershipId}) — not found in registry.`);
    }
  }, [stopCamera]);

  // Live suggestions as user types — debounced live search against the real API.
  const debounceRef = useRef(null);
  const handleManualChange = (e) => {
    const val = e.target.value;
    setManualId(val);
    setError('');
    setResult(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = val.trim();
    if (q.length < 1) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const matches = await searchMembers(q);
        setSuggestions(matches.slice(0, 6));
      } catch {
        setSuggestions([]);
      }
    }, 250);
  };

  const handleManualLookup = async (overrideMember) => {
    setSuggestions([]);
    if (overrideMember) { setResult({ member: overrideMember }); return; }
    const raw = manualId.trim();
    if (!raw) { setError('Please enter a member ID, name, email, or phone number.'); return; }

    try {
      const matches = await searchMembers(raw);
      if (!matches.length) { setError(`No member found matching "${raw}". Try a partial name, ID, or phone number.`); return; }
      setError('');
      setResult({ member: matches[0] });
    } catch (err) {
      setError(err.message || `No member found matching "${raw}".`);
    }
  };

  const confirmCheckIn = async () => {
    if (!result?.member) return;
    try {
      await onCheckIn(result.member.membershipId);
      setResult((r) => ({ ...r, member: { ...r.member, checkedIn: true }, confirmed: true }));
    } catch (err) {
      setError(err.message || 'Unable to check in this member right now.');
    }
  };

  const reset = () => { setResult(null); setError(''); setManualId(''); setSuggestions([]); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0c18]/95 px-4 py-8">
      <Card variant="raised" className="relative w-full max-w-lg rounded-[2.5rem] shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <Eyebrow>Leaders tool</Eyebrow>
            <h2 className="mt-1 text-xl font-bold text-white">Member Check-In</h2>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/70 transition hover:bg-white/10">
            <FiX />
          </button>
        </div>

        {/* Tabs */}
        {!result && (
          <div className="flex border-b border-white/10">
            <button
              onClick={() => switchTab('scan')}
              className={`flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-semibold transition ${
                tab === 'scan'
                  ? 'border-b-2 border-[#F2A31C] text-[#F2A31C]'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <MdQrCodeScanner className="h-4 w-4" /> Scan QR
            </button>
            <button
              onClick={() => switchTab('manual')}
              className={`flex flex-1 items-center justify-center gap-2 py-3.5 text-sm font-semibold transition ${
                tab === 'manual'
                  ? 'border-b-2 border-[#F2A31C] text-[#F2A31C]'
                  : 'text-white/40 hover:text-white/70'
              }`}
            >
              <FiSearch className="h-4 w-4" /> Manual Entry
            </button>
          </div>
        )}

        <div className="max-h-[70vh] overflow-y-auto p-6">

          {/* ── SCAN TAB ── */}
          {tab === 'scan' && !result && (
            <>
              <div className="relative mb-4 overflow-hidden rounded-2xl bg-black/40 aspect-square">
                <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
                {scanning && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative h-52 w-52">
                      <div className="absolute inset-0 rounded-2xl border-2 border-[#F2A31C]/50" />
                      {['-top-1 -left-1','-top-1 -right-1','-bottom-1 -left-1','-bottom-1 -right-1'].map((pos, i) => (
                        <div key={i} className={`absolute ${pos} h-7 w-7 border-[#F2A31C] border-[3px] rounded-sm`} />
                      ))}
                      <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#F2A31C]/50 animate-scan" />
                    </div>
                  </div>
                )}
                {!scanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <MdQrCodeScanner className="h-16 w-16 text-white/30" />
                    <p className="text-sm text-white/40">Camera inactive</p>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {!scanning ? (
                <button onClick={startCamera} className="w-full rounded-2xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] py-3 text-sm font-bold text-white transition hover:opacity-90">
                  <FiCamera className="mr-2 inline" /> Start Camera
                </button>
              ) : (
                <button onClick={stopCamera} className="w-full rounded-2xl border border-white/10 bg-white/[0.05] py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                  Stop Scanning
                </button>
              )}

              {error && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </div>
              )}
            </>
          )}

          {/* ── MANUAL ENTRY TAB ── */}
          {tab === 'manual' && !result && (
            <>
              <p className="mb-4 text-sm text-white/50">
                Enter a member's <span className="font-semibold text-white">ID</span>, <span className="font-semibold text-white">name</span>, <span className="font-semibold text-white">email</span>, or <span className="font-semibold text-white">phone</span> to look them up.
              </p>

              {/* Search input */}
              <div className="relative">
                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
                <input
                  autoFocus
                  value={manualId}
                  onChange={handleManualChange}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualLookup()}
                  placeholder="e.g. BLW-2024-001 or Amara Osei…"
                  className="w-full rounded-2xl border border-white/10 bg-white/[0.05] py-3 pl-10 pr-4 text-sm text-white placeholder-white/20 outline-none focus:border-[#F2A31C] focus:ring-2 focus:ring-[#F2A31C]/20"
                />
                {manualId && (
                  <button onClick={() => { setManualId(''); setSuggestions([]); setError(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white">
                    <FiX className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Live suggestions */}
              {suggestions.length > 0 && (
                <div className="mt-2 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.05]">
                  {suggestions.map((m) => (
                    <button
                      key={m.membershipId}
                      onClick={() => { setManualId(m.name); handleManualLookup(m); }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/5 border-b border-white/5 last:border-0"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF4F9A] via-[#A53DFF] to-[#3D5AFE] text-sm font-black text-white">
                        {m.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{m.name}</p>
                        <p className="text-xs text-white/40">{m.membershipId} · {m.chapter}</p>
                      </div>
                      {checkedInBadge(checkedInIds.has(m.membershipId))}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => handleManualLookup()}
                className="mt-4 w-full rounded-2xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                <FiSearch className="mr-2 inline" /> Look Up Member
              </button>

              {error && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </div>
              )}

              {/* Quick list — all members */}
              <div className="mt-6">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/40">All members</p>
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  {members.map((m) => (
                    <button
                      key={m.membershipId}
                      onClick={() => { setManualId(m.name); handleManualLookup(m); }}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/5 border-b border-white/5 last:border-0"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF4F9A] via-[#A53DFF] to-[#3D5AFE] text-sm font-black text-white">
                        {m.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-white">{m.name}</p>
                        <p className="text-xs text-white/40">{m.membershipId}</p>
                      </div>
                      {checkedInBadge(checkedInIds.has(m.membershipId))}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── RESULT CARD ── */}
          {result && (
            <MemberResultCard
              member={result.member}
              confirmed={result.confirmed}
              onConfirm={confirmCheckIn}
              onReset={reset}
              onViewProfile={() => onViewProfile(result.member)}
            />
          )}
        </div>
      </Card>

      <style>{`
        @keyframes scan {
          0%,100% { top: 10% }
          50% { top: 85% }
        }
        .animate-scan { position: absolute; animation: scan 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}

function checkedInBadge(isIn) {
  return isIn ? (
    <span className="ml-auto shrink-0 flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
      <FiCheckCircle className="h-3 w-3" /> In
    </span>
  ) : (
    <span className="ml-auto shrink-0 rounded-full bg-white/[0.07] px-2.5 py-1 text-[10px] font-semibold text-white/40">—</span>
  );
}

function MemberResultCard({ member, confirmed, onConfirm, onReset, onViewProfile }) {
  const fields = [
    { label: 'Membership ID', value: member.membershipId, icon: FiStar },
    { label: 'Email', value: member.email, icon: FiMail },
    { label: 'Phone', value: member.phone, icon: FiPhone },
    { label: 'Gender', value: member.gender, icon: FiUsers },
    { label: 'Birthday', value: member.birthday, icon: FiCalendar },
    { label: 'Church', value: member.church, icon: FiBook },
    { label: 'Chapter / PCF', value: member.chapter, icon: FiHeart },
    { label: 'Zone', value: member.campusZone?.replace('_', ' '), icon: FiGlobe },
    { label: 'City', value: member.city, icon: FiMapPin },
    { label: 'Country', value: member.country, icon: FiGlobe },
    { label: 'Status', value: member.status, icon: FiHeart },
    { label: 'Invited by', value: member.invitedBy, icon: FiUsers },
    { label: 'Join date', value: member.joinDate, icon: FiCalendar },
  ].filter((f) => f.value);

  return (
    <div>
      {confirmed ? (
        <div className="mb-5 flex flex-col items-center gap-3 rounded-2xl bg-emerald-500/10 p-6 text-center border border-emerald-500/20">
          <FiCheckCircle className="h-10 w-10 text-emerald-400" />
          <div>
            <p className="text-lg font-bold text-white">{member.name}</p>
            <p className="text-sm text-emerald-400">Checked in successfully ✓</p>
          </div>
        </div>
      ) : (
        <div className="mb-5 rounded-2xl border border-[#F2A31C]/20 bg-[#F2A31C]/5 p-4 flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] text-xl font-black text-white shadow-lg">
            {member.name.charAt(0)}
          </div>
          <div>
            <p className="text-base font-bold text-white">{member.name}</p>
            <p className="text-xs text-white/50">{member.membershipId}</p>
            <span className="mt-1 inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-300">Pending check-in</span>
          </div>
        </div>
      )}

      <div className="mb-5 space-y-2">
        {fields.map(({ label, value, icon: Icon }) => (
          <Card key={label} variant="subtle" className="flex items-center gap-3 px-4 py-2.5">
            <Icon className="h-3.5 w-3.5 shrink-0 text-[#F2A31C]" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</p>
              <p className="truncate text-sm font-medium text-white">{value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="flex gap-3">
        {!confirmed && (
          <button
            onClick={onConfirm}
            className="flex-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-bold text-white transition hover:opacity-90"
          >
            <FiCheckCircle className="mr-2 inline" /> Confirm Check-In
          </button>
        )}
        <button
          onClick={onViewProfile}
          className="flex-1 rounded-2xl border border-[#F2A31C]/30 bg-[#F2A31C]/10 py-3 text-sm font-semibold text-[#F2A31C] transition hover:bg-[#F2A31C]/20"
        >
          <FiUsers className="mr-2 inline" /> View Full Profile
        </button>
        <button
          onClick={onReset}
          className="flex-1 rounded-2xl border border-white/10 bg-white/[0.05] py-3 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          {confirmed ? 'Scan Another' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}

// ─── Member detail modal ──────────────────────────────────────────────────────
function MemberModal({ member, onClose }) {
  const fields = [
    { label: 'Membership ID', value: member.membershipId, icon: FiStar },
    { label: 'Email', value: member.email, icon: FiMail },
    { label: 'Phone', value: member.phone, icon: FiPhone },
    { label: 'Gender', value: member.gender, icon: FiUsers },
    { label: 'Birthday', value: member.birthday, icon: FiCalendar },
    { label: 'Church', value: member.church, icon: FiBook },
    { label: 'Chapter / PCF', value: member.chapter, icon: FiHeart },
    { label: 'Zone', value: member.campusZone?.replace(/_/g, ' '), icon: FiGlobe },
    { label: 'Residence', value: member.residence, icon: FiMapPin },
    { label: 'City', value: member.city, icon: FiMapPin },
    { label: 'Country', value: member.country, icon: FiGlobe },
    { label: 'Marital status', value: member.status, icon: FiHeart },
    { label: 'Invited by', value: member.invitedBy, icon: FiUsers },
    { label: 'Join date', value: member.joinDate, icon: FiCalendar },
  ].filter((f) => f.value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0c18]/95 px-4 py-8">
      <Card variant="raised" className="relative w-full max-w-lg rounded-[2.5rem] shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/70 transition hover:bg-white/10"
        >
          <FiX />
        </button>

        <div className="max-h-[85vh] overflow-y-auto">
          {/* Hero */}
          <div className="bg-gradient-to-br from-[#F2A31C]/20 via-[#FF4F9A]/10 to-[#A53DFF]/10 px-6 py-8">
            <div className="flex items-center gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] text-3xl font-black text-white shadow-xl">
                {member.name.charAt(0)}
              </div>
              <div>
                <Eyebrow>Member profile</Eyebrow>
                <h2 className="mt-1 text-2xl font-bold text-white">{member.name}</h2>
                <p className="mt-1 text-xs text-white/50">{member.membershipId}</p>
                <div className="mt-2 flex items-center gap-2">
                  {member.checkedIn ? (
                    <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold text-emerald-400">
                      <FiCheckCircle className="h-3 w-3" /> Checked in
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded-full bg-white/[0.08] px-3 py-1 text-xs font-semibold text-white/50">
                      <FiXCircle className="h-3 w-3" /> Not checked in
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Fields */}
          <div className="p-6 space-y-2">
            {fields.map(({ label, value, icon: Icon }) => (
              <Card key={label} variant="subtle" className="flex items-center gap-3 px-4 py-3">
                <Icon className="h-4 w-4 shrink-0 text-[#F2A31C]" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</p>
                  <p className="mt-0.5 text-sm font-medium text-white break-words">{value}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ─── Events Manager panel ─────────────────────────────────────────────────────
const EMPTY_EVENT_FORM = { title: '', category: '', date: '', time: '', location: '', description: '' };

function EventForm({ initial, onCancel, onSave }) {
  const [form, setForm] = useState(initial || EMPTY_EVENT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date) { setError('Title and date are required.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message || 'Unable to save event.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card as="form" onSubmit={submit} variant="raised" className="space-y-3 p-5">
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Title</label>
        <input value={form.title} onChange={set('title')} className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#F2A31C]/50" placeholder="e.g. Campus Prayer Night" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Date</label>
          <input type="date" value={form.date} onChange={set('date')} className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#F2A31C]/50" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Time</label>
          <input value={form.time} onChange={set('time')} className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#F2A31C]/50" placeholder="e.g. 7:00 PM" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Category</label>
          <input value={form.category} onChange={set('category')} className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#F2A31C]/50" placeholder="e.g. Prayer & Worship" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Location</label>
          <input value={form.location} onChange={set('location')} className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#F2A31C]/50" placeholder="e.g. Main Hall" />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Description</label>
        <textarea value={form.description} onChange={set('description')} rows={2} className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#F2A31C]/50" />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <FiAlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Event'}
        </button>
        <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
          Cancel
        </button>
      </div>
    </Card>
  );
}

function EventsManagerPanel({ onClose }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('list'); // 'list' | 'create' | { editing: event }
  const [editingEvent, setEditingEvent] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setEvents(await fetchEvents());
    } catch (err) {
      setError(err.message || 'Unable to load events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (form) => {
    await createEvent(form);
    setMode('list');
    load();
  };

  const handleUpdate = async (form) => {
    await updateEvent(editingEvent.id, form);
    setMode('list');
    setEditingEvent(null);
    load();
  };

  const handleDelete = async (event) => {
    if (!window.confirm(`Delete "${event.title}"? This cannot be undone.`)) return;
    try {
      await deleteEvent(event.id);
      load();
    } catch (err) {
      setError(err.message || 'Unable to delete event.');
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0c18]/95 px-4 py-8">
      <div className="relative w-full max-w-xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.04] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <Eyebrow>Leaders tool</Eyebrow>
            <h2 className="mt-1 text-xl font-bold text-white">Manage Events</h2>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/70 transition hover:bg-white/10">
            <FiX />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
          {mode === 'create' && (
            <EventForm onCancel={() => setMode('list')} onSave={handleCreate} />
          )}

          {mode === 'edit' && editingEvent && (
            <EventForm
              initial={editingEvent}
              onCancel={() => { setMode('list'); setEditingEvent(null); }}
              onSave={handleUpdate}
            />
          )}

          {mode === 'list' && (
            <>
              <button
                onClick={() => setMode('create')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                <FiPlus /> Add New Event
              </button>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </div>
              )}

              {loading && <p className="text-sm text-white/40">Loading events…</p>}
              {!loading && events.length === 0 && !error && (
                <EmptyState icon={FiCalendar} title="No events yet" hint="Add the first one above." />
              )}

              <div className="space-y-2">
                {events.map((event) => (
                  <Card key={event.id} variant="subtle" className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{event.title}</p>
                      <p className="text-xs text-white/40">{formatDate(event.date)} {event.time && `· ${event.time}`} {event.location && `· ${event.location}`}</p>
                    </div>
                    <button
                      onClick={() => { setEditingEvent(event); setMode('edit'); }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/60 transition hover:bg-white/10 hover:text-white"
                    >
                      <FiEdit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(event)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-500/20 text-red-400 transition hover:bg-red-500/10"
                    >
                      <FiTrash2 className="h-3.5 w-3.5" />
                    </button>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Outreach Stories Manager panel ───────────────────────────────────────────
const EMPTY_STORY_FORM = { tag: '', title: '', subtitle: '', body: '', imageUrl: '' };
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB raw upload cap before base64 encoding

function StoryForm({ initial, onCancel, onSave }) {
  const [form, setForm] = useState(initial || EMPTY_STORY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { setError('Please choose an image file.'); return; }
    if (file.size > MAX_IMAGE_BYTES) { setError('Image is too large. Please use a photo under 4MB.'); return; }
    setError('');
    setUploading(true);
    try {
      const body = new FormData();
      body.append('photo', file);
      const res = await apiFetch('/api/uploads', { method: 'POST', body });
      let payload = null;
      try { payload = await res.json(); } catch { /* no body */ }
      if (!res.ok) throw new Error(payload?.error || `Upload failed (${res.status})`);
      setForm((f) => ({ ...f, imageUrl: payload.url }));
    } catch (err) {
      setError(err.message || 'Unable to upload that photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message || 'Unable to save story.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card as="form" onSubmit={submit} variant="raised" className="space-y-3 p-5">
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Title</label>
        <input value={form.title} onChange={set('title')} className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#F2A31C]/50" placeholder="e.g. Streets of Nairobi" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Tag / Location</label>
          <input value={form.tag} onChange={set('tag')} className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#F2A31C]/50" placeholder="e.g. Reachout World" />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Subtitle</label>
          <input value={form.subtitle} onChange={set('subtitle')} className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#F2A31C]/50" placeholder="A short line about the story" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Full story</label>
        <textarea
          value={form.body}
          onChange={set('body')}
          rows={5}
          placeholder="Tell the full story here — this is what people will read when they click into it."
          className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#F2A31C]/50"
        />
      </div>

      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Photo</label>
        {form.imageUrl && (
          <div className="mb-2 overflow-hidden rounded-xl border border-white/10">
            <img src={form.imageUrl} alt="Story preview" className="h-32 w-full object-cover" />
          </div>
        )}
        <div className="flex items-center gap-2">
          <label className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10 ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
            <FiImage className="h-4 w-4" /> {uploading ? 'Uploading…' : form.imageUrl ? 'Replace photo' : 'Upload photo'}
            <input type="file" accept="image/*" onChange={handlePhotoChange} disabled={uploading} className="hidden" />
          </label>
          {form.imageUrl && !uploading && (
            <button type="button" onClick={() => setForm((f) => ({ ...f, imageUrl: '' }))} className="rounded-xl border border-red-500/20 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/10">
              Remove
            </button>
          )}
        </div>
        <p className="mt-1 text-[10px] text-white/30">Or paste an image URL below instead of uploading.</p>
        <input
          value={form.imageUrl}
          onChange={set('imageUrl')}
          placeholder="https://…"
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs text-white outline-none focus:border-[#F2A31C]/50"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <FiAlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving || uploading} className="flex-1 rounded-xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Story'}
        </button>
        <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
          Cancel
        </button>
      </div>
    </Card>
  );
}

function StoriesManagerPanel({ onClose }) {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('list'); // 'list' | 'create' | 'edit'
  const [editingStory, setEditingStory] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setStories(await fetchOutreachStories());
    } catch (err) {
      setError(err.message || 'Unable to load outreach stories.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (form) => {
    await createOutreachStory(form);
    setMode('list');
    load();
  };

  const handleUpdate = async (form) => {
    await updateOutreachStory(editingStory.id, form);
    setMode('list');
    setEditingStory(null);
    load();
  };

  const handleDelete = async (story) => {
    if (!window.confirm(`Delete "${story.title}"? This cannot be undone.`)) return;
    try {
      await deleteOutreachStory(story.id);
      load();
    } catch (err) {
      setError(err.message || 'Unable to delete story.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0c18]/95 px-4 py-8">
      <div className="relative w-full max-w-xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.04] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <Eyebrow>Leaders tool</Eyebrow>
            <h2 className="mt-1 text-xl font-bold text-white">Manage Outreach Stories</h2>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/70 transition hover:bg-white/10">
            <FiX />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
          {mode === 'create' && (
            <StoryForm onCancel={() => setMode('list')} onSave={handleCreate} />
          )}

          {mode === 'edit' && editingStory && (
            <StoryForm
              initial={editingStory}
              onCancel={() => { setMode('list'); setEditingStory(null); }}
              onSave={handleUpdate}
            />
          )}

          {mode === 'list' && (
            <>
              <button
                onClick={() => setMode('create')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                <FiPlus /> Add New Story
              </button>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </div>
              )}

              {loading && <p className="text-sm text-white/40">Loading stories…</p>}
              {!loading && stories.length === 0 && !error && (
                <EmptyState icon={FiImage} title="No stories yet" hint="Add the first one above." />
              )}

              <div className="space-y-2">
                {stories.map((story) => (
                  <Card key={story.id} variant="subtle" className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.07]">
                      {story.imageUrl ? (
                        <img src={story.imageUrl} alt={story.title} className="h-full w-full object-cover" />
                      ) : (
                        <FiImage className="h-5 w-5 text-white/30" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{story.title}</p>
                      <p className="truncate text-xs text-white/40">{story.tag && `${story.tag} · `}{story.subtitle}</p>
                    </div>
                    <button
                      onClick={() => { setEditingStory(story); setMode('edit'); }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/60 transition hover:bg-white/10 hover:text-white"
                    >
                      <FiEdit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(story)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-500/20 text-red-400 transition hover:bg-red-500/10"
                    >
                      <FiTrash2 className="h-3.5 w-3.5" />
                    </button>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sermons Manager panel ─────────────────────────────────────────────────────
const EMPTY_SERMON_FORM = { title: '', speaker: '', description: '', youtubeUrl: '' };

function SermonForm({ initial, onCancel, onSave }) {
  const [form, setForm] = useState(initial || EMPTY_SERMON_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.youtubeUrl.trim()) {
      setError('Title and YouTube URL are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message || 'Unable to save sermon.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card as="form" onSubmit={submit} variant="raised" className="space-y-3 p-5">
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Title</label>
        <input value={form.title} onChange={set('title')} className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#F2A31C]/50" placeholder="e.g. Walking in Victory" />
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Speaker</label>
        <input value={form.speaker} onChange={set('speaker')} className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#F2A31C]/50" placeholder="e.g. Pastor John" />
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">YouTube URL</label>
        <input value={form.youtubeUrl} onChange={set('youtubeUrl')} className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#F2A31C]/50" placeholder="https://www.youtube.com/watch?v=..." />
        <p className="mt-1 text-[11px] text-white/30">Paste any YouTube link — watch, youtu.be, or shorts links all work.</p>
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Description</label>
        <textarea value={form.description} onChange={set('description')} rows={2} className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#F2A31C]/50" />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <FiAlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Sermon'}
        </button>
        <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
          Cancel
        </button>
      </div>
    </Card>
  );
}

function SermonsManagerPanel({ onClose }) {
  const [sermons, setSermons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('list'); // 'list' | 'create' | 'edit'
  const [editingSermon, setEditingSermon] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setSermons(await fetchSermons());
    } catch (err) {
      setError(err.message || 'Unable to load sermons.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (form) => {
    await createSermon(form);
    setMode('list');
    load();
  };

  const handleUpdate = async (form) => {
    await updateSermon(editingSermon.id, form);
    setMode('list');
    setEditingSermon(null);
    load();
  };

  const handleDelete = async (sermon) => {
    if (!window.confirm(`Delete "${sermon.title}"? This cannot be undone.`)) return;
    try {
      await deleteSermon(sermon.id);
      load();
    } catch (err) {
      setError(err.message || 'Unable to delete sermon.');
    }
  };

  const handleSetFeatured = async (sermon) => {
    try {
      await setFeaturedSermon(sermon.id);
      load();
    } catch (err) {
      setError(err.message || 'Unable to set featured sermon.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0c18]/95 px-4 py-8">
      <div className="relative w-full max-w-xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.04] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <Eyebrow>Leaders tool</Eyebrow>
            <h2 className="mt-1 text-xl font-bold text-white">Manage Sermons</h2>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/70 transition hover:bg-white/10">
            <FiX />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
          {mode === 'create' && (
            <SermonForm onCancel={() => setMode('list')} onSave={handleCreate} />
          )}

          {mode === 'edit' && editingSermon && (
            <SermonForm
              initial={editingSermon}
              onCancel={() => { setMode('list'); setEditingSermon(null); }}
              onSave={handleUpdate}
            />
          )}

          {mode === 'list' && (
            <>
              <button
                onClick={() => setMode('create')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                <FiPlus /> Add New Sermon
              </button>

              <p className="text-center text-[11px] text-white/30">Tap the star to choose which sermon plays as the main video on the public Sermons page.</p>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </div>
              )}

              {loading && <p className="text-sm text-white/40">Loading sermons…</p>}
              {!loading && sermons.length === 0 && !error && (
                <EmptyState icon={FiFilm} title="No sermons yet" hint="Add the first one above." />
              )}

              <div className="space-y-2">
                {sermons.map((sermon) => (
                  <Card
                    key={sermon.id}
                    variant="subtle"
                    className={`flex items-center gap-3 px-4 py-3 ${sermon.isFeatured ? '!border-[#F2A31C]/40 !bg-[#F2A31C]/[0.07]' : ''}`}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/[0.07]">
                      {sermon.youtubeId ? (
                        <img src={`https://i.ytimg.com/vi/${sermon.youtubeId}/default.jpg`} alt={sermon.title} className="h-full w-full object-cover" />
                      ) : (
                        <FiFilm className="h-5 w-5 text-white/30" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-white">{sermon.title}</p>
                        {sermon.isFeatured && (
                          <span className="shrink-0 rounded-full bg-[#F2A31C]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#F2A31C]">Main</span>
                        )}
                      </div>
                      <p className="truncate text-xs text-white/40">{sermon.speaker}</p>
                    </div>
                    <button
                      onClick={() => handleSetFeatured(sermon)}
                      disabled={sermon.isFeatured}
                      title={sermon.isFeatured ? 'Currently the main video' : 'Set as main video'}
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition ${sermon.isFeatured ? 'border-[#F2A31C]/40 text-[#F2A31C]' : 'border-white/10 text-white/60 hover:bg-white/10 hover:text-white'}`}
                    >
                      <FiStar className="h-3.5 w-3.5" fill={sermon.isFeatured ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => { setEditingSermon(sermon); setMode('edit'); }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/60 transition hover:bg-white/10 hover:text-white"
                    >
                      <FiEdit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(sermon)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-500/20 text-red-400 transition hover:bg-red-500/10"
                    >
                      <FiTrash2 className="h-3.5 w-3.5" />
                    </button>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Service Venues Manager panel ──────────────────────────────────────────────
const CHAPTER_OPTIONS = ['UON CHAPTER', 'TUK CHAPTER'];
const EMPTY_VENUE_FORM = { chapter: CHAPTER_OPTIONS[0], venue: '', serviceTime: '' };

function VenueForm({ initial, lockChapter, onCancel, onSave }) {
  const [form, setForm] = useState(initial || EMPTY_VENUE_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.chapter.trim() || !form.venue.trim()) {
      setError('Chapter and venue are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSave(form);
    } catch (err) {
      setError(err.message || 'Unable to save venue.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card as="form" onSubmit={submit} variant="raised" className="space-y-3 p-5">
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Chapter</label>
        {lockChapter ? (
          <input value={form.chapter} disabled className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/60" />
        ) : (
          <select value={form.chapter} onChange={set('chapter')} className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#F2A31C]/50">
            {CHAPTER_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Service time</label>
        <input value={form.serviceTime} onChange={set('serviceTime')} className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#F2A31C]/50" placeholder="e.g. 3rd Service (11 AM – 1 PM)" />
      </div>
      <div>
        <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Venue / building</label>
        <input value={form.venue} onChange={set('venue')} className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#F2A31C]/50" placeholder="e.g. CCU Building, Chiromo Campus" />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">
          <FiAlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button type="submit" disabled={saving} className="flex-1 rounded-xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Venue'}
        </button>
        <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-white/10 bg-white/[0.05] py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
          Cancel
        </button>
      </div>
    </Card>
  );
}

function VenuesManagerPanel({ onClose }) {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mode, setMode] = useState('list'); // 'list' | 'create' | 'edit'
  const [editingVenue, setEditingVenue] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setVenues(await fetchVenues());
    } catch (err) {
      setError(err.message || 'Unable to load service venues.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (form) => {
    await saveVenue(form.chapter, { venue: form.venue, serviceTime: form.serviceTime });
    setMode('list');
    load();
  };

  const handleUpdate = async (form) => {
    await saveVenue(editingVenue.chapter, { venue: form.venue, serviceTime: form.serviceTime });
    setMode('list');
    setEditingVenue(null);
    load();
  };

  const handleDelete = async (v) => {
    if (!window.confirm(`Remove the venue set for ${v.chapter}?`)) return;
    try {
      await deleteVenueApi(v.chapter);
      load();
    } catch (err) {
      setError(err.message || 'Unable to delete venue.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0c18]/95 px-4 py-8">
      <div className="relative w-full max-w-xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.04] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <Eyebrow>Leaders tool</Eyebrow>
            <h2 className="mt-1 text-xl font-bold text-white">Manage Service Venues</h2>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/70 transition hover:bg-white/10">
            <FiX />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
          {mode === 'create' && (
            <VenueForm onCancel={() => setMode('list')} onSave={handleCreate} />
          )}

          {mode === 'edit' && editingVenue && (
            <VenueForm
              initial={editingVenue}
              lockChapter
              onCancel={() => { setMode('list'); setEditingVenue(null); }}
              onSave={handleUpdate}
            />
          )}

          {mode === 'list' && (
            <>
              <button
                onClick={() => setMode('create')}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] py-3 text-sm font-bold text-white transition hover:opacity-90"
              >
                <FiPlus /> Set a Chapter's Venue
              </button>

              <p className="text-center text-[11px] text-white/30">Each chapter's venue and service time shows on that chapter's members' dashboards.</p>

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </div>
              )}

              {loading && <p className="text-sm text-white/40">Loading venues…</p>}
              {!loading && venues.length === 0 && !error && (
                <EmptyState icon={FiMapPin} title="No venues set yet" hint="Add the first one above." />
              )}

              <div className="space-y-2">
                {venues.map((v) => (
                  <Card key={v.chapter} variant="subtle" className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/[0.07]">
                      <FiMapPin className="h-5 w-5 text-white/40" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{v.chapter}</p>
                      <p className="truncate text-xs text-white/40">{v.venue}{v.serviceTime ? ` · ${v.serviceTime}` : ''}</p>
                    </div>
                    <button
                      onClick={() => { setEditingVenue(v); setMode('edit'); }}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/60 transition hover:bg-white/10 hover:text-white"
                    >
                      <FiEdit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(v)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-red-500/20 text-red-400 transition hover:bg-red-500/10"
                    >
                      <FiTrash2 className="h-3.5 w-3.5" />
                    </button>
                  </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}


// Formats a watch-time total in seconds as e.g. "1h 12m", "8m 30s", "45s".
function formatWatchTime(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

// ─── Live viewers list (who signed in on the public /live popup) ──────────────
function LiveViewersList() {
  const [viewers, setViewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetchLiveViewers()
      .then((data) => !cancelled && setViewers(data))
      .catch((err) => !cancelled && setError(err.message || 'Unable to load viewers.'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  if (loading) return <p className="text-sm text-white/40">Loading viewers…</p>;
  if (error) {
    return (
      <div className="flex items-start gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
        <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
      </div>
    );
  }
  if (!viewers.length) {
    return <EmptyState icon={FiUserCheck} title="No one has signed in yet" hint="Names appear here as people fill in the popup on the public Live page." />;
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-white/30">{viewers.length} viewer{viewers.length === 1 ? '' : 's'} recorded — most recently active first. Each browser is only counted once; returning visits add to their visit count and watch time instead of creating a new entry.</p>
      {viewers.map((v) => (
        <Card key={v.id} variant="subtle" className="flex items-center gap-3 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-white/70">
            <FiUserCheck className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2">
              <p className="truncate text-sm font-semibold text-white">{v.name}</p>
              {v.visitCount > 1 && (
                <span className="shrink-0 rounded-full bg-[#F2A31C]/15 px-2 py-0.5 text-[10px] font-semibold text-[#F2A31C]">
                  Returned ×{v.visitCount}
                </span>
              )}
            </div>
            <p className="truncate text-xs text-white/40">
              {v.invitedBy ? `Invited by ${v.invitedBy}` : 'No invited-by given'} · {formatWatchTime(v.watchSeconds)} watched
            </p>
          </div>
          <div className="shrink-0 text-right text-[11px] text-white/30">
            <p>
              {v.lastSeenAt ? new Date(v.lastSeenAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : ''}
            </p>
            <p className="text-white/20">last seen</p>
          </div>
        </Card>
      ))}
    </div>
  );
}

// ─── Live Stream Manager panel ─────────────────────────────────────────────────
function LiveManagerPanel({ onClose }) {
  const [tab, setTab] = useState('settings'); // 'settings' | 'viewers'
  const [form, setForm] = useState({ title: '', youtubeUrl: '', googleMeetUrl: '', dailyRoomUrl: '', isLive: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchLiveStream()
      .then((live) => {
        if (cancelled) return;
        setForm({
          title: live.title || '',
          youtubeUrl: live.youtubeUrl || '',
          googleMeetUrl: live.googleMeetUrl || '',
          dailyRoomUrl: live.dailyRoomUrl || '',
          isLive: !!live.isLive,
        });
      })
      .catch((err) => !cancelled && setError(err.message || 'Unable to load live stream settings.'))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await updateLiveStream(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || 'Unable to save live stream settings.');
    } finally {
      setSaving(false);
    }
  };

  const toggleLive = async (nextIsLive) => {
    setForm((f) => ({ ...f, isLive: nextIsLive }));
    setSaving(true);
    setError('');
    try {
      await updateLiveStream({ ...form, isLive: nextIsLive });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err.message || 'Unable to update live status.');
      setForm((f) => ({ ...f, isLive: !nextIsLive }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0c18]/95 px-4 py-8">
      <div className="relative w-full max-w-xl overflow-hidden rounded-[2.5rem] border border-white/10 bg-white/[0.04] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <Eyebrow>Leaders tool</Eyebrow>
            <h2 className="mt-1 text-xl font-bold text-white">Manage Live Stream</h2>
          </div>
          <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-white/70 transition hover:bg-white/10">
            <FiX />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/10 px-6">
          <button
            onClick={() => setTab('settings')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] transition ${
              tab === 'settings' ? 'border-b-2 border-[#F2A31C] text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            Stream Settings
          </button>
          <button
            onClick={() => setTab('viewers')}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] transition ${
              tab === 'viewers' ? 'border-b-2 border-[#F2A31C] text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            Viewers
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-6 space-y-4">
          {tab === 'settings' && (
            loading ? (
              <p className="text-sm text-white/40">Loading live stream settings…</p>
            ) : (
              <>
                <Card
                  variant="subtle"
                  className={`flex items-center justify-between px-4 py-3 ${form.isLive ? '!border-red-500/40 !bg-red-500/[0.07]' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <FiRadio className={form.isLive ? 'text-red-400 animate-pulse' : 'text-white/40'} />
                    <div>
                      <p className="text-sm font-semibold text-white">{form.isLive ? 'Currently live' : 'Currently offline'}</p>
                      <p className="text-xs text-white/40">Members see the stream on /live only while this is on.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleLive(!form.isLive)}
                    disabled={saving}
                    className={`rounded-full px-4 py-2 text-xs font-bold transition disabled:opacity-50 ${form.isLive ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30' : 'bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] text-white hover:opacity-90'}`}
                  >
                    {form.isLive ? 'Go Offline' : 'Go Live'}
                  </button>
                </Card>

                <Card as="form" onSubmit={submit} variant="raised" className="space-y-3 p-5">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Stream title</label>
                    <input value={form.title} onChange={set('title')} className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#F2A31C]/50" placeholder="e.g. Sunday 3rd Service" />
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40"><FiPlayCircle className="h-3 w-3" /> YouTube link</label>
                    <input value={form.youtubeUrl} onChange={set('youtubeUrl')} className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#F2A31C]/50" placeholder="https://www.youtube.com/watch?v=..." />
                    <p className="mt-1 text-[11px] text-white/30">Paste the YouTube Live link — watch, youtu.be, or /live/ links all work. Plays inline on the Live page.</p>
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40"><FiVideo className="h-3 w-3" /> Live call room (Daily)</label>
                    <input value={form.dailyRoomUrl} onChange={set('dailyRoomUrl')} className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#F2A31C]/50" placeholder="https://blwcentraleastafrica.daily.co/blw-live" />
                    <p className="mt-1 text-[11px] text-white/30">Plays inline on the Live page, right in the video slot — no new tab needed. Used when there's no YouTube link set.</p>
                  </div>
                  <div>
                    <label className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40"><FiVideo className="h-3 w-3" /> Google Meet link (fallback)</label>
                    <input value={form.googleMeetUrl} onChange={set('googleMeetUrl')} className="w-full rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white outline-none focus:border-[#F2A31C]/50" placeholder="https://meet.google.com/xxx-xxxx-xxx" />
                    <p className="mt-1 text-[11px] text-white/30">Optional — shows a "Join via Google Meet" button that opens in a new tab. Only used when no Daily room is set (Meet links can't play inline).</p>
                  </div>

                  {error && (
                    <div className="flex items-start gap-2 rounded-xl bg-red-500/10 px-3 py-2 text-xs text-red-300">
                      <FiAlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {error}
                    </div>
                  )}
                  {saved && <p className="text-xs text-emerald-300">Saved.</p>}

                  <button type="submit" disabled={saving} className="w-full rounded-xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] py-2.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50">
                    {saving ? 'Saving…' : 'Save Details'}
                  </button>
                </Card>
              </>
            )
          )}

          {tab === 'viewers' && <LiveViewersList />}
        </div>
      </div>
    </div>
  );
}


function MembersList({ members, checkedInIds, onSelectMember }) {
  const [query, setQuery] = useState('');

  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(query.toLowerCase()) ||
      m.membershipId.toLowerCase().includes(query.toLowerCase()) ||
      m.chapter?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Card variant="raised">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div>
          <Eyebrow>Directory</Eyebrow>
          <h3 className="mt-1 text-lg font-bold text-white">All Members</h3>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">
          {checkedInIds.size} / {members.length} checked in
        </span>
      </div>

      {/* Search */}
      <div className="border-b border-white/5 px-6 py-3">
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, ID, or PCF…"
            className="w-full rounded-2xl border border-white/10 bg-white/[0.05] py-2.5 pl-9 pr-4 text-sm text-white placeholder-white/20 outline-none focus:border-[#F2A31C]/50"
          />
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-white/5">
        {filtered.length === 0 && (
          <EmptyState icon={FiSearch} title="No members match your search" />
        )}
        {filtered.map((member) => {
          const isIn = checkedInIds.has(member.membershipId);
          return (
            <button
              key={member.membershipId}
              onClick={() => onSelectMember(member)}
              className="flex w-full items-center gap-4 px-6 py-4 text-left transition hover:bg-white/5"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF4F9A] via-[#A53DFF] to-[#3D5AFE] text-sm font-black text-white">
                {member.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{member.name}</p>
                <p className="text-xs text-white/40">{member.membershipId} · {member.chapter}</p>
              </div>
              <div className="shrink-0">
                {isIn ? (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold text-emerald-400">
                    <FiCheckCircle className="h-3 w-3" /> In
                  </span>
                ) : (
                  <span className="rounded-full bg-white/[0.07] px-2.5 py-1 text-[10px] font-semibold text-white/40">
                    —
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LeadersForum() {
  const [unlocked, setUnlocked] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [eventsManagerOpen, setEventsManagerOpen] = useState(false);
  const [storiesManagerOpen, setStoriesManagerOpen] = useState(false);
  const [sermonsManagerOpen, setSermonsManagerOpen] = useState(false);
  const [venuesManagerOpen, setVenuesManagerOpen] = useState(false);
  const [liveManagerOpen, setLiveManagerOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');

  const loadMembers = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await fetchAllMembers();
      setMembers(data);
    } catch (err) {
      setLoadError(err.message || 'Unable to load members.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (unlocked) loadMembers();
  }, [unlocked, loadMembers]);

  const checkedInIds = new Set(members.filter((m) => m.checkedIn).map((m) => m.membershipId));

  const handleCheckIn = useCallback(async (membershipId) => {
    const updated = await checkInMember(membershipId);
    setMembers((prev) =>
      prev.map((m) => (m.membershipId === membershipId ? { ...m, ...updated } : m))
    );
    return updated;
  }, []);

  if (!unlocked) {
    return <AccessGate onUnlock={() => setUnlocked(true)} />;
  }

  const checkedInCount = checkedInIds.size;
  const totalCount = members.length;

  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl overflow-hidden ring-1 ring-white/10">
              <img src="/logo.png" alt="BLW Logo" className="h-full w-full object-cover" />
            </div>
            <div>
              <Eyebrow>Leaders Forum</Eyebrow>
              <h1 className="text-2xl font-extrabold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>Leader Dashboard</h1>
            </div>
          </div>
        </div>
        <button
          onClick={() => setUnlocked(false)}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <FiLock className="h-3.5 w-3.5" /> Lock Forum
        </button>
      </div>

      {/* Stats row */}
      <div className="mb-6">
        <StatGroup
          items={[
            { label: 'Total members', value: totalCount, icon: FiUsers, accent: '#F7C948' },
            { label: 'Checked in today', value: checkedInCount, icon: FiCheckCircle, accent: '#34D399' },
            {
              label: 'Attendance rate',
              value: `${totalCount ? Math.round((checkedInCount / totalCount) * 100) : 0}%`,
              icon: FiStar,
              accent: '#FF4F9A',
            },
          ]}
        />
      </div>

      {/* Tools row */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {/* QR Scanner card — the one primary/filled action on this screen */}
        <ActionBanner
          eyebrow="Member attendance"
          title="Scan QR Badge"
          subtitle="Use device camera to scan & verify members."
          icon={MdQrCodeScanner}
          onClick={() => setScannerOpen(true)}
        />

        {/* Manage Events card */}
        <Card
          as="div"
          variant="raised"
          role="button"
          tabIndex={0}
          onClick={() => setEventsManagerOpen(true)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setEventsManagerOpen(true)}
          className="group cursor-pointer p-6 transition hover:-translate-y-0.5 hover:bg-white/[0.06]"
        >
          <div className="flex items-center justify-between">
            <div>
              <Eyebrow color="#A53DFF">Content</Eyebrow>
              <h3 className="mt-2 text-xl font-bold text-white">Manage Events ▸</h3>
              <p className="mt-1 text-sm text-white/50">Add, edit, or remove events shown on the public Events page.</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.08] text-white group-hover:bg-white/[0.12] transition">
              <FiCalendar className="h-7 w-7" />
            </div>
          </div>
        </Card>

        {/* Manage Outreach Stories card */}
        <Card
          as="div"
          variant="raised"
          role="button"
          tabIndex={0}
          onClick={() => setStoriesManagerOpen(true)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setStoriesManagerOpen(true)}
          className="group cursor-pointer p-6 transition hover:-translate-y-0.5 hover:bg-white/[0.06]"
        >
          <div className="flex items-center justify-between">
            <div>
              <Eyebrow>Content</Eyebrow>
              <h3 className="mt-2 text-xl font-bold text-white">Manage Outreach ▸</h3>
              <p className="mt-1 text-sm text-white/50">Add stories &amp; photos to the public Outreaches page.</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.08] text-white group-hover:bg-white/[0.12] transition">
              <FiImage className="h-7 w-7" />
            </div>
          </div>
        </Card>

        {/* Manage Sermons card */}
        <Card
          as="div"
          variant="raised"
          role="button"
          tabIndex={0}
          onClick={() => setSermonsManagerOpen(true)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setSermonsManagerOpen(true)}
          className="group cursor-pointer p-6 transition hover:-translate-y-0.5 hover:bg-white/[0.06]"
        >
          <div className="flex items-center justify-between">
            <div>
              <Eyebrow color="#3D5AFE">Content</Eyebrow>
              <h3 className="mt-2 text-xl font-bold text-white">Manage Sermons ▸</h3>
              <p className="mt-1 text-sm text-white/50">Add YouTube sermon links shown on the public Sermons page.</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.08] text-white group-hover:bg-white/[0.12] transition">
              <FiFilm className="h-7 w-7" />
            </div>
          </div>
        </Card>

        {/* Manage Service Venues card */}
        <Card
          as="div"
          variant="raised"
          role="button"
          tabIndex={0}
          onClick={() => setVenuesManagerOpen(true)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setVenuesManagerOpen(true)}
          className="group cursor-pointer p-6 transition hover:-translate-y-0.5 hover:bg-white/[0.06]"
        >
          <div className="flex items-center justify-between">
            <div>
              <Eyebrow>Content</Eyebrow>
              <h3 className="mt-2 text-xl font-bold text-white">Manage Service Venues ▸</h3>
              <p className="mt-1 text-sm text-white/50">Set each chapter's Sunday check-in venue and time.</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.08] text-white group-hover:bg-white/[0.12] transition">
              <FiMapPin className="h-7 w-7" />
            </div>
          </div>
        </Card>

        {/* Manage Live Stream card */}
        <Card
          as="div"
          variant="raised"
          role="button"
          tabIndex={0}
          onClick={() => setLiveManagerOpen(true)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setLiveManagerOpen(true)}
          className="group cursor-pointer p-6 transition hover:-translate-y-0.5 hover:bg-white/[0.06]"
        >
          <div className="flex items-center justify-between">
            <div>
              <Eyebrow color="#F87171">Content</Eyebrow>
              <h3 className="mt-2 text-xl font-bold text-white">Manage Live Stream ▸</h3>
              <p className="mt-1 text-sm text-white/50">Set the stream link and go live/offline for the public Live page.</p>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/[0.08] text-white group-hover:bg-white/[0.12] transition">
              <FiRadio className="h-7 w-7" />
            </div>
          </div>
        </Card>
      </div>

      {/* Members list */}
      {loading && (
        <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm text-white/50">
          Loading members…
        </div>
      )}
      {loadError && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-300">
          <span>{loadError}</span>
          <button onClick={loadMembers} className="shrink-0 rounded-full border border-red-400/30 px-3 py-1 text-xs font-semibold hover:bg-red-500/10">
            Retry
          </button>
        </div>
      )}
      <MembersList
        members={members}
        checkedInIds={checkedInIds}
        onSelectMember={setSelectedMember}
      />

      {/* Scanner modal */}
      {scannerOpen && (
        <QRScannerPanel
          members={members}
          checkedInIds={checkedInIds}
          onCheckIn={handleCheckIn}
          onClose={() => setScannerOpen(false)}
          onViewProfile={setSelectedMember}
        />
      )}

      {/* Member detail modal */}
      {selectedMember && (
        <MemberModal member={selectedMember} onClose={() => setSelectedMember(null)} />
      )}

      {/* Events manager modal */}
      {eventsManagerOpen && (
        <EventsManagerPanel onClose={() => setEventsManagerOpen(false)} />
      )}

      {/* Outreach stories manager modal */}
      {storiesManagerOpen && (
        <StoriesManagerPanel onClose={() => setStoriesManagerOpen(false)} />
      )}

      {/* Sermons manager modal */}
      {sermonsManagerOpen && (
        <SermonsManagerPanel onClose={() => setSermonsManagerOpen(false)} />
      )}

      {/* Service venues manager modal */}
      {venuesManagerOpen && (
        <VenuesManagerPanel onClose={() => setVenuesManagerOpen(false)} />
      )}

      {/* Live stream manager modal */}
      {liveManagerOpen && (
        <LiveManagerPanel onClose={() => setLiveManagerOpen(false)} />
      )}
    </section>
  );
}
