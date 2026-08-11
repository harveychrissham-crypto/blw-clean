import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const emptyForm = { fullName:'', email:'', password:'', phone:'', birthday:'', gender:'', chapter:'', campusZone:'', country:'', residence:'', invitedBy:'' };

export default function Auth() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState(emptyForm);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const update = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault(); setStatus('submitting'); setError('');
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        navigate('/dashboard');
      } else {
        const result = await register(form);
        if (result.requiresEmailConfirmation) {
          setStatus('confirmation');
          return;
        }
        navigate('/dashboard');
      }
      setStatus('submitted');
    } catch (err) {
      setError(err.message || 'Authentication failed.'); setStatus('error');
    }
  };

  return <section className="min-h-screen w-full bg-slate-950"><div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-20 sm:px-6 lg:px-8"><div className="flex w-full flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-soft lg:flex-row"><div className="h-72 overflow-hidden bg-slate-950/40 lg:h-auto lg:w-1/2"><img src="/illustration.png" alt="BLW registration illustration" className="h-full w-full object-cover" /></div><div className="flex w-full flex-col justify-center bg-slate-950/90 p-8 sm:p-10 lg:w-1/2"><div className="max-w-md"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#D8B2FF]">{mode==='login'?'Welcome back':'New here?'}</p><h2 className="mt-3 text-3xl font-semibold text-white">{mode==='login'?'Sign In':'Create account'}</h2><p className="mt-3 text-sm text-slate-400">{mode==='login'?'Continue your journey with BLW.':'Register and join the family — it’s free.'}</p><form onSubmit={handleSubmit} className="mt-8 space-y-4">{mode==='register'&&<><input className="input" placeholder="FULL NAME" value={form.fullName} onChange={update('fullName')} required/><input className="input" type="tel" placeholder="PHONE NUMBER *" value={form.phone} onChange={update('phone')} required/></>}<input className="input" type="email" placeholder="EMAIL ADDRESS" value={form.email} onChange={update('email')} required/><input className="input" type="password" placeholder="PASSWORD" value={form.password} onChange={update('password')} required/>{mode==='register'&&<><select className="input" value={form.gender} onChange={update('gender')} required><option value="">SELECT YOUR GENDER *</option><option>MALE</option><option>FEMALE</option></select><select className="input" value={form.campusZone} onChange={update('campusZone')} required><option value="">CAMPUS ZONE *</option><option>BLW KENYA ZONE A</option><option>BLW KENYA ZONE B</option></select><select className="input" value={form.chapter} onChange={update('chapter')} required><option value="">CHAPTER *</option><option>UON CHAPTER</option><option>TUK CHAPTER</option></select><select className="input" value={form.country} onChange={update('country')} required><option value="">COUNTRY *</option><option>KENYA</option><option>UGANDA</option><option>TANZANIA</option><option>SOMALIA</option><option>RWANDA</option><option>BURUNDI</option></select><input className="input" placeholder="RESIDENCE *" value={form.residence} onChange={update('residence')} required/><input className="input" placeholder="BIRTHDAY (DD/MM/YYYY)" value={form.birthday} onChange={update('birthday')}/><input className="input" placeholder="INVITED BY *" value={form.invitedBy} onChange={update('invitedBy')} required/></>}<button type="submit" className="inline-flex w-full justify-center rounded-full bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] px-5 py-3 font-semibold text-white" disabled={status==='submitting'}>{status==='submitting'?'Submitting…':mode==='register'?'Create Account':'Sign In'}</button></form>{mode==='login'?<div className="mt-4 text-center text-sm text-slate-400">Don’t have an account? <button type="button" className="text-[#D8B2FF]" onClick={()=>{setMode('register');setError('')}}>Register</button></div>:<div className="mt-4 text-center text-sm text-slate-400">Already have an account? <button type="button" className="text-[#D8B2FF]" onClick={()=>{setMode('login');setError('')}}>Sign in</button></div>}{status==='confirmation'&&<div className="mt-6 rounded-2xl border border-[#A53DFF]/30 bg-[#A53DFF]/10 p-4 text-sm text-[#D8B2FF]">Check your email to confirm your account, then sign in.</div>}{error&&<div className="mt-6 rounded-2xl border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}</div></div></div></div></section>;
}
