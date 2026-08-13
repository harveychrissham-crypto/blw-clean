import { NavLink } from 'react-router-dom';
import { FiHome, FiCalendar, FiRadio, FiMenu } from 'react-icons/fi';
import { MdQrCodeScanner } from 'react-icons/md';

// The five items people reach for most, one thumb-tap away, always visible.
// Everything else lives in the "More" drawer (opened via onMoreClick) so we
// don't repeat the old horizontal-scroll problem inside the tab bar itself.
const tabs = [
  { name: 'Home', path: '/', icon: FiHome, end: true },
  { name: 'Events', path: '/events', icon: FiCalendar },
  { name: 'Check-In', path: '/checkin', icon: MdQrCodeScanner },
  { name: 'Live', path: '/live', icon: FiRadio },
];

export default function BottomNav({ onMoreClick, moreActive }) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.07] sm:hidden"
      style={{
        background: 'rgba(13,12,24,0.96)',
        backdropFilter: 'blur(20px)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
      aria-label="Primary"
    >
      <div className="grid grid-cols-5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition ${
                  isActive ? 'text-white' : 'text-white/45'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-8 w-9 items-center justify-center rounded-xl transition ${
                      isActive ? 'bg-white/10' : ''
                    }`}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  {tab.name}
                </>
              )}
            </NavLink>
          );
        })}

        <button
          type="button"
          onClick={onMoreClick}
          className={`flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition ${
            moreActive ? 'text-white' : 'text-white/45'
          }`}
        >
          <span className={`flex h-8 w-9 items-center justify-center rounded-xl transition ${moreActive ? 'bg-white/10' : ''}`}>
            <FiMenu className="h-[18px] w-[18px]" />
          </span>
          More
        </button>
      </div>
    </nav>
  );
}
