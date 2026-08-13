import { motion, AnimatePresence } from 'framer-motion';
import { FiCreditCard, FiCopy, FiDollarSign, FiCheck, FiX, FiArrowLeft } from 'react-icons/fi';
import { useState } from 'react';
import { Card, Eyebrow } from '../components/ui/Card';

const MPESA_PAYBILL = '400200';
const API_BASE = import.meta.env.VITE_API_URL || '';

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

export default function Give() {
  const [mpesaOpen, setMpesaOpen] = useState(false);
  const [selectedGiving, setSelectedGiving] = useState(null);
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');
  const [copied, setCopied] = useState('');

  const copyText = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {}
  };

  const openMpesa = () => {
    setSelectedGiving(null);
    setPhone('');
    setAmount('');
    setStatus('');
    setMpesaOpen(true);
  };

  const selectGiving = (item) => {
    setSelectedGiving(item);
    setPhone('');
    setAmount('');
    setStatus('');
  };

  const formatPhone = (value) => {
    let digits = value.replace(/\D/g, '');
    if (digits.startsWith('0')) digits = `254${digits.slice(1)}`;
    if (digits.startsWith('7')) digits = `254${digits}`;
    if (digits.startsWith('1')) digits = `254${digits}`;
    return digits.slice(0, 12);
  };

  const sendPrompt = async (event) => {
    event.preventDefault();
    const normalizedPhone = formatPhone(phone);
    const numericAmount = Number(amount);

    if (!/^254(7|1)\d{8}$/.test(normalizedPhone)) {
      setStatus('Enter a valid Kenyan M-Pesa number, e.g. 0712345678.');
      return;
    }
    if (!Number.isFinite(numericAmount) || numericAmount < 1) {
      setStatus('Enter a valid amount.');
      return;
    }

    setStatus('Sending M-Pesa prompt…');
    try {
      const response = await fetch(`${API_BASE}/api/mpesa/stkpush`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: normalizedPhone,
          amount: numericAmount,
          account: selectedGiving.account,
          givingType: selectedGiving.name,
          paybill: MPESA_PAYBILL,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'The M-Pesa prompt could not be sent.');
      setStatus('M-Pesa prompt sent. Check your phone and complete the payment there.');
    } catch (error) {
      setStatus(error.message || 'Unable to send the M-Pesa prompt.');
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card as={motion.div} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} variant="raised" className="p-8">
          <Eyebrow className="mb-3">Give</Eyebrow>
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>Support a kingdom vision with generosity.</h2>
          <p className="mt-4 text-sm text-white/55 leading-relaxed">Your generosity helps fund outreaches, campus programs, pastoral care, and resources that strengthen the church and reach the next generation.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button type="button" onClick={openMpesa} className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90" style={{ background: 'linear-gradient(135deg,#EC2FA8,#8A2BE2)' }}><FiDollarSign /> Give Now</button>
            <button type="button" onClick={openMpesa} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10"><FiCreditCard /> M-Pesa Giving</button>
          </div>
        </Card>

        <Card variant="raised" className="p-6">
          <div className="mb-4 flex items-center gap-2"><FiCreditCard className="text-[#F7C948]" /><Eyebrow>Payment Options</Eyebrow></div>
          <div className="space-y-3">
            {options.map((item) => (
              <Card as="button" key={item.name} type="button" onClick={() => item.name === 'M-Pesa' && openMpesa()} variant="subtle" className="block w-full p-4 text-left transition hover:bg-white/10">
                <div className="text-sm font-semibold text-white">{item.name}</div>
                <div className="mt-0.5 text-xs text-white/40">{item.desc}</div>
              </Card>
            ))}
          </div>
        </Card>
      </div>

      <AnimatePresence>
        {mpesaOpen && (
          <motion.div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMpesaOpen(false)}>
            <motion.div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl p-6 shadow-2xl sm:p-8" style={{ background: '#101018', border: '1px solid rgba(255,255,255,0.1)' }} initial={{ opacity: 0, scale: 0.96, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 20 }} onClick={(event) => event.stopPropagation()}>
              {!selectedGiving ? (
                <>
                  <div className="flex items-start justify-between gap-4"><div><Eyebrow>M-Pesa Giving</Eyebrow><h3 className="mt-2 text-xl font-extrabold text-white sm:text-2xl">Choose what you would like to give towards</h3></div><button type="button" onClick={() => setMpesaOpen(false)} className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"><FiX size={20} /></button></div>
                  <div className="mt-6 rounded-xl p-5" style={{ background: 'rgba(242,163,28,0.08)', border: '1px solid rgba(242,163,28,0.25)' }}><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-widest text-white/50">M-Pesa Paybill</div><div className="mt-1 text-3xl font-black tracking-wider text-white">{MPESA_PAYBILL}</div></div><button type="button" onClick={() => copyText(MPESA_PAYBILL)} className="inline-flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white/80 hover:bg-white/10">{copied === MPESA_PAYBILL ? <FiCheck /> : <FiCopy />}{copied === MPESA_PAYBILL ? 'Copied' : 'Copy Paybill'}</button></div></div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{mpesaAccounts.map((item) => (
                    <Card as="button" key={item.name} type="button" onClick={() => selectGiving(item)} variant="subtle" className="p-4 text-left transition hover:bg-white/10">
                      <div className="text-sm font-semibold text-white">{item.name}</div>
                      <div className="mt-2 flex items-center justify-between"><span className="font-mono text-lg font-bold" style={{ color: '#F2A31C' }}>{item.account}</span><span className="text-xs text-white/40">Select</span></div>
                    </Card>
                  ))}</div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-4"><div><button type="button" onClick={() => setSelectedGiving(null)} className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-white/50 hover:text-white"><FiArrowLeft /> Back</button><Eyebrow>M-Pesa Giving</Eyebrow><h3 className="mt-2 text-2xl font-extrabold text-white">{selectedGiving.name}</h3><p className="mt-1 text-sm text-white/45">Account {selectedGiving.account} · Paybill {MPESA_PAYBILL}</p></div><button type="button" onClick={() => setMpesaOpen(false)} className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"><FiX size={20} /></button></div>
                  <form onSubmit={sendPrompt} className="mt-7 space-y-5">
                    <div><label className="mb-2 block text-sm font-semibold text-white">M-Pesa phone number</label><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="0712 345 678" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white outline-none focus:border-[#F2A31C]" /></div>
                    <div><label className="mb-2 block text-sm font-semibold text-white">Amount (KES)</label><input value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric" type="text" placeholder="Enter amount" className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3.5 text-white outline-none focus:border-[#F2A31C]" /></div>
                    <div className="rounded-xl bg-white/[0.03] p-4 text-sm text-white/55">An M-Pesa STK prompt will be sent to the number above. The prompt will show the payment amount and use Paybill <span className="font-bold text-white">{MPESA_PAYBILL}</span> with account <span className="font-bold text-white">{selectedGiving.account}</span>.</div>
                    {status && <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/70">{status}</div>}
                    <button type="submit" className="w-full rounded-xl px-5 py-3.5 text-sm font-bold text-white transition hover:opacity-90" style={{ background: 'linear-gradient(135deg,#EC2FA8,#8A2BE2)' }}>Send M-Pesa Prompt</button>
                  </form>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
