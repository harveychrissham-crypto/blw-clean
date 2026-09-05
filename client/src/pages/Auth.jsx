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
          <div className="h-72 overflow-hidden bg-slate-950/40 lg:h-auto lg:w-1/2"><img src="/illustration.png" alt="BLW registration illustration" className="h-full w-full object-cover" /></div>
          <div className="flex w-full flex-col justify-center bg-slate-950/90 p-8 sm:p-10 lg:w-1/2">
            <div className="max-w-md">
              {mode === 'login' ? <><p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-300">Welcome back</p><h2 className="mt-3 text-3xl font-semibold text-white">Sign In</h2><p className="mt-3 text-sm text-slate-400">Continue your journey with BLW.</p></> : <><p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-300">New here?</p><h2 className="mt-3 text-3xl font-semibold text-white">Create account</h2><p className="mt-3 text-sm text-slate-400">Register and join the family — it's free.</p></>}

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
      <Toast toast={toast} onClose={() => setToast(null)} />
    </section>
  );
}
