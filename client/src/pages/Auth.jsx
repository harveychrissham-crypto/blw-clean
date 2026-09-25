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
        <radialGradient id="emet-world-ocean" cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor="#173b8a" stopOpacity=".58" />
          <stop offset="58%" stopColor="#0b255c" stopOpacity=".42" />
          <stop offset="100%" stopColor="#020617" stopOpacity=".1" />
        </radialGradient>
        <linearGradient id="emet-continent" x1="180" y1="120" x2="520" y2="430">
          <stop stopColor="#2563EB" stopOpacity=".32" />
          <stop offset=".55" stopColor="#3B82F6" stopOpacity=".2" />
          <stop offset="1" stopColor="#60A5FA" stopOpacity=".1" />
        </linearGradient>
        <linearGradient id="emet-route" x1="100" y1="100" x2="600" y2="430">
          <stop stopColor="#93C5FD" stopOpacity=".12" />
          <stop offset=".5" stopColor="#60A5FA" stopOpacity=".9" />
          <stop offset="1" stopColor="#93C5FD" stopOpacity=".12" />
        </linearGradient>
      </defs>

      <ellipse cx="350" cy="278" rx="305" ry="190" fill="url(#emet-world-ocean)" stroke="#3B82F6" strokeOpacity=".28" />
      <ellipse cx="350" cy="278" rx="305" ry="190" stroke="#60A5FA" strokeOpacity=".1" />
      <ellipse cx="350" cy="278" rx="215" ry="190" stroke="#60A5FA" strokeOpacity=".12" />
      <ellipse cx="350" cy="278" rx="105" ry="190" stroke="#60A5FA" strokeOpacity=".1" />
      <path d="M55 278H645M78 208C210 250 490 250 622 208M78 348C210 306 490 306 622 348" stroke="#60A5FA" strokeOpacity=".1" />

      <g className="emet-continents" fill="url(#emet-continent)" stroke="#60A5FA" strokeOpacity=".58" strokeWidth="1.1">
        <path d="M106 177L127 145L160 133L183 105L218 113L239 139L263 150L271 178L252 195L236 215L211 214L196 232L170 225L155 207L126 211L111 196Z" />
        <path d="M222 239L246 247L261 267L258 291L243 306L235 331L220 354L211 382L196 403L181 389L184 362L174 339L183 313L178 286L190 263L205 251Z" />
        <path d="M276 143L299 120L335 115L365 128L394 120L430 128L459 116L501 128L535 151L572 160L600 184L589 203L553 204L527 216L497 211L475 225L445 218L425 202L398 208L377 193L350 195L327 180L303 181L286 166Z" />
        <path d="M332 210L355 203L374 218L383 241L372 259L376 279L363 298L347 289L338 270L325 257L327 236L315 223Z" />
        <path d="M489 250L511 245L530 254L539 270L527 283L510 284L498 273L486 263Z" />
        <path d="M520 332L542 324L566 330L585 344L576 360L554 366L537 355L518 349Z" />
        <path d="M577 397L594 391L613 399L622 414L613 429L594 431L581 419Z" />
      </g>

      <g className="emet-network-routes" fill="none" stroke="url(#emet-route)" strokeWidth="1.35">
        <path d="M160 170C245 110 390 110 505 184" />
        <path d="M205 199C285 174 365 180 438 218" />
        <path d="M246 270C305 218 385 208 520 267" />
        <path d="M222 335C310 295 412 296 555 344" />
        <path d="M360 150C345 215 365 280 520 335" />
      </g>

      <g className="emet-network-points" fill="#BFDBFE">
        <circle cx="160" cy="170" r="4" /><circle cx="205" cy="199" r="3.5" />
        <circle cx="246" cy="270" r="4.5" /><circle cx="360" cy="150" r="4" />
        <circle cx="438" cy="218" r="4" /><circle cx="520" cy="267" r="4.5" />
        <circle cx="222" cy="335" r="3.5" /><circle cx="555" cy="344" r="4" />
        <circle cx="594" cy="411" r="3.5" />
      </g>

      <g className="emet-orbits" fill="none" stroke="#60A5FA" strokeOpacity=".28" strokeDasharray="5 13">
        <ellipse className="emet-orbit emet-orbit-one" cx="350" cy="278" rx="315" ry="205" />
        <ellipse className="emet-orbit emet-orbit-two" cx="350" cy="278" rx="240" ry="205" />
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
        .emet-network{position:relative;display:grid;height:100%;min-height:360px;place-items:center;overflow:hidden;background:radial-gradient(circle at 50% 44%,rgba(37,99,235,.2),transparent 44%),linear-gradient(145deg,#071126,#020617 76%);isolation:isolate}
        .emet-network-glow{position:absolute;width:62%;aspect-ratio:1;border-radius:999px;background:#2563eb;filter:blur(95px);opacity:.16;animation:emet-glow 6s ease-in-out infinite}
        .emet-network-svg{position:relative;width:112%;max-width:720px;height:auto;filter:drop-shadow(0 0 22px rgba(59,130,246,.18))}
        .emet-continents path{animation:emet-land 5s ease-in-out infinite}
        .emet-continents path:nth-child(2n){animation-delay:.7s}
        .emet-network-routes path{stroke-dasharray:7 13;animation:emet-route 5s linear infinite}
        .emet-network-routes path:nth-child(2n){animation-delay:1.1s}
        .emet-network-points circle{filter:drop-shadow(0 0 8px rgba(147,197,253,.95));animation:emet-point 2.8s ease-in-out infinite}
        .emet-network-points circle:nth-child(2n){animation-delay:.5s}
        .emet-network-points circle:nth-child(3n){animation-delay:1s}
        .emet-orbit-one{transform-origin:350px 278px;animation:emet-orbit 18s linear infinite}
        .emet-orbit-two{transform-origin:350px 278px;animation:emet-orbit-reverse 14s linear infinite}
        .emet-network-label{position:absolute;bottom:24px;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:9px;white-space:nowrap;border:1px solid rgba(96,165,250,.2);border-radius:999px;background:rgba(2,6,23,.68);padding:9px 14px;color:rgba(191,219,254,.82);font-size:11px;font-weight:600;letter-spacing:.03em;backdrop-filter:blur(12px)}
        .emet-network-pulse{width:7px;height:7px;border-radius:50%;background:#60a5fa;box-shadow:0 0 12px #60a5fa;animation:emet-pulse 1.7s ease-in-out infinite}
        @keyframes emet-glow{0%,100%{transform:scale(.94);opacity:.12}50%{transform:scale(1.08);opacity:.23}}
        @keyframes emet-land{0%,100%{fill-opacity:.2}50%{fill-opacity:.34}}
        @keyframes emet-route{to{stroke-dashoffset:-40}}
        @keyframes emet-point{0%,100%{opacity:.48;transform:scale(.82)}50%{opacity:1;transform:scale(1.3)}}
        @keyframes emet-orbit{to{transform:rotate(360deg)}}
        @keyframes emet-orbit-reverse{to{transform:rotate(-360deg)}}
        @keyframes emet-pulse{0%,100%{transform:scale(.8);opacity:.5}50%{transform:scale(1.25);opacity:1}}
        @media (prefers-reduced-motion:reduce){.emet-network *{animation:none!important}}
      `}</style>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </section>
  );
}
