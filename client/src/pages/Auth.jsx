import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiArrowRight, FiEye, FiEyeOff, FiLock, FiPhone, FiX } from 'react-icons/fi';
import { FaApple, FaGoogle } from 'react-icons/fa';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import { Toast } from '../components/ui/Toast';

const AUTH_LOGIN_URL = '/api/auth/login';
const AUTH_REGISTER_URL = '/api/auth/register';
const APP_DOWNLOAD_URL = 'https://github.com/harveychrissham-crypto/blw-clean/releases/download/latest-android/blw-campus-ministry.apk';
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

function AuthBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#02091d]" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_9%_14%,rgba(0,66,208,.32),transparent_38%),radial-gradient(ellipse_at_90%_24%,rgba(76,50,205,.24),transparent_44%),linear-gradient(135deg,#061735_0%,#02091d_54%,#080d2b_100%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,9,29,.05)_0%,rgba(2,9,29,.12)_42%,rgba(2,9,29,.04)_100%)]" />
    </div>
  );
}

function ProviderButton({ icon, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[58px] w-full items-center justify-center gap-4 rounded-full bg-[#f7f9fc] px-5 text-[16px] font-semibold text-[#080b12] transition hover:bg-white active:scale-[.99]"
    >
      <span className="grid w-6 place-items-center text-[21px]">{icon}</span>
      <span>{children}</span>
    </button>
  );
}

export default function Auth() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loginStep, setLoginStep] = useState(0);
  const [appQr, setAppQr] = useState('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(APP_DOWNLOAD_URL, { width: 180, margin: 1, errorCorrectionLevel: 'H', color: { dark: '#ffffff', light: '#0b1020' } })
      .then((src) => { if (active) setAppQr(src); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const setModeAndReset = (next) => {
    setMode(next);
    setStatus('idle');
    setError('');
    setLoginStep(0);
  };

  const providerUnavailable = (provider) => {
    const message = `${provider} sign-in is not connected yet.`;
    setError(message);
    setToast({ type: 'error', message });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('submitting');
    setError('');

    if (mode === 'login') {
      if (!form.email || !form.password) {
        const message = 'Enter your email and password to continue.';
        setError(message); setStatus('error'); return;
      }
      try {
        const response = await apiFetch(AUTH_LOGIN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
          const message = body.error || 'Unable to sign in.';
          setError(message); setStatus('error'); setToast({ type: 'error', message }); return;
        }
        await login(body.user, body.token);
        navigate('/dashboard');
      } catch (err) {
        const message = err.message || 'Unable to sign in.';
        setError(message); setStatus('error'); setToast({ type: 'error', message });
      }
      return;
    }

    if (mode === 'register') {
      setMode('details');
      setStatus('idle');
      return;
    }

    if (!isValidBirthday(form.birthday)) {
      const message = 'Please select a valid birthday.';
      setError(message); setStatus('error'); return;
    }

    try {
      const response = await apiFetch(AUTH_REGISTER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = body.message || body.error || 'Unable to create your account.';
        setError(message); setStatus('error'); setToast({ type: 'error', message }); return;
      }
      await login(body.user, body.token);
      navigate('/dashboard');
    } catch (err) {
      const message = err.message || 'Unable to create your account.';
      setError(message); setStatus('error'); setToast({ type: 'error', message });
    }
  };

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#02091d] text-white">
      <AuthBackdrop />
      <div className="relative z-10 mx-auto grid min-h-screen max-w-[1800px] grid-cols-1 lg:grid-cols-[minmax(440px,38%)_1fr]">
        <section className="relative flex min-h-screen flex-col px-6 pb-10 pt-5 sm:px-10 lg:px-11 lg:pt-2">
          <Link to="/" aria-label="Emet home" className="mb-4 flex items-center gap-2 lg:hidden">
            <img src="/emet-logo.png" alt="" className="h-12 w-12" />
            <span role="img" aria-label="Emet" className="emet-wordmark" />
          </Link>
          <h1 className="max-w-[600px] text-[46px] font-extrabold leading-[1.02] tracking-[-.045em] sm:text-[56px] lg:mt-2 lg:text-[clamp(56px,5vw,84px)]">
            {mode === 'login' ? <><span className="block">Real People.</span><span className="block">Meaningful</span><span className="block bg-gradient-to-r from-cyan-400 via-blue-500 to-fuchsia-500 bg-clip-text text-transparent">Connections.</span></> : mode === 'details' ? <>Join<br />Emet.</> : <>Welcome<br />to Emet.</>}
          </h1>
          {mode === 'login' && <p className="mt-5 text-[17px] text-[#c7d7f4] sm:text-[19px]">Share. Discuss. Build. Together.</p>}
          <div className="mt-9 w-full max-w-[580px] sm:mt-12">
            {mode !== 'details' ? (
              <>
                {mode === 'login' && loginStep === 0 && <div className="mb-2 space-y-3">
                  <ProviderButton icon={<FiPhone className="h-5 w-5" />} onClick={() => providerUnavailable('Phone')}>Continue with phone</ProviderButton>
                  <ProviderButton icon={<FaGoogle className="text-[22px] text-[#4285F4]" />} onClick={() => providerUnavailable('Google')}>Continue with Google</ProviderButton>
                  <ProviderButton icon={<FaApple className="text-[23px] text-black" />} onClick={() => providerUnavailable('Apple')}>Continue with Apple</ProviderButton>
                </div>}
                {mode === 'login' && loginStep === 0 && <div className="my-5 flex items-center gap-3 text-sm text-[#adc8f3]/65"><span className="h-px flex-1 bg-white/15" /><span>or</span><span className="h-px flex-1 bg-white/15" /></div>}

                <form onSubmit={mode === 'login' && loginStep === 0 ? (event) => { event.preventDefault(); if (!form.email.trim()) { setError('Enter your email or username to continue.'); return; } setError(''); setLoginStep(1); } : handleSubmit}>
                  {(mode !== 'login' || loginStep === 0) && <label className="flex min-h-[76px] flex-col justify-center rounded-lg border border-[#148dfb] px-3.5 py-2.5 focus-within:border-cyan-300">
                    <span className="text-[13px] text-cyan-400">{mode === 'login' ? 'Email or username' : 'Email address'}</span>
                    <input autoFocus type={mode === 'login' ? 'text' : 'email'} value={form.email} onChange={(event) => update('email', event.target.value)} className="auth-card-input mt-1 h-7 min-w-0 !border-0 !bg-transparent !rounded-none !shadow-none px-0 text-[16px] text-white outline-none" />
                  </label>}
                  {mode === 'login' && loginStep === 1 && <>
                    <button type="button" onClick={() => { setLoginStep(0); setError(''); }} className="mb-3 inline-flex items-center gap-2 text-sm text-white/65 hover:text-white"><FiArrowLeft />{form.email}</button>
                    <label className="flex h-[76px] items-center gap-3 rounded-lg border border-[#148dfb] px-3.5 focus-within:border-cyan-300">
                      <FiLock className="h-5 w-5 shrink-0 text-[#a9c7f5]" />
                      <input autoFocus type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="Password" className="auth-card-input h-full min-w-0 flex-1 !border-0 !bg-transparent !rounded-none !shadow-none px-0 text-[16px] text-white outline-none placeholder:text-[#a9c7f5]/70" />
                      <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="text-[#a9c7f5]">{showPassword ? <FiEyeOff /> : <FiEye />}</button>
                    </label>
                    <div className="mt-3 flex justify-end text-sm"><Link to="/forgot-password" className="font-semibold text-[#159eff] hover:text-cyan-300">Forgot password?</Link></div>
                  </>}
                  {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
                  <button type="submit" disabled={status === 'submitting'} className="mt-4 flex h-[58px] w-full items-center justify-center gap-3 rounded-full bg-[#f1f3f5] text-[17px] font-bold text-[#101319] transition hover:bg-white disabled:cursor-not-allowed disabled:bg-[#424242] disabled:text-white/50">
                    {status === 'submitting' ? 'Please wait…' : mode === 'login' ? loginStep === 0 ? 'Continue' : 'Sign in' : 'Continue'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setModeAndReset('register')} className="mb-4 inline-flex items-center gap-2 text-sm text-white/65 hover:text-white"><FiX /> Back</button>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input required value={form.fullName} onChange={(e) => update('fullName', e.target.value)} placeholder="Full name" className="h-12 w-full rounded-lg border border-[#2456a8] bg-[#06152d]/65 px-4 text-sm outline-none focus:border-[#27baff]" />
                  <input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="Email address" className="h-12 w-full rounded-lg border border-[#2456a8] bg-[#06152d]/65 px-4 text-sm outline-none focus:border-[#27baff]" />
                  <input required type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Password" className="h-12 w-full rounded-lg border border-[#2456a8] bg-[#06152d]/65 px-4 text-sm outline-none focus:border-[#27baff]" />
                  <input required type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="Phone number" className="h-12 w-full rounded-lg border border-[#2456a8] bg-[#06152d]/65 px-4 text-sm outline-none focus:border-[#27baff]" />
                  <input required type="date" min={earliestBirthday} max={today} value={form.birthday} onChange={(e) => update('birthday', e.target.value)} className="h-12 w-full rounded-lg border border-[#2456a8] bg-[#06152d]/65 px-4 text-sm outline-none focus:border-[#27baff]" />
                  <select required value={form.gender} onChange={(e) => update('gender', e.target.value)} className="h-12 w-full rounded-lg border border-[#2456a8] bg-[#06152d] px-4 text-sm outline-none focus:border-[#27baff]"><option value="">Gender</option><option value="MALE">Male</option><option value="FEMALE">Female</option></select>
                  <select required value={form.country} onChange={(e) => update('country', e.target.value)} className="h-12 w-full rounded-lg border border-[#2456a8] bg-[#06152d] px-4 text-sm outline-none focus:border-[#27baff]"><option value="">Country</option><option value="KENYA">Kenya</option><option value="UGANDA">Uganda</option><option value="TANZANIA">Tanzania</option><option value="RWANDA">Rwanda</option><option value="BURUNDI">Burundi</option><option value="SOMALIA">Somalia</option></select>
                  <input required value={form.residence} onChange={(e) => update('residence', e.target.value)} placeholder="Residence" className="h-12 w-full rounded-lg border border-[#2456a8] bg-[#06152d]/65 px-4 text-sm outline-none focus:border-[#27baff]" />
                  <input required value={form.campusZone} onChange={(e) => update('campusZone', e.target.value)} placeholder="Campus zone" className="h-12 w-full rounded-lg border border-[#2456a8] bg-[#06152d]/65 px-4 text-sm outline-none focus:border-[#27baff]" />
                  <input required value={form.chapter} onChange={(e) => update('chapter', e.target.value)} placeholder="Chapter" className="h-12 w-full rounded-lg border border-[#2456a8] bg-[#06152d]/65 px-4 text-sm outline-none focus:border-[#27baff]" />
                  <input required value={form.invitedBy} onChange={(e) => update('invitedBy', e.target.value)} placeholder="Invited by" className="h-12 w-full rounded-lg border border-[#2456a8] bg-[#06152d]/65 px-4 text-sm outline-none focus:border-[#27baff] sm:col-span-2" />
                  {error && <p className="text-sm text-red-300 sm:col-span-2">{error}</p>}
                  <button disabled={status === 'submitting'} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-fuchsia-500 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2">{status === 'submitting' ? 'Creating…' : 'Create account'} <FiArrowRight /></button>
                </form>
              </>
            )}

            <p className="mt-5 text-center text-sm text-[#adc8f3] sm:text-left">
              {mode === 'login' ? "Don’t have an account? " : 'Already have an account? '}
              <button type="button" className="font-semibold text-[#159eff] hover:text-cyan-300" onClick={() => setModeAndReset(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create one' : 'Sign in'}</button>
            </p>
          </div>
        </section>

        <aside className="relative hidden min-h-screen overflow-hidden lg:block" aria-label="Emet app information">
          <svg className="emet-hero-wordmark absolute left-1/2 top-[43%] w-[86%] max-w-[1100px] -translate-x-1/2 -translate-y-1/2" viewBox="0 0 112 24" aria-hidden="true" fill="none" stroke="url(#emetHeroWordmarkGradient)" strokeOpacity=".72" strokeWidth=".42"><defs><linearGradient id="emetHeroWordmarkGradient" x1="0" y1="0" x2="112" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stopColor="#28c7d8"/><stop offset=".52" stopColor="#5782f5"/><stop offset="1" stopColor="#a557dd"/><animateTransform attributeName="gradientTransform" type="translate" values="-112 0;112 0;-112 0" dur="14s" repeatCount="indefinite"/></linearGradient></defs>
            <rect x="6" y="3" width="18" height="3.5" rx=".8"/><rect x="6" y="9.25" width="18" height="3.5" rx=".8"/><rect x="6" y="15.5" width="18" height="3.5" rx=".8"/>
            <path d="M31 19V3h4.5L43 10.5 50.5 3H55v16h-4V9.5L43 18l-8-8.5V19z"/>
            <rect x="61" y="3" width="18" height="3.5" rx=".8"/><rect x="61" y="9.25" width="18" height="3.5" rx=".8"/><rect x="61" y="15.5" width="18" height="3.5" rx=".8"/>
            <path d="M86 3h20v3.5h-8.25V19h-3.5V6.5H86z" fill="rgba(21,34,54,.28)" strokeLinejoin="round"/>
          </svg>
          <div className="absolute bottom-7 right-7 w-[190px] rounded-2xl border border-white/15 bg-[#09132a]/90 p-4 text-center shadow-[0_18px_60px_rgba(0,0,0,.32)] backdrop-blur-xl">
            <p className="mb-3 text-sm text-white/65">Scan to get the app</p>
            {appQr && <img src={appQr} alt="QR code to download the Emet app" className="mx-auto h-[150px] w-[150px] rounded-lg" />}
            <img src="/emet-logo.png" alt="Emet app icon" className="mx-auto mt-3 h-8 w-8 rounded-md" />
          </div>
        </aside>
      </div>

      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  );
}

