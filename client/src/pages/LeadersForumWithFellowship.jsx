import { useState } from 'react';
import { FiMapPin, FiX, FiChevronRight, FiTool } from 'react-icons/fi';
import LeadersForum from './LeadersForum';
import FellowshipLocationsAdmin from './FellowshipLocationsAdmin';

export default function LeadersForumWithFellowship() {
  const [showManager, setShowManager] = useState(false);

  return (
    <>
      <LeadersForum />

      {/* Fellowship management is a native Leaders Forum tool, not a page-level banner. */}
      <section className="border-t border-white/10 bg-[#0d0c18] px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex items-center gap-2 text-white/50">
            <FiTool className="h-4 w-4 text-[#F2A31C]" />
            <p className="text-[10px] font-bold uppercase tracking-[0.35em]">Leadership Tools</p>
          </div>

          <button
            type="button"
            onClick={() => setShowManager(true)}
            className="group w-full rounded-2xl border border-[#8A2BE2]/30 bg-gradient-to-r from-[#8A2BE2]/15 via-[#EC2FA8]/10 to-[#3D5AFE]/10 p-5 text-left shadow-xl transition hover:border-[#EC2FA8]/50 hover:bg-white/[0.06]"
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#8A2BE2]/20 text-[#D8B2FF]">
                  <FiMapPin className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#F2A31C]">Location Management</p>
                  <h2 className="mt-1 text-lg font-bold text-white">Manage Fellowship Locations</h2>
                  <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/50 sm:text-sm">
                    Search for a place, click the exact fellowship location, drag the pin to fine-tune it, and save the fellowship details. Coordinates are captured automatically.
                  </p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] px-5 py-3 text-sm font-bold text-white shadow-lg transition group-hover:scale-[1.01]">
                <FiMapPin className="h-4 w-4" />
                Manage Locations
                <FiChevronRight className="h-4 w-4" />
              </span>
            </div>
          </button>
        </div>
      </section>

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
