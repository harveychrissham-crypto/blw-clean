import { NavLink, Link } from 'react-router-dom';
import { FiHome, FiGrid, FiUser, FiPlusSquare, FiBell, FiPlay } from 'react-icons/fi';

const tabs = [
  { name: 'Home', path: '/', icon: FiHome, end: true },
  { name: 'Feed', path: '/feed', icon: FiGrid },
  { name: 'Reels', path: '/feed?tab=Reels', icon: FiPlay },
  { name: 'Create', path: '/create', icon: FiPlusSquare },
  { name: 'Notifications', path: '/notifications', icon: FiBell },
];

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.07] bg-[#0d0c18]/97 backdrop-blur-2xl sm:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="Primary">
      <div className="grid grid-cols-5 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink key={tab.path} to={tab.path} end={tab.end} className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition ${isActive ? 'text-white' : 'text-white/45'}`}>
              {({ isActive }) => <><Icon className={isActive ? 'h-[21px] w-[21px]' : 'h-5 w-5'} />{tab.name}</>}
            </NavLink>
          );
        })}
        <Link to="/dashboard" className="hidden flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-white/45 transition hover:text-white">
          <span className="flex h-[21px] w-[21px] items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/5"><FiUser className="h-[15px] w-[15px]" /></span>
          Profile
        </Link>
      </div>
    </nav>
  );
}
