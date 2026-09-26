import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiPhone, FiX } from 'react-icons/fi';
import { FaApple, FaGoogle } from 'react-icons/fa';
import QRCode from 'qrcode';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import { Toast } from '../components/ui/Toast';

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

function AuthBackdrop() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-[#020508]" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_64%_48%,rgba(29,155,240,.09),transparent_34%),radial-gradient(circle_at_85%_15%,rgba(29,155,240,.06),transparent_28%)]" />
      <div className="absolute -right-[12%] top-[8%] h-[65vw] w-[65vw] rounded-full border border-[#1D9BF0]/10 [transform:rotate(-22deg)]" />
      <div className="absolute -right-[4%] top-[18%] h-[46vw] w-[72vw] rounded-[50%] border border-[#60A5FA]/20 [transform:rotate(-23deg)] shadow-[0_0_35px_rgba(29,155,240,.08)]" />
      <div className="absolute -right-[10%] bottom-[8%] h-[32vw] w-[78vw] rounded-[50%] border border-[#60A5FA]/25 [transform:rotate(24deg)] shadow-[0_0_45px_rgba(29,155,240,.12)]" />
      <div className="absolute left-[48%] top-[22%] h-2 w-2 rounded-full bg-white shadow-[0_0_18px_5px_rgba(147,197,253,.8)]" />
      <div className="absolute right-[17%] top-[29%] h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_15px_4px_rgba(147,197,253,.7)]" />
      <div className="absolute right-[24%] bottom-[31%] h-2 w-2 rounded-full bg-[#60A5FA] shadow-[0_0_18px_5px_rgba(96,165,250,.8)]" />
      <div className="absolute left-[43%] bottom-[37%] h-1.5 w-1.5 rounded-full bg-[#60A5FA] shadow-[0_0_14px_4px_rgba(96,165,250,.75)]" />
      <div className="absolute right-[5%] top-[8%] h-px w-[35%] rotate-[-28deg] bg-gradient-to-r from-transparent via-[#60A5FA]/50 to-transparent" />
      <div className="absolute right-[10%] bottom-[16%] h-px w-[46%] rotate-[17deg] bg-gradient-to-r from-transparent via-[#60A5FA]/60 to-transparent" />
    </div>
  );
}

