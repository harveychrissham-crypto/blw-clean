import { motion } from 'framer-motion';
import { FiCreditCard, FiCopy, FiDollarSign, FiGlobe, FiCheck } from 'react-icons/fi';
import { useState } from 'react';

const mpesaAccounts = [
  { name: 'Offering', account: '1022039' },
  { name: 'Tithe', account: '1022030' },
  { name: 'First Fruits', account: '1022065' },
  { name: 'Rhapsody', account: '1022046' },
  { name: 'Healing School', account: '1022053' },
  { name: 'Campus Ministry', account: '1022033' },
  { name: 'Ministry Programs', account: '1022054' },
  { name: 'InnerCity', account: '1022056' },
  { name: 'Land Project', account: '1022068' },
];

const options = [
  { name: 'M-Pesa', desc: 'Mobile giving in minutes' },
  { name: 'Bank Transfer', desc: 'Direct account support' },
  { name: 'Visa / Mastercard', desc: 'Secure card giving' },
  { name: 'Flutterwave / Stripe / PayPal', desc: 'Global payments' },
];

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' };

export default function Give() {
  const [mpesaOpen, setMpesaOpen] = useState(false);
  const [copied, setCopied] = useState('');

  const copyAccount = async (account) => {
    try {
      await navigator.clipboard.writeText(account);
      setCopied(account);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      // Clipboard access may be unavailable in some browsers/webviews.
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-8" style={card}>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: '#F2A31C' }}>Give</p>
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>Support a kingdom vision with generosity.</h2>
          <p className="mt-4 text-sm text-white/55 leading-relaxed">Your generosity helps fund outreaches, campus programs, pastoral care, and resources that strengthen the church and reach the next generation.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={() => setMpesaOpen(true)} className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90" style={{ background: 'linear-gradient(135deg,#EC2FA8,#8A2BE2)' }}>
              <FiDollarSign /> Give Now
            </button>
            <button type="button" onClick={() => setMpesaOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">
              <FiCreditCard /> M-Pesa Giving
            </button>
          </div>
        </motion.div>

        <div className="rounded-2xl p-6" style={card}>
          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: '#F2A31C' }}>
            <FiCreditCard /> Payment Options
          </div>
          <div className="space-y-3">
            {options.map((item) => (
              <button key={item.name} type="button" onClick={() => item.name === 'M-Pesa' && setMpesaOpen(true)} className="block w-full rounded-xl p-4 text-left transition hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-sm font-semibold text-white">{item.name}</div>
                <div className="mt-0.5 text-xs text-white/40">{item.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {mpesaOpen && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-2xl p-6 sm:p-8" style={card}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#F2A31C' }}>M-Pesa Giving</p>
              <h3 className="mt-2 text-xl font-extrabold text-white">Choose what you would like to give towards</h3>
            </div>
            <button type="button" onClick={() => setMpesaOpen(false)} className="rounded-full px-3 py-1 text-xs text-white/60 hover:bg-white/10">Close</button>
          </div>

          <div className="mt-5 rounded-xl p-5" style={{ background: 'rgba(242,163,28,0.08)', border: '1px solid rgba(242,163,28,0.2)' }}>
            <div className="text-xs font-bold uppercase tracking-widest text-white/50">M-Pesa Paybill</div>
            <div className="mt-2 text-sm text-white/70">Paybill details will appear here once the official Paybill number is configured.</div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mpesaAccounts.map((item) => (
              <div key={item.name} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-sm font-semibold text-white">{item.name}</div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="font-mono text-lg font-bold tracking-wide" style={{ color: '#F2A31C' }}>{item.account}</span>
                  <button type="button" onClick={() => copyAccount(item.account)} className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-white/70 hover:bg-white/10" aria-label={`Copy ${item.name} account number`}>
                    {copied === item.account ? <FiCheck /> : <FiCopy />}
                    {copied === item.account ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-5 text-xs leading-relaxed text-white/40">Select the giving category, use its account number with the official M-Pesa Paybill, and confirm the transaction on your phone. An automatic M-Pesa STK prompt requires the site's Daraja credentials and a phone number, so this page does not pretend to send a prompt until that backend is configured.</p>
        </motion.div>
      )}
    </section>
  );
}
