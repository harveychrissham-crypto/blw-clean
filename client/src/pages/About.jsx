import { motion } from 'framer-motion';

const card = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' };

export default function About() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-8" style={card}>
        <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: '#F2A31C' }}>About Us</p>
        <h2 className="text-2xl font-extrabold text-white sm:text-3xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          A Christ-centered ministry rooted in the Word and shaped by purpose.
        </h2>
        <p className="mt-4 text-sm text-white/55 leading-relaxed">
          Believers' LoveWorld Campus Ministry Kenya Zone is committed to advancing the Gospel of Jesus Christ, equipping leaders, serving the vision of Pastor Chris Oyakhilome, prayer, the teaching of the Word, soul-winning, leadership development, and global evangelism.
        </p>
      </motion.div>
    </section>
  );
}
