import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Toast } from '../components/ui/Toast';
import { apiFetch } from '../config/api';

const inputClass = 'w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-[#A53DFF]';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    setStatus('submitting');
    setError('');
    try {
      const response = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = body.error || 'Unable to process the request right now.';
        setError(message);
        setToast({ type: 'error', message });
        setStatus('error');
        return;
      }
      setStatus('submitted');
      setToast({ type: 'success', message: 'Check your email for a password-reset link.' });
    } catch (err) {
      const message = err?.message || 'Unable to process the request right now.';
      setError(message);
      setToast({ type: 'error', message });
      setStatus('error');
    }
  };

  return (
    <section className="min-h-screen w-full bg-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-20 sm:px-6">
        <Card variant="raised" className="w-full p-8 sm:p-10">
          <button type="button" onClick={() => navigate('/auth')} className="text-sm text-slate-400 hover:text-white">← Back to sign in</button>
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.2em] text-[#D8B2FF]">Account recovery</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Forgot your password?</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">Enter the email address associated with your BLW account. We’ll send a secure, one-time reset link if an account exists.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <input className={inputClass} type="email" autoComplete="email" placeholder="EMAIL ADDRESS" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <button type="submit" disabled={status === 'submitting'} className="inline-flex w-full justify-center rounded-full bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] px-5 py-3 font-semibold text-white disabled:opacity-50">
              {status === 'submitting' ? 'Sending…' : 'Send reset link'}
            </button>
          </form>

          {status === 'submitted' && <div className="mt-6 rounded-2xl border border-[#A53DFF]/30 bg-[#A53DFF]/10 p-4 text-sm text-[#D8B2FF]">If an account with that email exists, we’ve sent a reset link. Check your inbox and spam folder.</div>}
          {status === 'error' && error && <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
        </Card>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </section>
  );
}
