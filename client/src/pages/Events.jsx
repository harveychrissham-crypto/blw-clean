import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiCalendar, FiChevronLeft, FiChevronRight, FiClock, FiMapPin, FiArrowRight } from 'react-icons/fi';
import { fetchEvents } from '../utils/events';
import { Card, Eyebrow } from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import { SkeletonCard } from '../components/ui/Skeleton';

const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function buildCalendarGrid(year, month) {
  // month is 0-indexed
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const cells = [];
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: daysInPrevMonth - i, current: false });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, current: true });
  while (cells.length % 7 !== 0) cells.push({ day: cells.length, current: false });
  return cells;
}

export default function Events() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchEvents();
      setEvents(data);
    } catch (err) {
      setError(err.message || 'Unable to load events.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const calendarDays = buildCalendarGrid(viewYear, viewMonth);
  const pad = (n) => String(n).padStart(2, '0');
  const monthPrefix = `${viewYear}-${pad(viewMonth + 1)}-`;

  const eventsByDay = {};
  events.forEach((e) => {
    if (e.date?.startsWith(monthPrefix)) {
      const d = parseInt(e.date.slice(8, 10), 10);
      (eventsByDay[d] ||= []).push(e);
    }
  });

  const selectedDateStr = `${monthPrefix}${pad(selectedDay)}`;
  const selectedEvents = events.filter((e) => e.date === selectedDateStr);

  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
  const upcomingEvents = events.filter((e) => e.date >= todayStr && e.date !== selectedDateStr).slice(0, 6);

  const goMonth = (delta) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
    setSelectedDay(1);
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <section className="mx-auto max-w-6xl px-5 py-16">
      <div className="mb-8">
        <Eyebrow className="mb-2">Events</Eyebrow>
        <h2 className="text-2xl font-extrabold text-white sm:text-3xl" style={{ fontFamily: 'Montserrat, sans-serif' }}>Gatherings that build, inspire, and connect.</h2>
      </div>

      {error && (
        <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-5 py-3 text-sm text-red-300">
          <span>{error}</span>
          <button onClick={load} className="shrink-0 rounded-full border border-red-400/30 px-3 py-1 text-xs font-semibold hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">Retry</button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Calendar */}
        <Card variant="raised" className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>{monthNames[viewMonth]} {viewYear}</span>
            <div className="flex gap-1">
              <button onClick={() => goMonth(-1)} className="rounded-lg p-1.5 text-white/40 hover:text-white hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"><FiChevronLeft /></button>
              <button onClick={() => goMonth(1)} className="rounded-lg p-1.5 text-white/40 hover:text-white hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"><FiChevronRight /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center">
            {weekDays.map(d => (
              <div key={d} className="py-1 text-[0.65rem] font-bold uppercase tracking-wider text-white/30">{d}</div>
            ))}
            {calendarDays.map((cell, i) => {
              const isSelected = cell.current && cell.day === selectedDay;
              const hasEvent = cell.current && eventsByDay[cell.day]?.length > 0;
              return (
                <button
                  key={i}
                  onClick={() => cell.current && setSelectedDay(cell.day)}
                  className={`relative rounded-lg py-2 text-xs font-medium transition ${
                    isSelected ? 'text-white' : cell.current ? 'text-white/60 hover:text-white hover:bg-white/5' : 'text-white/20 cursor-default'
                  } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40`}
                  style={isSelected ? { background: 'linear-gradient(135deg,#EC2FA8,#8A2BE2)' } : {}}
                >
                  {cell.day}
                  {hasEvent && !isSelected && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full" style={{ background: '#EC2FA8' }} />}
                </button>
              );
            })}
          </div>
        </Card>

        {/* Event details + upcoming */}
        <div className="space-y-4">
          {loading && (
            <div className="space-y-4">
              <SkeletonCard lines={2} />
              <SkeletonCard lines={2} />
            </div>
          )}

          {!loading && selectedEvents.length === 0 && (
            <EmptyState icon={FiCalendar} title="No events scheduled" hint={`Nothing on the calendar for ${monthNames[viewMonth]} ${selectedDay} yet.`} />
          )}

          {selectedEvents.map((event) => (
            <Card key={event.id} as={motion.div} initial={{ opacity: 0 }} animate={{ opacity: 1 }} variant="raised" className="p-6">
              <Eyebrow className="mb-2">{event.category}</Eyebrow>
              <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'Montserrat, sans-serif' }}>{event.title}</h3>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/45">
                {event.time && <span className="flex items-center gap-1.5"><FiClock className="h-3 w-3" />{event.time}</span>}
                {event.location && <span className="flex items-center gap-1.5"><FiMapPin className="h-3 w-3" />{event.location}</span>}
              </div>
              {event.description && <p className="mt-3 text-sm text-white/50">{event.description}</p>}
            </Card>
          ))}

          {upcomingEvents.length > 0 && (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-white/30 pt-2">Upcoming</p>
              {upcomingEvents.map((event, i) => (
                <Card key={event.id} as={motion.div} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }} variant="subtle" className="flex items-center justify-between px-5 py-4">
                  <div>
                    <Eyebrow className="mb-0.5">{event.category}</Eyebrow>
                    <h4 className="text-sm font-bold text-white">{event.title}</h4>
                    <div className="mt-1 flex gap-3 text-xs text-white/40">
                      <span className="flex items-center gap-1"><FiCalendar className="h-3 w-3" />{formatDate(event.date)}</span>
                      {event.location && <span className="flex items-center gap-1"><FiMapPin className="h-3 w-3" />{event.location}</span>}
                    </div>
                  </div>
                  <FiArrowRight className="h-4 w-4 shrink-0 text-white/25" />
                </Card>
              ))}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
