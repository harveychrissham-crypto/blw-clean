import { motion } from 'framer-motion';
import { FiHeart, FiBookOpen, FiMail, FiPhone } from 'react-icons/fi';
import { Card, Eyebrow } from '../components/ui/Card';

export default function Salvation() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card as={motion.div} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} variant="raised" className="p-8">
          <Eyebrow className="mb-3">Salvation</Eyebrow>
          <h2 className="text-2xl font-extrabold text-white sm:text-3xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>The gospel of Jesus Christ changes everything.</h2>
          <p className="mt-4 text-sm text-white/55 leading-relaxed">If you are seeking peace, forgiveness, or a new beginning, the prayer below is a simple invitation to receive Christ and begin a life of faith.</p>
          <div className="mt-6 rounded-2xl p-5" style={{ background: 'rgba(236,47,168,0.08)', border: '1px solid rgba(236,47,168,0.18)' }}>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: '#F2A31C' }}>
              <FiHeart /> Prayer of Salvation
            </div>
            <p className="text-sm text-white/70 italic leading-relaxed">"Dear Lord, I believe in my heart that Jesus is the Son of God; that He died for my sins and rose from the dead for my justification. I confess that Jesus is my Lord and my personal Saviour. I am born again! I am a new creation in Christ; old things have passed away, and I have become a brand new person, in Jesus' name. Thank you, Lord, for saving my soul. I am now a child of God. Hallelujah!"</p>
            <p className="mt-3 text-xs text-white/35">— Prayer of Salvation, Rhapsody of Realities by Pastor Chris Oyakhilome</p>
          </div>
        </Card>
        <div className="space-y-4">
          <Card variant="subtle" className="p-6">
            <div className="mb-2 flex items-center gap-2"><FiBookOpen className="text-[#F7C948]" /><Eyebrow>Follow-up Registration</Eyebrow></div>
            <p className="mt-2 text-sm text-white/50">We would love to stay in touch and support your next steps in faith.</p>
          </Card>
          <Card variant="subtle" className="p-6">
            <div className="mb-2 flex items-center gap-2"><FiMail className="text-[#F7C948]" /><Eyebrow>Connect to a Counselor</Eyebrow></div>
            <p className="mt-2 text-sm text-white/50">Reach out for prayer, guidance, or a conversation with a ministry counselor.</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/50">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2"><FiPhone /> +254 700 000 000</span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-2"><FiMail /> hello@blwcampus.org</span>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
