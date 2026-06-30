import { motion } from 'framer-motion';
import { FiRadio, FiClock, FiPlayCircle, FiCalendar } from 'react-icons/fi';

const schedule = [
  { day: 'Sunday', time: '10:00 AM', title: 'Main Worship Service' },
  { day: 'Wednesday', time: '7:30 PM', title: 'Midweek Prayer & Fellowship' },
  { day: 'Friday', time: '6:00 PM', title: 'Campus Connect Live' }
];

export default function Live() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-soft">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#A53DFF]/20 px-3 py-1 text-sm font-semibold text-[#D8B2FF]"><FiRadio /> Live Now</span>
          <span className="text-sm text-slate-400">Streaming across YouTube & Facebook</span>
        </div>
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-800 to-slate-950 p-6">
            <div className="aspect-video rounded-2xl border border-white/10 bg-slate-950/70 p-6">
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[#A53DFF]/30 bg-[#A53DFF]/10 text-center">
                <div>
                  <FiPlayCircle className="mx-auto text-5xl text-[#D8B2FF]" />
                  <p className="mt-3 text-lg font-semibold">YouTube & Facebook embed coming soon</p>
                  <p className="mt-2 text-sm text-slate-400">The page is ready for live integrations and countdown controls.</p>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400"><FiClock /> Next service</div>
              <div className="mt-4 text-4xl font-semibold text-white">00:14:32</div>
              <p className="mt-2 text-sm text-slate-400">Countdown to the next broadcast</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400"><FiCalendar /> Service schedule</div>
              <div className="mt-4 space-y-3">
                {schedule.map((item) => (
                  <div key={item.day} className="rounded-2xl border border-white/10 bg-slate-950/50 p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-white">{item.day}</span>
                      <span className="text-slate-400">{item.time}</span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{item.title}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}
