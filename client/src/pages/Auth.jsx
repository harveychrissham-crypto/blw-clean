import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiArrowRight, FiEye, FiEyeOff, FiLock, FiMail, FiX } from 'react-icons/fi';
import { FaApple, FaGoogle } from 'react-icons/fa';
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
    <div className="absolute inset-0 overflow-hidden bg-[#02091d]" aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_16%_4%,rgba(0,59,214,.34),transparent_42%),radial-gradient(ellipse_at_93%_3%,rgba(88,29,218,.32),transparent_38%)]" />
      <img src="/auth-scenic-background.webp" alt="" className="absolute bottom-0 left-0 hidden h-[31vh] w-[54%] object-cover object-center opacity-90 lg:block" />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,9,29,.05)_0%,rgba(2,9,29,.08)_42%,#02091d_100%)] lg:bg-[linear-gradient(90deg,transparent_0%,rgba(2,9,29,.06)_47%,#02091d_58%,#02091d_100%)]" />
    </div>
  );
}

function ProviderButton({ icon, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[58px] w-full items-center justify-center gap-4 rounded-full border border-[#2854a0] bg-[#020b20]/55 px-5 text-[16px] font-semibold text-white shadow-[0_8px_30px_rgba(0,0,0,.14)] transition hover:border-[#3984ed] hover:bg-[#071733] active:scale-[.99]"
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
  const [rememberMe, setRememberMe] = useState(false);

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
    <main className="relative min-h-screen overflow-x-hidden bg-[#02091d] text-white">
      <AuthBackdrop />

      <div className="relative z-10 mx-auto min-h-screen max-w-[1500px] lg:grid lg:grid-cols-[1.05fr_.95fr]">
        <section className="relative hidden min-h-screen flex-col px-12 pb-12 pt-14 lg:flex xl:px-[7vw]">
          <div className="flex items-center gap-3">
            <img src="/emet-logo.png" alt="" className="h-[88px] w-[88px]" />
            <img src="/emet-wordmark-geometric-white.svg" alt="EMET" className="h-auto w-[190px] opacity-95" />
          </div>
          <div className="relative z-10 mt-10 max-w-[540px]">
            <h1 className="text-[48px] font-extrabold leading-[1.02] tracking-[-.04em] xl:text-[58px]">Real People.<br />Meaningful<br /><span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-fuchsia-500 bg-clip-text text-transparent">Connections.</span></h1>
            <p className="mt-5 text-[18px] text-[#d5e4ff]">Share. Discuss. Build. Together.</p>
          </div>
          <div className="flex-1" />
        </section>

        <section className="flex min-h-screen flex-col items-center justify-center px-4 py-6 sm:px-8 lg:px-8 lg:py-10">
          <div className="mb-5 flex items-center gap-2 lg:hidden">
            <img src="/emet-logo.png" alt="" className="h-[58px] w-[58px]" />
            <img src="/emet-wordmark-geometric-white.svg" alt="EMET" className="h-auto w-[132px]" />
          </div>
          <div className="my-auto max-h-[calc(100vh-2rem)] w-full max-w-[524px] overflow-y-auto rounded-2xl border border-[#2456a8]/80 bg-[#020b20]/80 px-6 py-7 shadow-[0_20px_90px_rgba(0,0,0,.42)] backdrop-blur-xl sm:px-10 sm:py-9 lg:px-12 lg:py-10">
            <div className="text-center">
              <img src="/emet-logo.png" alt="" className="mx-auto h-[112px] w-[112px]" />
              <h2 className="mt-2 text-[30px] font-bold tracking-tight sm:text-[34px]">{mode === 'login' ? 'Welcome back' : mode === 'details' ? 'Create your account' : 'Join Emet'}</h2>
              <p className="mt-2 text-[15px] text-[#adc8f3]">{mode === 'login' ? 'Sign in to continue to Emet' : mode === 'details' ? 'Add a few details to finish signing up' : 'Create an account to continue to Emet'}</p>
            </div>

            {mode !== 'details' ? (
              <>
                <div className="mt-8 space-y-3">
                  <ProviderButton icon={<FaGoogle className="text-[22px] text-[#4285F4]" />} onClick={() => providerUnavailable('Google')}>Continue with Google</ProviderButton>
                  <ProviderButton icon={<FaApple className="text-[23px] text-white" />} onClick={() => providerUnavailable('Apple')}>Continue with Apple</ProviderButton>
                </div>

                <div className="my-6 flex items-center gap-3 text-sm text-[#adc8f3]">
                  <span className="h-px flex-1 bg-[#28518c]/70" /><span>Or continue with</span><span className="h-px flex-1 bg-[#28518c]/70" />
                </div>

                <form onSubmit={handleSubmit}>
                  <label className="flex h-[60px] items-center gap-3 rounded-xl border border-[#2456a8] bg-[#06152d]/65 px-4 focus-within:border-[#27baff]">
                    <FiMail className="h-5 w-5 shrink-0 text-[#a9c7f5]" />
                    <input autoFocus type={mode === 'login' ? 'text' : 'email'} value={form.email} onChange={(event) => update('email', event.target.value)} placeholder={mode === 'login' ? 'Email or username' : 'Email address'} className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-[#a9c7f5]/70" />
                  </label>
                  {mode === 'login' && <>
                    <label className="mt-3 flex h-[60px] items-center gap-3 rounded-xl border border-[#2456a8] bg-[#06152d]/65 px-4 focus-within:border-[#27baff]">
                      <FiLock className="h-5 w-5 shrink-0 text-[#a9c7f5]" />
                      <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => update('password', event.target.value)} placeholder="Password" className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-white outline-none placeholder:text-[#a9c7f5]/70" />
                      <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'} className="text-[#a9c7f5]">{showPassword ? <FiEyeOff /> : <FiEye />}</button>
                    </label>
                    <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                      <label className="flex cursor-pointer items-center gap-2 text-[#c3d5f2]"><input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 accent-[#148dfb]" />Remember me</label>
                      <Link to="/forgot-password" className="font-semibold text-[#159eff] hover:text-cyan-300">Forgot password?</Link>
                    </div>
                  </>}
                  {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
                  <button type="submit" disabled={status === 'submitting'} className="mt-7 flex h-[60px] w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-fuchsia-500 text-[16px] font-bold text-white shadow-[0_8px_28px_rgba(38,93,239,.18)] transition hover:brightness-110 disabled:opacity-50">
                    {status === 'submitting' ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Continue'} <FiArrowRight className="h-5 w-5" />
                  </button>
                </form>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setModeAndReset('register')} className="mt-5 inline-flex items-center gap-2 text-sm text-white/65 hover:text-white"><FiX /> Back</button>
                <form onSubmit={handleSubmit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input required value={form.fullName} onChange={(e) => update('fullName', e.target.value)} placeholder="Full name" className="h-12 w-full rounded-xl border border-[#2456a8] bg-[#06152d]/65 px-4 text-sm outline-none focus:border-[#27baff]" />
                  <input required type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="Email address" className="h-12 w-full rounded-xl border border-[#2456a8] bg-[#06152d]/65 px-4 text-sm outline-none focus:border-[#27baff]" />
                  <input required type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Password" className="h-12 w-full rounded-xl border border-[#2456a8] bg-[#06152d]/65 px-4 text-sm outline-none focus:border-[#27baff]" />
                  <input required type="tel" value={form.phone} onChange={(e) => update('phone', e.target.value)} placeholder="Phone number" className="h-12 w-full rounded-xl border border-[#2456a8] bg-[#06152d]/65 px-4 text-sm outline-none focus:border-[#27baff]" />
                  <input required type="date" min={earliestBirthday} max={today} value={form.birthday} onChange={(e) => update('birthday', e.target.value)} className="h-12 w-full rounded-xl border border-[#2456a8] bg-[#06152d]/65 px-4 text-sm outline-none focus:border-[#27baff]" />
                  <select required value={form.gender} onChange={(e) => update('gender', e.target.value)} className="h-12 w-full rounded-xl border border-[#2456a8] bg-[#06152d] px-4 text-sm outline-none focus:border-[#27baff]"><option value="">Gender</option><option value="MALE">Male</option><option value="FEMALE">Female</option></select>
                  <select required value={form.country} onChange={(e) => update('country', e.target.value)} className="h-12 w-full rounded-xl border border-[#2456a8] bg-[#06152d] px-4 text-sm outline-none focus:border-[#27baff]"><option value="">Country</option><option value="KENYA">Kenya</option><option value="UGANDA">Uganda</option><option value="TANZANIA">Tanzania</option><option value="RWANDA">Rwanda</option><option value="BURUNDI">Burundi</option><option value="SOMALIA">Somalia</option></select>
                  <input required value={form.residence} onChange={(e) => update('residence', e.target.value)} placeholder="Residence" className="h-12 w-full rounded-xl border border-[#2456a8] bg-[#06152d]/65 px-4 text-sm outline-none focus:border-[#27baff]" />
                  <input required value={form.campusZone} onChange={(e) => update('campusZone', e.target.value)} placeholder="Campus zone" className="h-12 w-full rounded-xl border border-[#2456a8] bg-[#06152d]/65 px-4 text-sm outline-none focus:border-[#27baff]" />
                  <input required value={form.chapter} onChange={(e) => update('chapter', e.target.value)} placeholder="Chapter" className="h-12 w-full rounded-xl border border-[#2456a8] bg-[#06152d]/65 px-4 text-sm outline-none focus:border-[#27baff]" />
                  <input required value={form.invitedBy} onChange={(e) => update('invitedBy', e.target.value)} placeholder="Invited by" className="h-12 w-full rounded-xl border border-[#2456a8] bg-[#06152d]/65 px-4 text-sm outline-none focus:border-[#27baff] sm:col-span-2" />
                  {error && <p className="text-sm text-red-300 sm:col-span-2">{error}</p>}
                  <button disabled={status === 'submitting'} className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-fuchsia-500 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2">{status === 'submitting' ? 'Creating…' : 'Create account'} <FiArrowRight /></button>
                </form>
              </>
            )}

            <p className="mt-6 text-center text-sm text-[#adc8f3]">
              {mode === 'login' ? "Don’t have an account? " : 'Already have an account? '}
              <button type="button" className="font-semibold text-[#159eff] hover:text-cyan-300" onClick={() => setModeAndReset(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create one' : 'Sign in'}</button>
            </p>
          </div>
        </section>
      </div>


      <Toast toast={toast} onClose={() => setToast(null)} />
    </main>
  );
}
