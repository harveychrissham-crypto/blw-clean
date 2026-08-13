import { useState, useEffect, useRef } from 'react';
import { FiSearch, FiPhone, FiMail, FiDownload, FiCheckCircle, FiLogIn } from 'react-icons/fi';
import { MdQrCodeScanner } from 'react-icons/md';
import QRCode from 'qrcode';
import { apiFetch } from '../config/api';
import { useAuth } from '../context/AuthContext';

const MEMBER_SEARCH_URL = '/api/members/search';
const SELF_CHECKIN_URL = '/api/members/self-checkin';

function MemberQRCode({ member }) {
  const canvasRef = useRef(null);
  const qrPayload = [member.membershipId, member.name, member.phone, member.email].join('|');

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, qrPayload, {
      width: 260, margin: 2,
      color: { dark: '#0f0f1a', light: '#ffffff' },
      errorCorrectionLevel: 'H',
    });
  }, [qrPayload]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `${member.name.replace(/\s+/g, '_')}_QR_Badge.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/90 p-6 shadow-soft">
      <div className="rounded-[2rem] bg-white p-6 shadow-soft">
        <p className="mb-4 text-center text-xs font-bold uppercase tracking-[0.25em] text-slate-400">BLW Campus Ministry</p>
        <div className="mx-auto mb-4 flex items-center justify-center rounded-2xl bg-white p-2" style={{ width: 276, height: 276 }}>
          <canvas ref={canvasRef} className="rounded-xl" />
        </div>
        <div className="space-y-1 text-center">
          <p className="text-lg font-bold text-slate-900">{member.name}</p>
          <p className="text-xs text-slate-400">{member.gender}{member.birthday ? ` · ${member.birthday}` : ''}</p>
          <p className="text-sm text-slate-500">{member.email}</p>
          <p className="text-sm text-slate-500">{member.phone}</p>
          <div className="my-2 h-px bg-slate-100" />
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-slate-500">
            <span>{member.chapter}</span><span>·</span><span>{member.campusZone?.replace(/_/g, ' ')}</span>
          </div>
          {member.country && <p className="text-xs text-slate-400">{member.residence ? `${member.residence}, ` : ''}{member.country}</p>}
          {member.invitedBy && <p className="text-xs text-slate-400">Invited by: {member.invitedBy}</p>}
          <div className="my-2 h-px bg-slate-100" />
          <p className="text-sm font-semibold tracking-wider text-slate-700">{member.membershipId}</p>
          <p className="text-xs text-slate-400">Badge: {member.badge}</p>
          <span className="inline-block rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-semibold text-emerald-700">{member.status}</span>
          {member.joinDate && <p className="text-xs text-slate-400">Joined: {member.joinDate}</p>}
        </div>
      </div>
      <button type="button" onClick={handleDownload} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90">
        <FiDownload /> Download QR Badge
      </button>
    </div>
  );
}

export default function Checkin() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [found, setFound] = useState(false);
  const [foundProfile, setFoundProfile] = useState(null);
  const [message, setMessage] = useState('Enter your phone number or email to find your member profile and check in.');
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState('');
  const [checkinError, setCheckinError] = useState('');

  const handleSearch = async (event) => {
    event.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) {
      setMessage('Please enter a phone number or email to continue.');
      setFound(false); setFoundProfile(null); return;
    }
    setIsLoading(true); setMessage('Searching for your member profile...'); setCheckinMessage(''); setCheckinError('');
    try {
      const response = await apiFetch(`${MEMBER_SEARCH_URL}?q=${encodeURIComponent(trimmed)}`);
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(body.error || 'No matching account was found. Please check your phone number or email and try again.');
        setFound(false); setFoundProfile(null); return;
      }
      const match = Array.isArray(body.members) ? body.members[0] : null;
      if (!match) {
        setMessage('No matching account was found. Please check your phone number or email and try again.');
        setFound(false); setFoundProfile(null); return;
      }
      setFound(true); setFoundProfile(match);
      setMessage('Profile located. You can now check yourself in.');
    } catch {
      setMessage('Unable to reach the member service. Please try again in a moment.');
      setFound(false); setFoundProfile(null);
    } finally { setIsLoading(false); }
  };

  const handleSelfCheckIn = async () => {
    setIsCheckingIn(true); setCheckinMessage(''); setCheckinError('');
    try {
      if (!user?.email) throw new Error('Please sign in to your account before checking in.');
      if (!foundProfile?.email || user.email.toLowerCase() !== foundProfile.email.toLowerCase()) {
        throw new Error('For security, you can only check in the account you are signed in with.');
      }
      const response = await apiFetch(SELF_CHECKIN_URL, { method: 'POST' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Unable to check in right now.');
      const checked = body.member || { ...foundProfile, checkedIn: true };
      setFoundProfile(checked);
      setCheckinMessage(body.message || 'You are checked in successfully.');
    } catch (error) {
      setCheckinError(error?.message || 'Unable to check in right now.');
    } finally { setIsCheckingIn(false); }
  };

  const resetSearch = () => {
    setQuery(''); setFound(false); setFoundProfile(null);
    setMessage('Enter your phone number or email to find your member profile and check in.');
    setCheckinMessage(''); setCheckinError('');
  };

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      {!found ? (
        <div className="mb-12 grid items-start gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <div className="flex items-center gap-2"><MdQrCodeScanner className="text-xl text-[#D8B2FF]" /><p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D8B2FF]">Member Check-In</p></div>
            <h1 className="mt-4 text-3xl font-semibold text-white sm:text-4xl">Find your profile and complete attendance instantly.</h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-300">Enter the phone number or email you registered with. Signed-in members can then mark themselves present.</p>
            <div className="mt-8 rounded-3xl border border-white/10 bg-slate-950/70 p-8 shadow-soft">
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="rounded-2xl border border-white/10 bg-[#121321]/80 px-4 py-3">
                  <label className="block text-sm font-medium text-slate-400">Phone number or email</label>
                  <input value={query} onChange={(e) => setQuery(e.target.value)} className="mt-2 w-full bg-transparent text-white outline-none placeholder:text-slate-500" placeholder="0712345678 or name@example.com" />
                </div>
                <button type="submit" disabled={isLoading} className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-60">
                  <FiSearch /> {isLoading ? 'Searching...' : 'Find me'}
                </button>
              </form>
              <p className="mt-4 text-sm text-slate-400">{message}</p>
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-soft">
              <div className="flex items-center gap-3 text-[#D8B2FF]"><MdQrCodeScanner className="text-xl" /><span className="text-sm font-semibold uppercase tracking-[0.3em]">Quick check-in</span></div>
              <div className="mt-6 space-y-4 text-slate-300">
                <div><p className="text-sm font-semibold text-white">Find your profile</p><p className="mt-2 text-sm">Use the phone number or email on your registration.</p></div>
                <div><p className="text-sm font-semibold text-white">Check yourself in</p><p className="mt-2 text-sm">You must be signed in with the same member account for the attendance action.</p></div>
                <div><p className="text-sm font-semibold text-white">QR badge ready</p><p className="mt-2 text-sm">Your QR badge can still be presented to the welcome team.</p></div>
              </div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#A53DFF]/10 to-[#8A2BE2]/10 p-6">
              <p className="text-sm uppercase tracking-[0.3em] text-[#D8B2FF]">Member support</p>
              <h2 className="mt-3 text-2xl font-semibold text-white">Need help checking in?</h2>
              <p className="mt-4 text-sm text-slate-300">If your profile does not appear, contact the campus desk or support team.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"><div className="flex items-center gap-2 text-[#D8B2FF]"><FiPhone /> Phone</div><p className="mt-2 text-sm text-slate-400">+254 700 000 000</p></div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"><div className="flex items-center gap-2 text-[#D8B2FF]"><FiMail /> Email</div><p className="mt-2 text-sm text-slate-400">hello@blwcampusministry.org</p></div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {found && foundProfile && (
        <div className="space-y-8">
          <div className="rounded-3xl border border-white/10 bg-slate-950/80 p-6 shadow-soft">
            <div className="flex flex-col gap-6 rounded-3xl border border-white/10 bg-[#121321]/80 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4"><div className="h-24 w-24 rounded-3xl bg-gradient-to-br from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] p-2 shadow-soft"><div className="flex h-full w-full items-center justify-center rounded-3xl bg-slate-950 text-3xl font-bold text-white">{foundProfile.name?.charAt(0).toUpperCase()}</div></div><div><p className="text-sm uppercase tracking-[0.3em] text-[#D8B2FF]">Church Member</p><h2 className="mt-2 text-3xl font-semibold text-white">{foundProfile.name}</h2><p className="mt-1 text-sm text-slate-400">{foundProfile.email}</p><p className="text-sm text-slate-400">{foundProfile.phone}</p></div></div>
              <div className="flex flex-wrap items-center gap-3"><span className="rounded-full border border-[#A53DFF]/30 bg-[#A53DFF]/10 px-4 py-2 text-sm font-semibold text-[#D8B2FF]">{foundProfile.membershipId}</span><span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">{foundProfile.checkedIn ? 'Checked in' : foundProfile.status}</span></div>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <div className="rounded-3xl border border-white/10 bg-slate-950/90 p-6 shadow-soft">
                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ['Phone', foundProfile.phone], ['Email', foundProfile.email], ['Gender', foundProfile.gender || '—'], ['Birthday', foundProfile.birthday || '—'],
                    ['Campus Zone', foundProfile.campusZone || '—'], ['Chapter', foundProfile.chapter || '—'], ['Country', foundProfile.country || '—'], ['Residence', foundProfile.residence || '—'],
                    ['Invited By', foundProfile.invitedBy || '—'], ['Date Joined', foundProfile.joinDate || '—'], ['Membership ID', foundProfile.membershipId], ['Badge', foundProfile.badge]
                  ].map(([label,value]) => <div key={label} className="rounded-3xl border border-white/10 bg-[#121321]/80 p-4"><p className="text-xs uppercase tracking-[0.3em] text-slate-500">{label}</p><p className="mt-3 text-lg font-semibold text-white">{value}</p></div>)}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-slate-950/90 p-6 shadow-soft">
                {checkinMessage && <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300"><FiCheckCircle /> {checkinMessage}</div>}
                {checkinError && <div className="mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{checkinError}</div>}
                {foundProfile.checkedIn ? (
                  <div className="flex items-center gap-3 rounded-2xl bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-300"><FiCheckCircle className="h-5 w-5" /> You are already checked in for today.</div>
                ) : (
                  <button type="button" onClick={handleSelfCheckIn} disabled={isCheckingIn} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] py-4 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-60">
                    <FiCheckCircle /> {isCheckingIn ? 'Checking in...' : user?.email ? 'Check In Now' : 'Sign In to Check In'}
                  </button>
                )}
                {!user?.email && !foundProfile.checkedIn && <p className="mt-3 text-center text-xs text-slate-500">Sign in to the same member account before checking in.</p>}
              </div>
            </div>

            <div className="space-y-4">
              <MemberQRCode member={foundProfile} />
              <button type="button" onClick={resetSearch} className="w-full rounded-full border border-white/10 bg-slate-950/80 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-900">Search again</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
