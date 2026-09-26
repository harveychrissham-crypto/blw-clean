import { NavLink } from 'react-router-dom';
import { FiHome, FiSearch, FiPlus, FiBell, FiUser } from 'react-icons/fi';

const tabs = [
  { name: 'Home', path: '/', icon: FiHome, end: true },
  { name: 'Explore', path: '/explore', icon: FiSearch },
  { name: 'Create', path: '/create', icon: FiPlus, create: true },
  { name: 'Notifications', path: '/notifications', icon: FiBell },
  { name: 'Profile', path: '/dashboard', icon: FiUser },
];

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[.07] bg-[#0B0F14]/95 backdrop-blur-2xl sm:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} aria-label="Primary">
      <div className="grid grid-cols-5 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              end={tab.end}
              className={({ isActive }) => `group flex flex-col items-center gap-1 rounded-xl py-2.5 text-[10px] font-semibold transition-all active:scale-90 ${isActive ? 'text-white' : 'text-white/40 hover:text-white/75'}`}
            >
              {({ isActive }) => (
                <>
                  <span className={`grid h-8 w-10 place-items-center rounded-xl transition ${tab.create ? 'border border-white/15 bg-white/[.06]' : 'group-active:bg-white/[.08]'}`}>
                    <Icon className={isActive ? 'h-[21px] w-[21px]' : 'h-5 w-5'} />
                  </span>
                  {tab.name}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
