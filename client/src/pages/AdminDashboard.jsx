export default function AdminDashboard() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-soft">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#D8B2FF]">Admin Dashboard</p>
        <h2 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">A management layer for members, events, donations, and ministry content.</h2>
        <p className="mt-4 max-w-3xl text-lg text-slate-400">This view is prepared to host analytics, message management, outreach controls, livestream administration, prayer requests, and website content editing.</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-3xl font-semibold text-white">1,248</div><div className="mt-1 text-sm text-slate-400">Members</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-3xl font-semibold text-white">24</div><div className="mt-1 text-sm text-slate-400">Upcoming events</div></div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4"><div className="text-3xl font-semibold text-white">$18.2k</div><div className="mt-1 text-sm text-slate-400">Monthly giving</div></div>
        </div>
      </div>
    </section>
  );
}
