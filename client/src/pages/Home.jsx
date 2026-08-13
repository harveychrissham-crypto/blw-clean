import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiHeart, FiUsers, FiBookOpen, FiGlobe, FiArrowRight, FiDownload, FiMapPin } from 'react-icons/fi';
import { MdQrCodeScanner } from 'react-icons/md';
import { Card, Eyebrow } from '../components/ui/Card';

// Deployment sync marker: keeps the connected Cloudflare build pipeline in sync with main.
const ANDROID_APK_URL =
  'https://github.com/harveychrissham-crypto/blw-clean/releases/latest/download/blw-campus-ministry.apk';

const features = [
  {
    icon: FiUsers,
    label: 'CAMPUS FELLOWSHIP',
    title: 'Campus Fellowship',
    desc: 'Join a local community of believers, discipleship circles, and impactful student programs.',
    to: '/connect',
  },
  {
    icon: FiBookOpen,
    label: 'SERMONS',
    title: 'Sermons',
    desc: 'Access sermons and teaching resources for daily spiritual growth.',
    to: '/sermons',
  },
  {
    icon: FiHeart,
    label: 'OUTREACH & IMPACT',
    title: 'Outreach & Impact',
    desc: 'Participate in national and regional outreaches that serve communities and share hope.',
    to: '/outreaches',
  },
];

export default function Home() {
  return (
    <section>
      <div
        className="relative overflow-hidden"
        style={{
          backgroundImage: "url('/illustration.png')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(13,12,24,0.72) 0%, rgba(13,12,24,0.88) 100%)' }} />

        <div className="relative mx-auto max-w-6xl px-5 py-28 sm:py-36">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest" style={{ color: '#F2A31C' }}>
              <FiGlobe className="h-3.5 w-3.5" /> Fellowship Without Borders
            </div>

            <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl lg:text-5xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Raising a generation of believers rooted in the Word, prayer, and soul-winning impact.
            </h1>

            <p className="mt-5 max-w-2xl text-base text-white/60 sm:text-lg">
              Believers' LoveWorld Campus Ministry Kenya Zone — advancing the Gospel of Jesus Christ, equipping leaders, and serving the vision of Pastor Chris Oyakhilome.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth" className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-bold text-white transition hover:opacity-90" style={{ background: 'linear-gradient(135deg,#EC2FA8 0%,#8A2BE2 55%,#3D5AFE 100%)', boxShadow: '0 12px 36px rgba(236,47,168,0.28)' }}>
                Register Now <FiArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/connect" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                Find a Fellowship Near You <FiMapPin className="h-4 w-4" />
              </Link>
              <Link to="/checkin" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10">
                Check In <MdQrCodeScanner className="h-4 w-4" />
              </Link>
              <a href={ANDROID_APK_URL} download className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/10" aria-label="Download the latest Android app">
                Download App <FiDownload className="h-4 w-4" />
              </a>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-4 sm:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <Card
                key={f.title}
                as={Link}
                to={f.to}
                variant="raised"
                className="group block p-6 transition-all duration-200 hover:-translate-y-1 hover:border-white/15 focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                aria-label={`Open ${f.title}`}
              >
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i, duration: 0.5 }}>
                  <div className="mb-4 inline-flex rounded-xl p-3" style={{ background: 'linear-gradient(135deg,rgba(236,47,168,0.18),rgba(138,43,226,0.18))' }}>
                    <Icon className="h-5 w-5" style={{ color: '#EC2FA8' }} />
                  </div>
                  <Eyebrow className="mb-2">{f.label}</Eyebrow>
                  <h3 className="text-base font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>{f.title}</h3>
                  <p className="mt-2 text-sm text-white/50 leading-relaxed">{f.desc}</p>
                </motion.div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
