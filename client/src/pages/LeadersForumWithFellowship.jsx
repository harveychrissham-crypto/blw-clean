import { useState } from 'react';
import { FiMapPin, FiX, FiChevronRight } from 'react-icons/fi';
import LeadersForum from './LeadersForum';
import FellowshipLocationsAdmin from './FellowshipLocationsAdmin';

export default function LeadersForumWithFellowship() {
  const [showManager, setShowManager] = useState(false);

  return (
    <>
      <section className="border-b border-white/10 bg-slate-950/95 px-4 py-5 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 rounded-2xl border border-[#8A2BE2]/30 bg-gradient-to-r from-[#8A2BE2]/15 via-[#EC2FA8]/10 to-[#3D5AFE]/10 p-4 shadow-xl sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#8A2BE2]/20 text-[#D8B2FF]">
              <FiMapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#F2A31C]">Leader Tool</p>
              <h2 className="mt-1 text-lg font-bold text-white">Manage Fellowship Locations</h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/50 sm:text-sm">
                Place fellowship pins on the map, drag them to the exact meeting point, and save the fellowship details. Coordinates are captured automatically.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowManager(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] px-5 py-3 text-sm font-bold text-white shadow-lg transition hover:scale-[1.01]"
          >
            <FiMapPin className="h-4 w-4" />
            Open Fellowship Manager
            <FiChevronRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <LeadersForum />

      {showManager && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-[#0d0c18]/95 backdrop-blur-sm">
          <div className="min-h-screen py-4 sm:py-8">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowManager(false)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"
                >
                  <FiX /> Close Fellowship Manager
                </button>
              </div>
              <FellowshipLocationsAdmin />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
