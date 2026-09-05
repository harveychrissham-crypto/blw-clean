import { useEffect, useMemo, useState } from 'react';
import { FiClock, FiMapPin } from 'react-icons/fi';
import { useSearchParams } from 'react-router-dom';
import { fetchVenues } from '../utils/venues';
import { Card, Eyebrow } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';

export default function ServiceVenues() {
  const [searchParams] = useSearchParams();
  const targetChapter = searchParams.get('chapter') || '';
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchVenues().then((data) => {
      if (!cancelled) setVenues(Array.isArray(data) ? data : []);
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  const ordered = useMemo(() => {
    if (!targetChapter) return venues;
    return [...venues].sort((a, b) => {
      const aMatch = a.chapter === targetChapter;
      const bMatch = b.chapter === targetChapter;
      return Number(bMatch) - Number(aMatch);
    });
  }, [venues, targetChapter]);

  return (
    <section className="mx-auto max-w-5xl px-5 py-12 sm:py-16">
      <Eyebrow>Service Venues</Eyebrow>
      <h1 className="mt-2 text-3xl font-extrabold text-white sm:text-4xl">Find your fellowship venue.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/50">View current campus fellowship venues and service times across the zone.</p>

      {loading ? (
        <p className="mt-8 text-sm text-white/50">Loading venues…</p>
      ) : !ordered.length ? (
        <div className="mt-8"><EmptyState icon={FiMapPin} title="No service venues yet" hint="Venue information will appear here once it is published." /></div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {ordered.map((venue) => {
            const highlighted = venue.chapter === targetChapter;
            return (
              <Card key={venue.chapter} variant="raised" className={`p-5 transition ${highlighted ? 'ring-2 ring-gold-500/60' : ''}`}>
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-purple-300"><FiMapPin /></div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-white/50">{venue.chapter}</p>
                    <h2 className="mt-1 text-lg font-bold text-white">{venue.venue || 'Service venue'}</h2>
                    {venue.serviceTime && <p className="mt-2 flex items-center gap-2 text-sm text-white/50"><FiClock className="h-3.5 w-3.5" />{venue.serviceTime}</p>}
                  </div>
                </div>
                {highlighted && <p className="mt-4 rounded-xl bg-gold-500/10 px-3 py-2 text-xs font-semibold text-gold-500">This is the venue from your notification.</p>}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
