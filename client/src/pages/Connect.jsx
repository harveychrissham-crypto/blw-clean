import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FiMail, FiPhone, FiMapPin, FiSend, FiHeart, FiChevronDown } from 'react-icons/fi';
import { apiFetch } from '../config/api';

const tabs = ['Contact', 'Prayer Requests', 'Find a Campus Group'];
const mapUrl = (location) => {
  const delta = 0.02;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${location.longitude-delta}%2C${location.latitude-delta}%2C${location.longitude+delta}%2C${location.latitude+delta}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`;
};

export default function Connect() {
  const [activeTab, setActiveTab] = useState('Contact');
  const [campusSearch, setCampusSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = campusSearch.trim();
    if (!query || query.length < 2 || selectedCampus) { setSuggestions([]); return; }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await apiFetch(`/api/fellowships?q=${encodeURIComponent(query)}`);
        const body = await response.json().catch(() => ({}));
        setSuggestions(Array.isArray(body.fellowships) ? body.fellowships.slice(0, 8) : []);
      } catch { setSuggestions([]); }
      finally { setLoading(false); }
    }, 220);
    return () => clearTimeout(timer);
  }, [campusSearch, selectedCampus]);

  const chooseCampus = (location) => { setCampusSearch(location.fellowshipName || location.town || location.city || ''); setSelectedCampus(location); setSuggestions([]); };

  return <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
    <div className="mb-8 flex flex-wrap gap-3">{tabs.map(tab => <button key={tab} onClick={()=>setActiveTab(tab)} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab===tab?'bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] text-white':'border border-white/10 bg-white/5 text-slate-300'}`}>{tab}</button>)}</div>
    <div className="grid gap-8 lg:grid-cols-[1fr_0.9fr]">
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-soft">
        {activeTab==='Contact' && <div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D8B2FF]">Contact</p><h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">We would love to hear from you.</h2><div className="mt-6 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-center gap-2 text-[#D8B2FF]"><FiMail/> Email</div><p className="mt-2 text-sm text-slate-400">hello@blwcampusministry.org</p></div><div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="flex items-center gap-2 text-[#D8B2FF]"><FiPhone/> WhatsApp</div><p className="mt-2 text-sm text-slate-400">+254 700 000 000</p></div></div><form className="mt-6 space-y-4"><input className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none" placeholder="Your name"/><input className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none" placeholder="Email address"/><textarea className="min-h-[140px] w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none" placeholder="How can we help?"/><button className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] px-5 py-3 font-semibold text-white"><FiSend/> Send Message</button></form></div>}
        {activeTab==='Prayer Requests' && <div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D8B2FF]">Prayer Requests</p><h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Bring your burdens before God.</h2><p className="mt-4 text-lg text-slate-400">We are committed to praying with you and standing in faith for every need.</p><textarea className="mt-6 min-h-[160px] w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm outline-none" placeholder="Share your request with our prayer team..."/><button className="mt-4 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] px-5 py-3 font-semibold text-white"><FiHeart/> Submit Request</button></div>}
        {activeTab==='Find a Campus Group' && <div><p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D8B2FF]">Campus Groups</p><h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Find a fellowship near you.</h2><p className="mt-4 text-lg text-slate-400">Search by city, town, area, university or fellowship name.</p><div className="relative mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4"><div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/60 px-4 focus-within:border-[#A53DFF]"><input value={campusSearch} onChange={e=>{setCampusSearch(e.target.value);setSelectedCampus(null);}} className="w-full bg-transparent py-3 text-sm text-white outline-none" placeholder="Search e.g. Thika, Juja, Ruiru, JKUAT" autoComplete="off"/><FiChevronDown className="h-4 w-4 shrink-0 text-white/40"/></div>{(suggestions.length>0||loading)&&<div className="absolute left-4 right-4 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">{loading?<div className="px-4 py-3 text-sm text-white/40">Searching...</div>:suggestions.map(location=><button key={location.id} type="button" onClick={()=>chooseCampus(location)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/5"><FiMapPin className="h-4 w-4 shrink-0 text-[#D8B2FF]"/><span><span className="block text-sm font-semibold text-white">{location.fellowshipName}</span><span className="block text-xs text-slate-400">{[location.university,location.town||location.city,location.area,location.country].filter(Boolean).join(' · ')}</span></span></button>)}</div>}{selectedCampus&&<div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50"><div className="flex items-center justify-between px-4 py-3"><div><p className="text-sm font-semibold text-white">{selectedCampus.fellowshipName}</p><p className="mt-0.5 text-xs text-slate-400">{[selectedCampus.address,selectedCampus.town||selectedCampus.city,selectedCampus.area].filter(Boolean).join(' · ')}</p></div><FiMapPin className="h-4 w-4 text-[#D8B2FF]"/></div><iframe title={`Map of ${selectedCampus.fellowshipName}`} src={mapUrl(selectedCampus)} className="h-48 w-full border-0" loading="lazy"/></div>}</div></div>}
      </motion.div>
      <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#A53DFF]/10 to-[#8A2BE2]/10 p-6"><div className="flex items-center gap-2 text-[#D8B2FF]"><FiMapPin/> Connect globally</div><p className="mt-4 text-sm leading-relaxed text-slate-400">Fellowships can be placed anywhere — cities, towns, neighbourhoods and university campuses — and managed by authorised leaders.</p></div>
    </div>
  </section>;
}