import { useState } from 'react';
import { FiMapPin, FiX } from 'react-icons/fi';
import LeadersForum from './LeadersForum';
import FellowshipLocationsAdmin from './FellowshipLocationsAdmin';

export default function LeadersForumWithFellowship() {
  const [showManager, setShowManager] = useState(false);

  return (
    <>
      <LeadersForum />
      {!showManager && (
        <button
          type="button"
          onClick={() => setShowManager(true)}
          className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full border border-white/10 bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] px-5 py-3 text-sm font-bold text-white shadow-2xl transition hover:scale-[1.02]"
        >
          <FiMapPin className="h-4 w-4" />
          Manage Fellowship Locations
        </button>
      )}
      {showManager && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0d0c18]/95">
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
