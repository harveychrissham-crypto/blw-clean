import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Toast } from '../components/ui/Toast';
import Button from '../components/ui/Button';
import { apiFetch } from '../config/api';

const inputClass = 'w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-white outline-none focus:border-purple-400';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!token) {
      const message = 'This reset link is missing or invalid.';
      setError(message); setStatus('error'); setToast({ type: 'error', message }); return;
    }
    if (password.length < 8) {
      const message = 'Password must be at least 8 characters.';
      setError(message); setStatus('error'); setToast({ type: 'error', message }); return;
    }
    if (password !== confirm) {
      const message = 'The passwords do not match.';
      setError(message); setStatus('error'); setToast({ type: 'error', message }); return;
    }

    setStatus('submitting');
    try {
      const response = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = body.error || 'This reset link is invalid or expired.';
        setError(message); setStatus('error'); setToast({ type: 'error', message }); return;
      }
      setStatus('submitted');
      setToast({ type: 'success', message: 'Password reset successfully.' });
    } catch (err) {
      const message = err?.message || 'Unable to reset your password right now.';
      setError(message); setStatus('error'); setToast({ type: 'error', message });
    }
  };

  return (
    <section className="min-h-screen w-full bg-slate-950">
      <div className="mx-auto flex min-h-screen w-full max-w-xl items-center px-4 py-20 sm:px-6">
        <Card variant="raised" className="w-full p-8 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-300">Account recovery</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Create a new password</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">Choose a password you haven’t used before. Your reset link can only be used once.</p>

          {status === 'submitted' ? (
            <div className="mt-8 space-y-4">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">Your password has been reset successfully.</div>
              <Button onClick={() => navigate('/auth')} variant="gradient" className="inline-flex w-full justify-center">Back to sign in</Button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-8 space-y-4">
              <input className={inputClass} type="password" autoComplete="new-password" placeholder="NEW PASSWORD" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
              <input className={inputClass} type="password" autoComplete="new-password" placeholder="CONFIRM NEW PASSWORD" value={confirm} onChange={(event) => setConfirm(event.target.value)} required minLength={8} />
              <Button type="submit" variant="gradient" disabled={status === 'submitting' || !token} className="inline-flex w-full justify-center">
                {status === 'submitting' ? 'Resetting…' : 'Reset password'}
              </Button>
            </form>
          )}

          {status === 'error' && error && <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
        </Card>
      </div>
      <Toast toast={toast} onClose={() => setToast(null)} />
    </section>
  );
}
