import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { FiMail, FiPhone, FiMapPin, FiSend, FiHeart, FiChevronDown } from 'react-icons/fi';
import { apiFetch } from '../config/api';

const tabs = ['Contact', 'Prayer Requests', 'Find a Campus Group'];

const mapUrl = (location) => {
  const delta = 0.018;
  const left = Number(location.longitude) - delta;
  const right = Number(location.longitude) + delta;
  const top = Number(location.latitude) + delta;
  const bottom = Number(location.latitude) - delta;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${left}%2C${bottom}%2C${right}%2C${top}&layer=mapnik&marker=${location.latitude}%2C${location.longitude}`;
};

const locationSubtitle = (location) => [location.university, location.area || location.town || location.city, location.country].filter(Boolean).join(' • ');

export default function Connect() {
  const [activeTab, setActiveTab] = useState('Contact');
  const [campusSearch, setCampusSearch] = useState('');
  const [selectedCampus, setSelectedCampus] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    if (activeTab !== 'Find a Campus Group') return;
    let cancelled = false;
    setLoadingLocations(true);
    setLocationError('');
    apiFetch('/api/fellowships')
      .then(async (response) => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || 'Unable to load fellowship locations.');
        if (!cancelled) setLocations(Array.isArray(body.fellowships) ? body.fellowships : []);
      })
      .catch((error) => {
        if (!cancelled) setLocationError(error.message || 'Unable to load fellowship locations.');
      })
      .finally(() => {
        if (!cancelled) setLoadingLocations(false);
      });
    return () => { cancelled = true; };
  }, [activeTab]);

  const campusSuggestions = useMemo(() => {
    const query = campusSearch.trim().toLowerCase();
    if (!query) return locations.slice(0, 8);
    return locations
      .filter((location) => [location.fellowshipName, location.country, location.city, location.town, location.area, location.university, location.address]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(query))
      .slice(0, 8);
  }, [campusSearch, locations]);

  const chooseCampus = (location) => {
    setCampusSearch(location.fellowshipName);
    setSelectedCampus(location);
  };

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
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D8B2FF]">Fellowship Locations</p>
              <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">Find a fellowship near you.</h2>
              <p className="mt-4 text-lg text-slate-400">Search by country, city, town, area, university, or fellowship name.</p>

              <div className="relative mt-6 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-900/60 px-4 focus-within:border-[#A53DFF]">
                  <input
                    value={campusSearch}
                    onChange={(event) => { setCampusSearch(event.target.value); setSelectedCampus(null); }}
                    className="w-full bg-transparent py-3 text-sm outline-none"
                    placeholder="Search Nairobi, Thika, Juja, Ruiru, JKUAT..."
                    autoComplete="off"
                  />
                  <FiChevronDown className="h-4 w-4 shrink-0 text-white/40" />
                </div>

                {loadingLocations && <p className="mt-3 px-2 text-xs text-white/35">Loading fellowship locations...</p>}
                {locationError && <p className="mt-3 px-2 text-xs text-red-300">{locationError}</p>}

                {campusSuggestions.length > 0 && (
                  <div className="absolute left-4 right-4 top-[calc(100%+8px)] z-20 max-h-80 overflow-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
                    {campusSuggestions.map((location) => (
                      <button key={location.id} type="button" onClick={() => chooseCampus(location)} className="flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white/5">
                        <FiMapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#D8B2FF]" />
                        <span>
                          <span className="block text-sm font-semibold text-white">{location.fellowshipName}</span>
                          <span className="mt-0.5 block text-xs text-slate-400">{locationSubtitle(location)}</span>
                          {location.address && <span className="mt-0.5 block text-xs text-white/25">{location.address}</span>}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedCampus && selectedCampus.latitude != null && selectedCampus.longitude != null && (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-slate-900/50">
                    <div className="flex items-start justify-between gap-4 px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{selectedCampus.fellowshipName}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{locationSubtitle(selectedCampus)}</p>
                        {selectedCampus.description && <p className="mt-2 text-xs leading-relaxed text-white/40">{selectedCampus.description}</p>}
                      </div>
                      <FiMapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#D8B2FF]" />
                    </div>
                    <iframe title={`Map of ${selectedCampus.fellowshipName}`} src={mapUrl(selectedCampus)} className="h-52 w-full border-0" loading="lazy" />
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>

        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-[#A53DFF]/10 to-[#8A2BE2]/10 p-6">
          <div className="flex items-center gap-2 text-[#D8B2FF]"><FiMapPin /> Fellowship network</div>
          <div className="mt-6 space-y-3">
            {locations.slice(0, 6).map((location) => (
              <button key={location.id} type="button" onClick={() => { setActiveTab('Find a Campus Group'); chooseCampus(location); }} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-left transition hover:bg-white/5">
                <div className="text-base font-semibold text-white">{location.fellowshipName}</div>
                <p className="mt-1 text-sm text-slate-400">{locationSubtitle(location)}</p>
              </button>
            ))}
            {!loadingLocations && locations.length === 0 && <p className="text-sm text-white/30">Fellowship locations will appear here as the administrator adds them.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
