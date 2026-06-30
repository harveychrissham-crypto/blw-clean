import { motion } from 'framer-motion';
import { FiCreditCard, FiDollarSign, FiGlobe, FiHeart } from 'react-icons/fi';

const options = [
  { name: 'M-Pesa', desc: 'Mobile giving in minutes' },
  { name: 'Bank Transfer', desc: 'Direct account support' },
  { name: 'Visa / Mastercard', desc: 'Secure card giving' },
  { name: 'Flutterwave / Stripe / PayPal', desc: 'Global payments' },
];

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' };

export default function Give() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-8" style={card}>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: '#F2A31C' }}>Give</p>
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>Support a kingdom vision with generosity.</h2>
          <p className="mt-4 text-sm text-white/55 leading-relaxed">Your generosity helps fund outreaches, campus programs, pastoral care, and resources that strengthen the church and reach the next generation.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90" style={{ background: 'linear-gradient(135deg,#EC2FA8,#8A2BE2)' }}>
              <FiDollarSign /> Give Now
            </a>
            <a href="#" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">
              <FiGlobe /> Giving History
            </a>
          </div>
        </motion.div>
        <div className="rounded-2xl p-6" style={card}>
          <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: '#F2A31C' }}>
            <FiCreditCard /> Payment Options
          </div>
          <div className="space-y-3">
            {options.map((item) => (
              <div key={item.name} className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-sm font-semibold text-white">{item.name}</div>
                <div className="mt-0.5 text-xs text-white/40">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
