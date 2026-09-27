import { Link, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FiMoreHorizontal, FiX, FiHome, FiMic, FiHeart, FiPhone, FiCompass, FiUser, FiLogIn, FiBell, FiVideo, FiMessageCircle, FiCamera, FiUsers, FiBookmark, FiHash, FiArrowRight } from 'react-icons/fi';
import { FaHome, FaCompass, FaUsers, FaComments, FaBell, FaBookmark, FaUser } from 'react-icons/fa';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { getUnreadCount, onNotificationsUpdated } from '../utils/notificationStorage';
import { fetchCommunities } from '../utils/communities';
const navItems = [
  { name: 'Home', path: '/', icon: FiHome, activeIcon: FaHome },
  { name: 'Explore', path: '/explore', icon: FiCompass, activeIcon: FaCompass },
  { name: 'Communities', path: '/communities', icon: FiUsers, activeIcon: FaUsers },
  { name: 'Messages', path: '/messages', icon: FiMessageCircle, activeIcon: FaComments },
  { name: 'Notifications', path: '/notifications', icon: FiBell, activeIcon: FaBell },
  { name: 'Bookmarks', path: '/bookmarks', icon: FiBookmark, activeIcon: FaBookmark },
  { name: 'Profile', path: '/profile', icon: FiUser, activeIcon: FaUser },
];
function FeedSocialChrome({ user }) { const name=user?.name||'Emet Community'; const firstName=name.split(' ')[0]||'Member'; const initial=firstName.charAt(0).toUpperCase(); return <div className="border-b border-white/[0.07] bg-ink-950/95 px-4 py-3 backdrop-blur-xl sm:hidden"><div className="mx-auto flex max-w-3xl items-center justify-between"><Link to={user?'/dashboard':'/auth'} className="flex min-w-0 items-center gap-3" aria-label={user?'Open your profile':'Sign in'}><span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#11161D] text-white] text-xs font-black text-white ring-1 ring-white/15">{user?.avatarUrl?<img src={user.avatarUrl} alt="" className="h-full w-full object-cover"/>:initial}</span><span className="min-w-0"><span className="block truncate text-sm font-bold text-white">{user?firstName:'Emet Community'}</span><span className="block text-[10px] text-white/40">{user?'Your profile':'Community Feed'}</span></span></Link><div className="flex items-center gap-1">{user&&<Link to="/create" aria-label="Create post or Reel" title="Create post or Reel" className="rounded-full p-2.5 text-white/80 hover:bg-white/5 hover:text-white"><FiCamera className="h-[20px] w-[20px]"/></Link>}{user&&<Link to="/notifications" aria-label="Notifications" className="rounded-full p-2.5 text-white/70 hover:bg-white/5 hover:text-white"><FiBell className="h-[19px] w-[19px]"/></Link>}{user&&<Link to="/messages" aria-label="Messages" title="Messages" className="rounded-full p-2.5 text-white/80 hover:bg-white/5 hover:text-white"><FiMessageCircle className="h-[20px] w-[20px]"/></Link>}</div></div></div>; }
function FeedTabStyle() { return <style>{`main.feed-page .sticky.top-0 > div{gap:1.25rem!important}main.feed-page .sticky.top-0 button{position:relative;border-radius:0!important;padding:.7rem .15rem!important;background:transparent!important;color:rgba(255,255,255,.45)!important;font-size:.72rem!important}main.feed-page .sticky.top-0 button:hover{background:transparent!important;color:rgba(255,255,255,.85)!important}main.feed-page .sticky.top-0 button::after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;border-radius:999px;background:transparent}main.feed-page .sticky.top-0 button:hover::after{background:rgba(255,255,255,.18)}`}</style>; }
export default function Layout({ children }) {
  const [unreadCount,setUnreadCount]=useState(0);
  const [communities,setCommunities]=useState([]);
  const {user}=useAuth();
  const location=useLocation();
  const isFeed=location.pathname==='/feed'; const isHome=location.pathname==='/';
  useEffect(()=>{const refresh=()=>setUnreadCount(getUnreadCount());refresh();return onNotificationsUpdated(refresh);},[]);
  useEffect(()=>{if(!isHome)return undefined;let active=true;fetchCommunities().then(items=>{if(active)setCommunities(items);}).catch(()=>{});return()=>{active=false;};},[isHome]);

  // --- Single sidebar strategy for every route -----------------------------
  // Both variants below are real CSS Grid columns. The sidebar's width and
  // the content column's offset come from the SAME grid-template-columns
  // declaration, so a fixed-position sidebar and a hand-typed padding-left
  // on the content pane can never again drift out of sync — that mismatch
  // was the root cause of the recurring overlap bugs on non-home pages.
  // The grid only activates at the breakpoint where the sidebar itself
  // becomes visible (md for home, lg for everything else); below that the
  // wrapper is a plain single column and BottomNav takes over navigation.
  const gridActivationClass = isHome ? 'md:grid' : 'lg:grid';
  const gridColsClass = isHome
    ? 'md:grid-cols-[180px_minmax(0,1fr)] lg:grid-cols-[210px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]'
    : 'lg:grid-cols-[260px_minmax(0,1fr)]';
  const asideVisibilityClass = isHome ? 'md:flex' : 'lg:flex';
  const asideWidthClass = isHome ? 'w-[180px] lg:w-[210px] xl:w-[240px]' : 'w-[260px]';
  // Home's sidebar scrolls with the page (unchanged from before). Every
  // other page previously used `fixed inset-y-0` to keep the sidebar
  // pinned while scrolling; `sticky top-0` + `h-screen` reproduces that
  // same pinned-to-viewport feel while staying INSIDE the grid track, so
  // it structurally cannot overlap the content column next to it.
  const asidePositionClass = isHome ? 'relative' : 'lg:sticky lg:top-0 lg:h-screen';

  return <div className="min-h-screen overflow-x-hidden text-white" style={{background:'radial-gradient(ellipse at 4% 28%, rgba(0,88,220,.10), transparent 34%), radial-gradient(ellipse at 98% 9%, rgba(80,42,215,.12), transparent 35%), radial-gradient(ellipse at 51% 100%, rgba(23,39,154,.10), transparent 42%), #07070a'}}>
    <div className={`mx-auto max-w-[1468px] px-4 pb-10 ${gridActivationClass} ${gridColsClass} md:min-h-[calc(100vh-160px)] ${isHome ? 'md:rounded-[22px] md:border lg:overflow-hidden lg:border-[#2a2a31]/60 lg:bg-[#08080a]/95 lg:shadow-[0_0_0_1px_rgba(42,86,190,.14),0_0_28px_rgba(75,55,190,.16)]' : ''}`}>
      <aside className={`hidden ${asideVisibilityClass} ${asidePositionClass} ${asideWidthClass} shrink-0 flex-col ${isHome ? 'border-r border-[#2a2a31]/40 bg-[#08080a]/95 py-6' : 'border-r border-[#232329]/45 bg-[#08080a]/95 px-0 py-6'} backdrop-blur-xl`}>
        <div className="mb-8 flex shrink-0 flex-col px-3 xl:px-4">
          <Link to="/" aria-label="Emet home" className="flex items-center"><span role="img" aria-label="Emet" className="emet-wordmark emet-wordmark-sidebar"/></Link>
          {!isHome&&<p className="mt-3 pl-0.5 text-[9px] font-semibold uppercase tracking-[.28em] text-[#7C8BB5]/80">Real people. Meaningful connections.</p>}
        </div>
        <nav className="min-h-0 flex-1 overflow-y-auto flex flex-col gap-1 px-3 pb-4">
          {navItems.map(item=>{const Icon=item.icon;const ActiveIcon=item.activeIcon;return <NavLink key={item.path} to={item.path} end={item.path==='/'}
            className={({isActive})=>[`group flex items-center gap-4 rounded-xl px-4 py-3 text-[0.95rem] font-semibold transition`,isHome&&`md:gap-2 md:px-2 xl:gap-3 xl:px-3`,isActive?`bg-gradient-to-r from-[#1d5aff] to-[#8228f5] text-white shadow-[0_0_22px_rgba(73,59,228,.2)]`:`text-white/60 hover:bg-white/[.05] hover:text-white`].filter(Boolean).join(" ")}>
            {({isActive})=><><span className="grid h-6 w-6 shrink-0 place-items-center">{isActive&&ActiveIcon?<ActiveIcon className="h-[18px] w-[18px]"/>:<Icon className="h-5 w-5"/>}</span>{item.name}</>}
          </NavLink>;})}
        </nav>
        {isHome&&<section className="mx-4 mb-4 hidden shrink-0 lg:block">
          <div className="mb-2 flex items-center justify-between px-1"><h2 className="text-xs font-bold text-white/85">Your Communities</h2><Link to="/communities" className="text-[10px] font-semibold text-[#5B9CFF] hover:text-white">See all</Link></div>
          <div className="space-y-1">
            {communities.filter(item=>item.joined).slice(0,5).map((item,index)=><Link key={item.id} to={`/communities/${item.id}`} className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-white/[.05]"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${['from-fuchsia-500 to-indigo-600','from-cyan-400 to-blue-600','from-violet-500 to-purple-700','from-sky-400 to-indigo-600','from-blue-500 to-violet-600'][index]} text-white`}><FiUsers className="h-4 w-4"/></span><span className="min-w-0"><span className="block truncate text-[11px] font-semibold text-white/90">{item.name}</span><span className="block text-[9px] text-white/40">{Number(item.member_count||0).toLocaleString()} members</span></span></Link>)}
            {!communities.some(item=>item.joined)&&<p className="px-1 py-2 text-[10px] leading-4 text-white/40">Join a community to see it here.</p>}
          </div>
        </section>}
        {isHome ? (
          <div className="mx-4 mt-auto hidden shrink-0 rounded-2xl border border-[#2a2a31]/50 bg-[#0c0c12] p-4 xl:block">
            <img src="/emet-mark.svg" alt="" className="h-8 w-8" />
            <p className="mt-3 text-[13px] font-extrabold leading-tight text-white">Real people.<br />Meaningful connections.</p>
            <p className="mt-2 text-[11px] leading-4 text-white/50">Join communities, share your thoughts, and be part of something bigger.</p>
            <Link to="/communities" className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#1496ff] to-[#e42dff] px-3.5 py-2 text-[11px] font-bold text-white hover:brightness-110">
              Explore Communities <FiArrowRight className="h-3 w-3" />
            </Link>
          </div>
        ) : (
          <Link to="/communities" className={"flex "+"mx-4 mt-auto shrink-0 items-center justify-between rounded-2xl border border-[#2a2a35] bg-gradient-to-br from-[#0a0f2b] via-[#161033] to-[#2e0e4d] px-4 py-4 text-sm font-bold text-white shadow-[0_12px_35px_rgba(31,35,145,.22)] transition hover:brightness-110"}>
            <span><span className="block">Build your community</span><span className="mt-1 block text-[11px] font-normal text-white/65">Find people who matter to you</span></span><FiArrowRight className="h-4 w-4 shrink-0" />
          </Link>
        )}
      </aside>
      <div className="min-w-0">
        <div className="min-w-0">
          {isFeed&&<FeedSocialChrome user={user}/>} {isFeed&&<FeedTabStyle/>}
          <main className={isFeed?'feed-page':undefined}>{children}</main>
        </div>
      </div>
    </div>
    <BottomNav/>
  </div>;
}