function ProviderButton({ icon, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[58px] w-full items-center justify-center gap-4 rounded-full bg-[#f4f6f8] px-5 text-[16px] font-semibold text-[#0a0d11] shadow-[0_8px_30px_rgba(0,0,0,.14)] transition hover:bg-white hover:shadow-[0_10px_35px_rgba(255,255,255,.1)] active:scale-[.99]"
    >
      <span className="grid w-6 place-items-center text-[21px]">{icon}</span>
      <span>{children}</span>
    </button>
  );
}

function QRCard() {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, window.location.origin, {
      width: 132,
      margin: 1,
      color: { dark: '#ffffff', light: '#00000000' },
      errorCorrectionLevel: 'M',
    }).catch(() => {});
  }, []);
  return (
    <div className="absolute bottom-8 right-8 z-20 hidden w-[208px] rounded-2xl border border-white/20 bg-[#080c12]/80 p-4 shadow-2xl backdrop-blur-xl lg:block">
      <p className="mb-3 text-center text-[15px] font-medium text-white/55">Scan to get the app</p>
      <div className="mx-auto grid w-[140px] place-items-center rounded-lg bg-black p-1">
        <canvas ref={canvasRef} className="h-[132px] w-[132px]" aria-label="Emet app QR code" />
      </div>
      <div className="pointer-events-none absolute left-1/2 top-[74%] grid h-8 w-8 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-md bg-black text-[15px] font-black text-white">=</div>
    </div>
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

  const setModeAndReset = (next) => {
    setMode(next);
    setStatus('idle');
    setError('');
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
    <main className="relative min-h-screen overflow-hidden bg-[#020508] text-white">
      <AuthBackdrop />

      <div className="relative z-10 min-h-screen lg:grid lg:grid-cols-[34%_66%]">
        <section className="flex min-h-screen flex-col px-7 py-8 sm:px-12 lg:min-h-screen lg:max-w-[610px] lg:px-[54px] lg:py-10">
          <img src="/emet-wordmark-geometric-white.svg" alt="EMET" className="h-auto w-[138px] opacity-95" />

          <div className="flex flex-1 flex-col justify-center pb-8 pt-16 lg:pb-14 lg:pt-20">
            {mode !== 'details' ? (
              <>
                <h1 className="max-w-[420px] text-[56px] font-bold leading-[.98] tracking-[-.045em] sm:text-[64px] lg:text-[70px]">Happening<br />now.</h1>

                <div className="mt-8 space-y-3">
                  <ProviderButton icon={<FiPhone className="h-5 w-5" />} onClick={() => providerUnavailable('Phone')}>Continue with phone</ProviderButton>
                  <ProviderButton icon={<FaGoogle className="text-[#4285F4]" />} onClick={() => providerUnavailable('Google')}>Continue with Google</ProviderButton>
                  <ProviderButton icon={<FaApple className="text-black" />} onClick={() => providerUnavailable('Apple')}>Continue with Apple</ProviderButton>
                </div>

                <div className="my-7 flex items-center gap-3 text-[16px] text-white/75">
                  <span className="h-px flex-1 bg-white/70" /><span>or</span><span className="h-px flex-1 bg-white/70" />
                </div>

                <form onSubmit={handleSubmit}>
                  <input
                    autoFocus
                    type={mode === 'login' ? 'email' : 'text'}
                    value={form.email}
                    onChange={(event) => update('email', event.target.value)}
                    placeholder="Email or username"
                    className="h-[70px] w-full rounded-xl border border-[#00C7FF] bg-black/35 px-4 text-[16px] text-white outline-none shadow-[0_0_0_1px_rgba(0,199,255,.1),0_0_30px_rgba(0,199,255,.04)] placeholder:text-[#20b8ed]"
                  />
                  {mode === 'login' && (
                    <input type="password" value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="Password" className="mt-3 h-[58px] w-full rounded-xl border border-white/10 bg-black/35 px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#00C7FF]" />
                  )}
                  {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
                  <button type="submit" disabled={status === 'submitting'} className="mt-7 flex h-[64px] w-full items-center justify-center gap-2 rounded-full bg-[#1c232e] text-[16px] font-semibold text-white/55 transition hover:bg-[#242d39] disabled:opacity-50">
                    {status === 'submitting' ? 'Please wait…' : mode === 'login' ? 'Continue' : 'Create account'}
                  </button>
                </form>

                <p className="mt-5 text-center text-sm text-white/40 lg:hidden">
                  {mode === 'login' ? 'New to Emet? ' : 'Already on Emet? '}
                  <button type="button" className="font-semibold text-white" onClick={() => setModeAndReset(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create an account' : 'Sign in'}</button>
                </p>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setModeAndReset('register')} className="mb-7 inline-flex w-fit items-center gap-2 text-sm text-white/55 hover:text-white"><FiX /> Back</button>
                <h1 className="text-4xl font-bold tracking-tight">Create your Emet account.</h1>
                <p className="mt-3 text-sm leading-6 text-white/45">A few details and you're in.</p>
                <form onSubmit={handleSubmit} className="mt-7 space-y-3">
                  <input required value={form.fullName} onChange={(e) => update('fullName', e.target.value)} placeholder="Full name" className="h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-sm outline-none focus:border-[#00C7FF]" />
                  <input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="Email address" className="h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-sm outline-none focus:border-[#00C7FF]" />
                  <input required type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Password" className="h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-sm outline-none focus:border-[#00C7FF]" />
                  <input required type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="Phone number" className="h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-sm outline-none focus:border-[#00C7FF]" />
                  <input required type="date" min={earliestBirthday} max={today} value={form.birthday} onChange={(e) => update('birthday', e.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-sm outline-none focus:border-[#00C7FF]" />
                  <select required value={form.gender} onChange={(e) => update('gender', e.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-sm outline-none focus:border-[#00C7FF]"><option value="">Gender</option><option value="MALE">Male</option><option value="FEMALE">Female</option></select>
                  <select required value={form.country} onChange={(e) => update('country', e.target.value)} className="h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-sm outline-none focus:border-[#00C7FF]"><option value="">Country</option><option value="KENYA">Kenya</option><option value="UGANDA">Uganda</option><option value="TANZANIA">Tanzania</option><option value="RWANDA">Rwanda</option><option value="BURUNDI">Burundi</option><option value="SOMALIA">Somalia</option></select>
                  <input required value={form.residence} onChange={(e) => update('residence', e.target.value)} placeholder="Residence" className="h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-sm outline-none focus:border-[#00C7FF]" />
                  <input required value={form.campusZone} onChange={(e) => update('campusZone', e.target.value)} placeholder="Campus zone" className="h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-sm outline-none focus:border-[#00C7FF]" />
                  <input required value={form.chapter} onChange={(e) => update('chapter', e.target.value)} placeholder="Chapter" className="h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-sm outline-none focus:border-[#00C7FF]" />
                  <input required value={form.invitedBy} onChange={(e) => update('invitedBy', e.target.value)} placeholder="Invited by" className="h-12 w-full rounded-xl border border-white/10 bg-black/35 px-4 text-sm outline-none focus:border-[#00C7FF]" />
                  {error && <p className="text-sm text-red-300">{error}</p>}
                  <button disabled={status === 'submitting'} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-sm font-bold text-black disabled:opacity-50">{status === 'submitting' ? 'Creating…' : 'Create account'} <FiArrowRight /></button>
                </form>
              </>
            )}
          </div>

          {mode !== 'details' && (
            <p className="max-w-[500px] text-[13px] leading-6 text-white/50">
              By continuing, you agree to our <a href="#terms" className="font-bold text-white/90 hover:underline">Terms of Service</a>, <a href="#privacy" className="font-bold text-white/90 hover:underline">Privacy Policy</a> and <a href="#guidelines" className="font-bold text-white/90 hover:underline">Community Guidelines</a>.
            </p>
          )}
        </section>

        <section className="relative hidden min-h-screen lg:block">
          <img src="/emet-wordmark-geometric-hero.svg" alt="" className="absolute left-[44%] top-[35%] z-10 w-[62%] max-w-[760px] -translate-x-1/2 -translate-y-1/2 opacity-90" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_50%,rgba(29,155,240,.08),transparent_35%)]" />
          <QRCard />
        </section>
      </div>


      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  );
}
