import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiMail, FiPhone, FiMapPin, FiSend, FiHeart } from 'react-icons/fi';

const tabs = ['Contact', 'Prayer Requests', 'Find a Campus Group'];

export default function Connect() {
  const [activeTab, setActiveTab] = useState('Contact');

  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === tab ? 'bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] text-white shadow-[0_18px_40px_rgba(138,43,226,0.18)]' : 'border border-white/10 bg-white/5 text-slate-300'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-soft">
          {activeTab === 'Contact' && (
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D8B2FF]">Contact</p>
              <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">We would love to hear from you.</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-center gap-2 text-[#D8B2FF]"><FiMail /> Email</div><p className="mt-2 text-sm text-slate-400">hello@blwcampusministry.org</p></div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-center gap-2 text-[#D8B2FF]"><FiPhone /> WhatsApp</div><p className="mt-2 text-sm text-slate-400">+254 700 000 000</p></div>
              </div>
              <form className="mt-6 space-y-4">
                <input className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none focus:border-[#A53DFF]" placeholder="Your name" />
                <input className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none focus:border-[#A53DFF]" placeholder="Email address" />
                <textarea className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none focus:border-[#A53DFF]" placeholder="How can we help?" />
                <button className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] px-5 py-3 font-semibold text-white"><FiSend /> Send Message</button>
              </form>
            </div>
          )}
          {activeTab === 'Prayer Requests' && (
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D8B2FF]">Prayer Requests</p>
              <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Bring your burdens before God.</h2>
              <p className="mt-4 text-lg text-slate-400">We are committed to praying with you and standing in faith for every need.</p>
              <textarea className="mt-6 min-h-[160px] w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none focus:border-[#A53DFF]" placeholder="Share your request with our prayer team..." />
              <button className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] px-5 py-3 font-semibold text-white"><FiHeart /> Submit Request</button>
            </div>
          )}
          {activeTab === 'Find a Campus Group' && (
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D8B2FF]">Campus Groups</p>
              <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Find a fellowship near you.</h2>
              <p className="mt-4 text-lg text-slate-400">Search for a campus group by country, city, or university and get connected.</p>
              <div className="mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <input className="w-full rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-3 text-sm outline-none focus:border-[#A53DFF]" placeholder="Search by country or city" />
              </div>
            </div>
          )}
        </motion.div>
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#A53DFF]/10 to-[#8A2BE2]/10 p-6">
          <div className="flex items-center gap-2 text-[#D8B2FF]"><FiMapPin /> Connect globally</div>
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"><div className="text-lg font-semibold text-white">Kenya</div><p className="mt-1 text-sm text-slate-400">Nairobi, Eldoret, Kisumu</p></div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"><div className="text-lg font-semibold text-white">Uganda</div><p className="mt-1 text-sm text-slate-400">Kampala, Jinja, Mbale</p></div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"><div className="text-lg font-semibold text-white">Rwanda</div><p className="mt-1 text-sm text-slate-400">Kigali, Huye, Musanze</p></div>
          </div>
        </div>
      </div>
    </section>
  );
}
