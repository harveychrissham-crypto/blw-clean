import { NavLink, Link } from 'react-router-dom';
import { FiHome, FiRadio, FiGrid, FiUser, FiHeart, FiPlusSquare, FiMessageCircle } from 'react-icons/fi';
import { MdQrCodeScanner } from 'react-icons/md';

const tabs = [
  { name: 'Home', path: '/', icon: FiHome, end: true },
  { name: 'Feed', path: '/feed', icon: FiGrid },
  { name: 'Create', path: '/feed', icon: FiPlusSquare },
  { name: 'Live', path: '/live', icon: FiRadio },
];

export default function BottomNav({ onMoreClick, moreActive }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.07] sm:hidden" style={{ background: 'rgba(13,12,24,0.97)', backdropFilter: 'blur(22px)', paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="Primary">
      <div className="grid grid-cols-5 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return <NavLink key={`${tab.path}-${tab.name}`} to={tab.path} end={tab.end} className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition ${isActive ? 'text-white' : 'text-white/45'}`}>
            {({ isActive }) => <><Icon className={`${isActive ? 'h-[21px] w-[21px]' : 'h-[20px] w-[20px]'} transition`} />{tab.name}</>}
          </NavLink>;
        })}
        <Link to="/dashboard" className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-white/45 transition hover:text-white">
          <span className="flex h-[21px] w-[21px] items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/5">
            <FiUser className="h-[15px] w-[15px]" />
          </span>
          Profile
        </Link>
      </div>
    </nav>
  );
}
