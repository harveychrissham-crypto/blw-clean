import { motion } from 'framer-motion';
import { FiDownload, FiBookOpen, FiHeart, FiBarChart2 } from 'react-icons/fi';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' };

export default function Rhapsody() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-8" style={card}>
          <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: '#F2A31C' }}>Sermons</p>
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>Current Edition: Hope in the Waiting</h2>
          <p className="mt-4 text-sm text-white/55 leading-relaxed">A publication designed to encourage and strengthen believers with devotional insights, stories, and practical guidance.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a href="#" className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold text-white transition hover:opacity-90" style={{ background: 'linear-gradient(135deg,#EC2FA8,#8A2BE2)' }}>
              <FiDownload /> Download
            </a>
            <a href="#" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white/10">
              <FiBookOpen /> Read Online
            </a>
          </div>
        </motion.div>
        <div className="space-y-4">
          <div className="rounded-2xl p-6" style={card}>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: '#F2A31C' }}>
              <FiHeart /> Sponsor Copies
            </div>
            <p className="mt-2 text-sm text-white/50">Partner with us to distribute Rhapsody across campuses and communities.</p>
          </div>
          <div className="rounded-2xl p-6" style={card}>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: '#F2A31C' }}>
              <FiBarChart2 /> Distribution Stats
            </div>
            <div className="mt-3 space-y-3 text-sm">
              {[['Copies shared this month','2,400'],['Campus partners','96'],['Countries reached','14']].map(([label,val]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-white/50">{label}</span>
                  <span className="font-bold text-white">{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
