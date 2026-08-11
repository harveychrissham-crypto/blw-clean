import { motion, AnimatePresence } from 'framer-motion';
import { FiCreditCard, FiCopy, FiDollarSign, FiCheck, FiX } from 'react-icons/fi';
import { useState } from 'react';

const MPESA_PAYBILL = '400200';

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

  const copyText = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
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

      <AnimatePresence>
        {mpesaOpen && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMpesaOpen(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="mpesa-giving-title"
              className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl p-6 shadow-2xl sm:p-8"
              style={{ background: '#101018', border: '1px solid rgba(255,255,255,0.1)' }}
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#F2A31C' }}>M-Pesa Giving</p>
                  <h3 id="mpesa-giving-title" className="mt-2 text-xl font-extrabold text-white sm:text-2xl">Choose what you would like to give towards</h3>
                </div>
                <button type="button" onClick={() => setMpesaOpen(false)} className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white" aria-label="Close M-Pesa details">
                  <FiX size={20} />
                </button>
              </div>

              <div className="mt-6 rounded-xl p-5" style={{ background: 'rgba(242,163,28,0.08)', border: '1px solid rgba(242,163,28,0.25)' }}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-white/50">M-Pesa Paybill</div>
                    <div className="mt-1 text-3xl font-black tracking-wider text-white">{MPESA_PAYBILL}</div>
                  </div>
                  <button type="button" onClick={() => copyText(MPESA_PAYBILL)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/80 transition hover:bg-white/10">
                    {copied === MPESA_PAYBILL ? <FiCheck /> : <FiCopy />}
                    {copied === MPESA_PAYBILL ? 'Copied' : 'Copy Paybill'}
                  </button>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-white/60">Use Paybill <span className="font-bold text-white">{MPESA_PAYBILL}</span>, then enter the account number for the giving category below.</p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {mpesaAccounts.map((item) => (
                  <button key={item.name} type="button" onClick={() => copyText(item.account)} className="rounded-xl p-4 text-left transition hover:bg-white/10" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="text-sm font-semibold text-white">{item.name}</div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="font-mono text-lg font-bold tracking-wide" style={{ color: '#F2A31C' }}>{item.account}</span>
                      <span className="text-white/45">{copied === item.account ? <FiCheck /> : <FiCopy />}</span>
                    </div>
                    <div className="mt-1 text-[11px] text-white/35">Tap to copy account</div>
                  </button>
                ))}
              </div>

              <div className="mt-6 rounded-xl bg-white/[0.03] p-4 text-xs leading-relaxed text-white/45">
                <span className="font-semibold text-white/70">How to give:</span> Open M-Pesa → Lipa na M-Pesa → Pay Bill → enter <span className="font-semibold text-white">{MPESA_PAYBILL}</span> → enter the account number for your chosen category → enter the amount → confirm.
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
