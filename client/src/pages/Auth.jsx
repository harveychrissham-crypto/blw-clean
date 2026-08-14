import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiLogIn, FiUserPlus } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';
import { Card } from '../components/ui/Card';
import { Toast } from '../components/ui/Toast';

const inputClass = 'w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none focus:border-[#A53DFF]';
const sectionLabelClass = 'text-xs font-semibold uppercase tracking-[0.3em] text-white/40';

const AUTH_LOGIN_URL = '/api/auth/login';
const AUTH_REGISTER_URL = '/api/auth/register';

const emptyForm = {
  fullName: '',
  email: '',
  password: '',
  phone: '',
  birthday: '',
  gender: '',
  chapter: '',
  campusZone: '',
  country: '',
  residence: '',
  invitedBy: '',
};

// Formats birthday input as DD/MM/YYYY while the user types.
const formatBirthday = (value) => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

const isValidBirthday = (value) => {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;
  const [day, month, year] = value.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  const now = new Date();
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    year >= 1900 &&
    date <= now
  );
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

  const handleCampusZoneChange = (event) => {
    setForm((prev) => ({ ...prev, campusZone: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setStatus('submitting');
    setError('');

    if (mode === 'login') {
      if (!form.email || !form.password) {
        setError('Email and password are required for sign in.');
        setStatus('error');
        setToast({ type: 'error', message: 'Email and password are required for sign in.' });
        return;
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
          setError(message);
          setStatus('error');
          setToast({ type: 'error', message });
          return;
        }
        await login(body.user, body.token);
        setForm({ ...emptyForm, email: form.email });
        setLastMode('login');
        setStatus('submitted');
        setToast({ type: 'success', message: 'Signed in successfully.' });
        navigate('/dashboard');
      } catch (err) {
        const message = err.message || 'Unable to sign in.';
        setError(message);
        setStatus('error');
        setToast({ type: 'error', message });
      }
      return;
    }

    if (!isValidBirthday(form.birthday)) {
      setError('Please enter a valid birthday in DD/MM/YYYY format.');
      setStatus('error');
      setToast({ type: 'error', message: 'Please enter a valid birthday in DD/MM/YYYY format.' });
      return;
    }

    try {
      const response = await apiFetch(AUTH_REGISTER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          phone: form.phone,
          birthday: form.birthday,
          gender: form.gender,
          chapter: form.chapter,
          campusZone: form.campusZone,
          residence: form.residence,
          country: form.country,
          invitedBy: form.invitedBy,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = body.message || body.error || 'Unable to register.';
        setError(message);
        setStatus('error');
        setToast({ type: 'error', message });
        return;
      }
      await login(body.user, body.token);
      setForm(emptyForm);
      setLastMode('register');
      setStatus('submitted');
      setToast({ type: 'success', message: 'Your account has been created and signed in successfully.' });
      navigate('/dashboard');
    } catch (err) {
      const message = err.message || 'Unable to register.';
      setError(message);
      setStatus('error');
      setToast({ type: 'error', message });
    }
  };

  return (
    <section className="min-h-screen w-full bg-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-20 sm:px-6 lg:px-8">
        <Card variant="raised" className="flex w-full flex-col shadow-soft lg:flex-row">
          <div className="h-72 overflow-hidden bg-slate-950/40 lg:h-auto lg:w-1/2">
            <img src="/illustration.png" alt="BLW registration illustration" className="h-full w-full object-cover" />
          </div>
          <div className="flex w-full flex-col justify-center bg-slate-950/90 p-8 sm:p-10 lg:w-1/2">
            <div className="max-w-md">
              {mode === 'login' ? (
                <>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D8B2FF]">Welcome back</p>
                  <h2 className="mt-3 text-3xl font-semibold text-white">Sign In</h2>
                  <p className="mt-3 text-sm text-slate-400">Continue your journey with BLW.</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D8B2FF]">New here?</p>
                  <h2 className="mt-3 text-3xl font-semibold text-white">Create account</h2>
                  <p className="mt-3 text-sm text-slate-400">Register and join the family — it's free.</p>
                </>
              )}

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                {mode === 'login' && (
                  <>
                    <input className={inputClass} type="email" placeholder="EMAIL ADDRESS" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
                    <input className={inputClass} type="password" placeholder="Password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
                  </>
                )}

                {mode === 'register' && (
                  <>
                    <div className="space-y-3">
                      <p className={sectionLabelClass}>Personal info</p>
                      <input className={inputClass} placeholder="FULL NAME" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} required />
                      <select className={inputClass} value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value })} required>
                        <option value="">SELECT YOUR GENDER *</option><option value="MALE">MALE</option><option value="FEMALE">FEMALE</option>
                      </select>
                      <input
                        className={inputClass}
                        type="text"
                        inputMode="numeric"
                        autoComplete="bday"
                        placeholder="BIRTHDAY (DD/MM/YYYY)"
                        value={form.birthday}
                        onChange={(event) => setForm({ ...form, birthday: formatBirthday(event.target.value) })}
                        pattern="\d{2}/\d{2}/\d{4}"
                        maxLength={10}
                        required
                        aria-label="Birthday, day month year"
                        title="Enter your birthday as DD/MM/YYYY"
                      />
                    </div>

                    <div className="space-y-3 border-t border-white/[0.06] pt-4">
                      <p className={sectionLabelClass}>Contact</p>
                      <input className={inputClass} type="email" placeholder="EMAIL ADDRESS" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
                      <input className={inputClass} type="tel" inputMode="tel" pattern="\d{9,15}" placeholder="PHONE NUMBER *" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} required title="Enter a phone number with only digits." />
                      <input className={inputClass} type="password" placeholder="PASSWORD" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
                    </div>

                    <div className="space-y-3 border-t border-white/[0.06] pt-4">
                      <p className={sectionLabelClass}>Ministry</p>
                      <select className={inputClass} value={form.campusZone} onChange={handleCampusZoneChange} required>
                        <option value="">CAMPUS ZONE *</option><option value="BLW KENYA ZONE A">BLW KENYA ZONE A</option><option value="BLW KENYA ZONE B">BLW KENYA ZONE B</option>
                      </select>
                      <select className={inputClass} value={form.chapter} onChange={(event) => setForm({ ...form, chapter: event.target.value })} required>
                        <option value="">CHAPTER *</option><option value="UON CHAPTER">UON CHAPTER</option><option value="TUK CHAPTER">TUK CHAPTER</option>
                      </select>
                      <input className={inputClass} placeholder="INVITED BY *" value={form.invitedBy} onChange={(event) => setForm({ ...form, invitedBy: event.target.value })} required />
                    </div>

                    <div className="space-y-3 border-t border-white/[0.06] pt-4">
                      <p className={sectionLabelClass}>Address</p>
                      <select className={inputClass} value={form.country} onChange={(event) => setForm({ ...form, country: event.target.value })} required>
                        <option value="">COUNTRY *</option><option value="KENYA">KENYA</option><option value="UGANDA">UGANDA</option><option value="TANZANIA">TANZANIA</option><option value="SOMALIA">SOMALIA</option><option value="RWANDA">RWANDA</option><option value="BURUNDI">BURUNDI</option>
                      </select>
                      <input className={inputClass} placeholder="RESIDENCE *" value={form.residence} onChange={(event) => setForm({ ...form, residence: event.target.value })} required />
                    </div>
                  </>
                )}

                <button type="submit" className="inline-flex w-full justify-center rounded-full bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] px-5 py-3 font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Submitting…' : mode === 'register' ? 'Create Account' : 'Sign In'}
                </button>
              </form>

              {mode === 'login' && (
                <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
                  <button type="button" className="text-[#D8B2FF] hover:text-[#EC9EFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">Forgot password?</button>
                  <button type="button" className="text-[#D8B2FF] hover:text-[#EC9EFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" onClick={() => setMode('register')}>Don’t have an account? Register</button>
                </div>
              )}
              {mode === 'register' && (
                <div className="mt-4 flex items-center justify-center text-sm text-slate-400"><span>Already have an account?</span><button type="button" className="ml-2 text-[#D8B2FF] hover:text-[#EC9EFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" onClick={() => setMode('login')}>Sign in</button></div>
              )}
              {status === 'submitted' && (
                <div className="mt-6 rounded-2xl border border-[#A53DFF]/30 bg-[#A53DFF]/10 p-4 text-sm text-[#D8B2FF]">{lastMode === 'login' ? 'Signed in successfully.' : 'Your account has been created and signed in successfully.'}</div>
              )}
              {status === 'error' && error && (
                <div className="mt-6 rounded-2xl border border-[#A53DFF]/30 bg-[#A53DFF]/10 p-4 text-sm text-[#D8B2FF]">{error}</div>
              )}
            </div>
          </div>
        </Card>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </section>
  );
}
