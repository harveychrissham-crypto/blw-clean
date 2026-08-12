import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiChevronRight, FiLoader, FiMapPin, FiX } from 'react-icons/fi';
import LeadersForum from './LeadersForum';
import FellowshipLocationsAdmin from './FellowshipLocationsAdmin';
import { apiFetch } from '../config/api';

const LEADER_CODE = '1120363';

function FellowshipToolCard({ onOpen, opening }) {
  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()}
      className="group cursor-pointer overflow-hidden rounded-[2rem] border border-[#8A2BE2]/30 bg-gradient-to-r from-[#8A2BE2]/15 via-[#EC2FA8]/10 to-[#3D5AFE]/10 p-6 transition hover:-translate-y-0.5 hover:border-[#EC2FA8]/50 hover:bg-white/[0.06]"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[#D8B2FF]">Management</p>
          <h3 className="mt-2 text-xl font-bold text-white">Manage Fellowship Locations ▸</h3>
          <p className="mt-1 text-sm text-white/50">Search, pin, drag, save, edit, and delete fellowship locations.</p>
        </div>
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#8A2BE2]/20 text-[#D8B2FF] transition group-hover:bg-[#8A2BE2]/30">
          {opening ? <FiLoader className="h-7 w-7 animate-spin" /> : <FiMapPin className="h-7 w-7" />}
        </div>
      </div>
    </div>
  );
}

export default function LeadersForumWithFellowship() {
  const [toolsGrid, setToolsGrid] = useState(null);
  const [showManager, setShowManager] = useState(false);
  const [openingManager, setOpeningManager] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let observer;
    const findToolsGrid = () => {
      if (cancelled) return;
      const candidates = Array.from(document.querySelectorAll('div.grid'));
      const grid = candidates.find((el) => {
        const text = el.textContent || '';
        return text.includes('Manage Events') && text.includes('Manage Outreach') && text.includes('Manage Sermons') && text.includes('Manage Live Stream');
      });
      if (grid) {
        setToolsGrid(grid);
        if (observer) observer.disconnect();
      }
    };
    findToolsGrid();
    observer = new MutationObserver(findToolsGrid);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { cancelled = true; if (observer) observer.disconnect(); };
  }, []);

  const openManager = async () => {
    setOpeningManager(true);
    try {
      let token = sessionStorage.getItem('blw_leader_admin_token');
      if (!token) {
        const response = await apiFetch('/api/fellowships/admin/auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessCode: LEADER_CODE }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body.token) throw new Error(body.error || 'Unable to establish the leadership session.');
        token = body.token;
        sessionStorage.setItem('blw_leader_admin_token', token);
      }
      setShowManager(true);
    } catch (error) {
      window.alert(error.message || 'Unable to access fellowship locations right now.');
    } finally {
      setOpeningManager(false);
    }
  };

  return (
    <>
      <LeadersForum />

      {toolsGrid && createPortal(
        <FellowshipToolCard onOpen={openManager} opening={openingManager} />,
        toolsGrid,
      )}

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
