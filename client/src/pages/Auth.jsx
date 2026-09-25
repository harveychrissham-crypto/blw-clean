import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import { Card } from '../components/ui/Card';
import { Toast } from '../components/ui/Toast';
import Button from '../components/ui/Button';

const inputClass = 'w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none focus:border-purple-400';
const sectionLabelClass = 'text-xs font-semibold uppercase tracking-[0.3em] text-white/50';
const AUTH_LOGIN_URL = '/api/auth/login';
const AUTH_REGISTER_URL = '/api/auth/register';
const today = new Date().toISOString().slice(0, 10);
const earliestBirthday = '1900-01-01';

const emptyForm = {
  fullName: '', email: '', password: '', phone: '', birthday: '', gender: '', chapter: '',
  campusZone: '', country: '', residence: '', invitedBy: '',
};

const isValidBirthday = (value) => {
  if (!value) return false;
  const date = new Date(`${value}T00:00:00`);
  return !Number.isNaN(date.getTime()) && value >= earliestBirthday && value <= today;
};

const GlobalNetworkAnimation = () => (
  <div className="emet-network" aria-hidden="true">
    <div className="emet-network-glow" />
    <svg className="emet-network-svg" viewBox="0 0 700 560" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="emet-globe-fill" cx="50%" cy="42%" r="70%">
          <stop offset="0%" stopColor="#183c91" stopOpacity=".58" />
          <stop offset="62%" stopColor="#0c1d4c" stopOpacity=".38" />
          <stop offset="100%" stopColor="#050b1d" stopOpacity=".08" />
        </radialGradient>
        <linearGradient id="emet-line" x1="80" y1="80" x2="620" y2="480">
          <stop stopColor="#60A5FA" stopOpacity=".1" />
          <stop offset=".5" stopColor="#3B82F6" stopOpacity=".9" />
          <stop offset="1" stopColor="#93C5FD" stopOpacity=".08" />
        </linearGradient>
      </defs>

      <ellipse cx="350" cy="315" rx="285" ry="170" fill="url(#emet-globe-fill)" stroke="#3B82F6" strokeOpacity=".22" />
      <ellipse cx="350" cy="315" rx="285" ry="170" stroke="#60A5FA" strokeOpacity=".16" />
      <ellipse cx="350" cy="315" rx="205" ry="170" stroke="#60A5FA" strokeOpacity=".16" />
      <ellipse cx="350" cy="315" rx="112" ry="170" stroke="#60A5FA" strokeOpacity=".13" />
      <path d="M82 315H618M112 252C235 296 465 296 588 252M112 378C235 334 465 334 588 378" stroke="#60A5FA" strokeOpacity=".13" />

      <path className="emet-orbit emet-orbit-one" d="M108 230C190 64 485 70 592 250C642 334 542 474 354 486C176 497 55 386 108 230Z" stroke="url(#emet-line)" strokeWidth="1.5" strokeDasharray="8 14" />
      <path className="emet-orbit emet-orbit-two" d="M82 340C180 176 475 105 610 270C666 339 521 430 338 438C181 445 74 409 82 340Z" stroke="#60A5FA" strokeOpacity=".42" strokeWidth="1.2" strokeDasharray="5 16" />

      <g className="emet-network-lines" stroke="#60A5FA" strokeOpacity=".38" strokeWidth="1">
        <path d="M154 244L258 178L351 228L452 144L556 218" />
        <path d="M154 244L218 350L330 305L446 372L556 218" />
        <path d="M218 350L300 410L446 372" />
        <path d="M258 178L330 305L452 144" />
        <path d="M351 228L446 372L556 218" />
      </g>

      <g className="emet-network-points" fill="#93C5FD">
        <circle cx="154" cy="244" r="4" /><circle cx="258" cy="178" r="4" />
        <circle cx="351" cy="228" r="5" /><circle cx="452" cy="144" r="4" />
        <circle cx="556" cy="218" r="4" /><circle cx="218" cy="350" r="4" />
        <circle cx="330" cy="305" r="5" /><circle cx="446" cy="372" r="4" />
        <circle cx="300" cy="410" r="3.5" />
      </g>
    </svg>
    <div className="emet-network-label"><span className="emet-network-pulse" />Connecting people everywhere</div>
  </div>
);

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [lastMode, setLastMode] = useState('login');
  const [toast, setToast] = useState(null);
  const { login } = useAuth();

  const handleCampusZoneChange = (event) => setForm((prev) => ({ ...prev, campusZone: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('submitting');
    setError('');

    if (mode === 'login') {
      if (!form.email || !form.password) {
        const message = 'Email and password are required for sign in.';
        setError(message); setStatus('error'); setToast({ type: 'error', message }); return;
      }
      try {
        const response = await apiFetch(AUTH_LOGIN_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: form.email, password: form.password }) });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message = body.error || 'Unable to sign in.';
          setError(message); setStatus('error'); setToast({ type: 'error', message }); return;
        }
        await login(body.user, body.token);
        setForm({ ...emptyForm, email: form.email });
        setLastMode('login'); setStatus('submitted'); setToast({ type: 'success', message: 'Signed in successfully.' }); navigate('/dashboard');
      } catch (err) {
        const message = err.message || 'Unable to sign in.';
        setError(message); setStatus('error'); setToast({ type: 'error', message });
      }
      return;
    }

    if (!isValidBirthday(form.birthday)) {
      const message = 'Please select a valid birthday.';
      setError(message); setStatus('error'); setToast({ type: 'error', message }); return;
    }

    try {
      const response = await apiFetch(AUTH_REGISTER_URL, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = body.message || body.error || 'Unable to register.';
        setError(message); setStatus('error'); setToast({ type: 'error', message }); return;
      }
      await login(body.user, body.token);
      setForm(emptyForm); setLastMode('register'); setStatus('submitted');
      setToast({ type: 'success', message: 'Your account has been created and signed in successfully.' });
      navigate('/dashboard');
    } catch (err) {
      const message = err.message || 'Unable to register.';
      setError(message); setStatus('error'); setToast({ type: 'error', message });
    }
  };

  return (
    <section className="min-h-screen w-full bg-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-20 sm:px-6 lg:px-8">
        <Card variant="raised" className="flex w-full flex-col shadow-soft lg:flex-row">
          <div className="h-72 overflow-hidden bg-[#050b1d] lg:h-auto lg:w-1/2"><GlobalNetworkAnimation /></div>
          <div className="flex w-full flex-col justify-center bg-slate-950/90 p-8 sm:p-10 lg:w-1/2">
            <div className="max-w-md">
              {mode === 'login' ? <><p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-300">Welcome back</p><h2 className="mt-3 text-3xl font-semibold text-white">Sign In</h2><p className="mt-3 text-sm text-slate-400">Continue your journey with Emet.</p></> : <><p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-300">New here?</p><h2 className="mt-3 text-3xl font-semibold text-white">Create account</h2><p className="mt-3 text-sm text-slate-400">Create your Emet account — it's free.</p></>}

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                {mode === 'login' && <><input className={inputClass} type="email" placeholder="EMAIL ADDRESS" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /><input className={inputClass} type="password" placeholder="Password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></>}

                {mode === 'register' && <>
                  <div className="space-y-3"><p className={sectionLabelClass}>Personal info</p><input className={inputClass} placeholder="FULL NAME" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required /><select className={inputClass} value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })} required><option value="">SELECT YOUR GENDER *</option><option value="MALE">MALE</option><option value="FEMALE">FEMALE</option></select>
                    <label className="block"><span className="sr-only">Birthday</span><input className={inputClass} type="date" min={earliestBirthday} max={today} autoComplete="bday" value={form.birthday} onChange={(event) => setForm({ ...form, birthday: event.target.value })} required aria-label="Birthday" /></label>
                  </div>

                  <div className="space-y-3 border-t border-white/[0.06] pt-4"><p className={sectionLabelClass}>Contact</p><input className={inputClass} type="email" placeholder="EMAIL ADDRESS" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /><input className={inputClass} type="tel" inputMode="tel" pattern="\d{9,15}" placeholder="PHONE NUMBER *" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required title="Enter a phone number with only digits." /><input className={inputClass} type="password" placeholder="PASSWORD" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required /></div>

                  <div className="space-y-3 border-t border-white/[0.06] pt-4"><p className={sectionLabelClass}>Ministry</p><select className={inputClass} value={form.campusZone} onChange={handleCampusZoneChange} required><option value="">CAMPUS ZONE *</option><option value="BLW KENYA ZONE A">BLW KENYA ZONE A</option><option value="BLW KENYA ZONE B">BLW KENYA ZONE B</option></select><select className={inputClass} value={form.chapter} onChange={(event) => setForm({ ...form, chapter: event.target.value })} required><option value="">CHAPTER *</option><option value="UON CHAPTER">UON CHAPTER</option><option value="TUK CHAPTER">TUK CHAPTER</option></select><input className={inputClass} placeholder="INVITED BY *" value={form.invitedBy} onChange={(event) => setForm({ ...form, invitedBy: event.target.value })} required /></div>

                  <div className="space-y-3 border-t border-white/[0.06] pt-4"><p className={sectionLabelClass}>Address</p><select className={inputClass} value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} required><option value="">COUNTRY *</option><option value="KENYA">KENYA</option><option value="UGANDA">UGANDA</option><option value="TANZANIA">TANZANIA</option><option value="SOMALIA">SOMALIA</option><option value="RWANDA">RWANDA</option><option value="BURUNDI">BURUNDI</option></select><input className={inputClass} placeholder="RESIDENCE *" value={form.residence} onChange={(event) => setForm({ ...form, residence: event.target.value })} required /></div>
                </>}

                <Button type="submit" variant="gradient" className="inline-flex w-full justify-center" disabled={status === 'submitting'}>{status === 'submitting' ? 'Submitting…' : mode === 'register' ? 'Create Account' : 'Sign In'}</Button>
              </form>

              {mode === 'login' && <div className="mt-4 flex items-center justify-between text-sm text-slate-400"><Button variant="link" size="none" className="text-purple-300 hover:text-[#EC9EFF]" onClick={() => navigate('/forgot-password')}>Forgot password?</Button><Button variant="link" size="none" className="text-purple-300 hover:text-[#EC9EFF]" onClick={() => setMode('register')}>Don’t have an account? Register</Button></div>}
              {mode === 'register' && <div className="mt-4 flex items-center justify-center text-sm text-slate-400"><span>Already have an account?</span><Button variant="link" size="none" className="ml-2 text-purple-300 hover:text-[#EC9EFF]" onClick={() => setMode('login')}>Sign in</Button></div>}
              {status === 'submitted' && <div className="mt-6 rounded-2xl border border-purple-400/30 bg-purple-400/10 p-4 text-sm text-purple-300">{lastMode === 'login' ? 'Signed in successfully.' : 'Your account has been created and signed in successfully.'}</div>}
              {status === 'error' && error && <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
            </div>
          </div>
        </Card>
      </div>
      <style>{`
        .emet-network{position:relative;display:grid;height:100%;min-height:360px;place-items:center;overflow:hidden;background:radial-gradient(circle at 50% 48%,rgba(37,99,235,.24),transparent 42%),linear-gradient(145deg,#071126,#020617 72%);isolation:isolate}
        .emet-network-glow{position:absolute;width:55%;aspect-ratio:1;border-radius:999px;background:#2563eb;filter:blur(90px);opacity:.2;animation:emet-glow 5s ease-in-out infinite}
        .emet-network-svg{position:relative;width:112%;max-width:720px;height:auto;filter:drop-shadow(0 0 16px rgba(59,130,246,.2))}
        .emet-network-lines path{animation:emet-lines 3.8s ease-in-out infinite}
        .emet-network-points circle{filter:drop-shadow(0 0 7px rgba(147,197,253,.9));animation:emet-point 2.6s ease-in-out infinite}
        .emet-network-points circle:nth-child(2n){animation-delay:.45s}
        .emet-network-points circle:nth-child(3n){animation-delay:1s}
        .emet-orbit-one{transform-origin:350px 315px;animation:emet-orbit 16s linear infinite}
        .emet-orbit-two{transform-origin:350px 315px;animation:emet-orbit-reverse 12s linear infinite}
        .emet-network-label{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:9px;white-space:nowrap;border:1px solid rgba(96,165,250,.18);border-radius:999px;background:rgba(2,6,23,.58);padding:9px 14px;color:rgba(191,219,254,.78);font-size:11px;font-weight:600;letter-spacing:.03em;backdrop-filter:blur(12px)}
        .emet-network-pulse{width:7px;height:7px;border-radius:50%;background:#60a5fa;box-shadow:0 0 12px #60a5fa;animation:emet-pulse 1.7s ease-in-out infinite}
        @keyframes emet-glow{0%,100%{transform:scale(.92);opacity:.15}50%{transform:scale(1.08);opacity:.28}}
        @keyframes emet-point{0%,100%{opacity:.5;transform:scale(.8)}50%{opacity:1;transform:scale(1.35)}}
        @keyframes emet-lines{0%,100%{stroke-opacity:.22}50%{stroke-opacity:.72}}
        @keyframes emet-orbit{to{transform:rotate(360deg)}}
        @keyframes emet-orbit-reverse{to{transform:rotate(-360deg)}}
        @keyframes emet-pulse{0%,100%{transform:scale(.8);opacity:.5}50%{transform:scale(1.25);opacity:1}}
        @media (prefers-reduced-motion:reduce){.emet-network *{animation:none!important}}
      `}</style>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </section>
  );
}
