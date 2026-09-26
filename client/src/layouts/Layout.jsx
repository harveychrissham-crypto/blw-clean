import { Link, NavLink, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FiMoreHorizontal, FiX, FiHome, FiMic, FiHeart, FiPhone, FiSearch, FiUser, FiLogIn, FiBell, FiVideo, FiMessageCircle, FiCamera, FiUsers, FiBookmark, FiHash, FiArrowRight } from 'react-icons/fi';
import SearchPanel from '../components/SearchPanel';
import BottomNav from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';
import { getUnreadCount, onNotificationsUpdated } from '../utils/notificationStorage';
import { fetchCommunities } from '../utils/communities';
import Button from '../components/ui/Button';
const navItems = [
  { name: 'Home', path: '/', icon: FiHome }, { name: 'Explore', path: '/explore', icon: FiSearch }, { name: 'Communities', path: '/communities', icon: FiUsers }, { name: 'Messages', path: '/messages', icon: FiMessageCircle }, { name: 'Notifications', path: '/notifications', icon: FiBell }, { name: 'Bookmarks', path: '/bookmarks', icon: FiBookmark }, { name: 'Profile', path: '/profile', icon: FiUser },
];
function FeedSocialChrome({ user }) { const name=user?.name||'Emet Community'; const firstName=name.split(' ')[0]||'Member'; const initial=firstName.charAt(0).toUpperCase(); return <div className="border-b border-white/[0.07] bg-ink-950/95 px-4 py-3 backdrop-blur-xl sm:hidden"><div className="mx-auto flex max-w-3xl items-center justify-between"><Link to={user?'/dashboard':'/auth'} className="flex min-w-0 items-center gap-3" aria-label={user?'Open your profile':'Sign in'}><span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#11161D] text-white] text-xs font-black text-white ring-1 ring-white/15">{user?.avatarUrl?<img src={user.avatarUrl} alt="" className="h-full w-full object-cover"/>:initial}</span><span className="min-w-0"><span className="block truncate text-sm font-bold text-white">{user?firstName:'Emet Community'}</span><span className="block text-[10px] text-white/40">{user?'Your profile':'Community Feed'}</span></span></Link><div className="flex items-center gap-1">{user&&<Link to="/create" aria-label="Create post or Reel" title="Create post or Reel" className="rounded-full p-2.5 text-white/80 hover:bg-white/5 hover:text-white"><FiCamera className="h-[20px] w-[20px]"/></Link>}{user&&<Link to="/notifications" aria-label="Notifications" className="rounded-full p-2.5 text-white/70 hover:bg-white/5 hover:text-white"><FiBell className="h-[19px] w-[19px]"/></Link>}{user&&<Link to="/messages" aria-label="Messages" title="Messages" className="rounded-full p-2.5 text-white/80 hover:bg-white/5 hover:text-white"><FiMessageCircle className="h-[20px] w-[20px]"/></Link>}</div></div></div>; }
function FeedTabStyle() { return <style>{`main.feed-page .sticky.top-0 > div{gap:1.25rem!important}main.feed-page .sticky.top-0 button{position:relative;border-radius:0!important;padding:.7rem .15rem!important;background:transparent!important;color:rgba(255,255,255,.45)!important;font-size:.72rem!important}main.feed-page .sticky.top-0 button:hover{background:transparent!important;color:rgba(255,255,255,.85)!important}main.feed-page .sticky.top-0 button::after{content:'';position:absolute;left:0;right:0;bottom:0;height:2px;border-radius:999px;background:transparent}main.feed-page .sticky.top-0 button:hover::after{background:rgba(255,255,255,.18)}`}</style>; }
export default function Layout({ children }) {
  const [searchOpen,setSearchOpen]=useState(false);
  const [unreadCount,setUnreadCount]=useState(0);
  const [communities,setCommunities]=useState([]);
  const {user}=useAuth();
  const location=useLocation();
  const isFeed=location.pathname==='/feed'; const isHome=location.pathname==='/';
  useEffect(()=>{const refresh=()=>setUnreadCount(getUnreadCount());refresh();return onNotificationsUpdated(refresh);},[]);
  useEffect(()=>{if(!isHome)return undefined;let active=true;fetchCommunities().then(items=>{if(active)setCommunities(items);}).catch(()=>{});return()=>{active=false;};},[isHome]);
    return <div className="min-h-screen text-white" style={{background:'radial-gradient(ellipse at 4% 28%, rgba(0,88,220,.14), transparent 34%), radial-gradient(ellipse at 98% 9%, rgba(80,42,215,.17), transparent 35%), radial-gradient(ellipse at 51% 100%, rgba(23,39,154,.14), transparent 42%), #02091d'}}>
    {!isHome&&<header className="sticky top-0 z-40 border-b border-white/[0.07]" style={{background:'rgba(11,15,20,0.94)',backdropFilter:'blur(20px)'}}>
      <div className="flex items-center justify-between px-4 py-2.5 sm:px-5">
        <Link to="/" className="flex items-center lg:hidden"><img src="/emet-logo.png" alt="Emet" className="h-8 w-8 rounded-lg"/></Link>
        <div className="ml-auto flex items-center gap-1"><Button variant="custom" size="none" onClick={()=>setSearchOpen(true)} className="rounded-lg p-2 text-white/50 hover:text-white hover:bg-white/5" aria-label="Search"><FiSearch className="h-4 w-4"/></Button>{user&&<Link to="/notifications" className="rounded-lg p-2 text-white/50 hover:text-white lg:hidden"><FiBell className="h-4 w-4"/></Link>}{user?<Link to="/profile" className="rounded-full px-3 py-2 text-sm font-semibold lg:hidden">Profile</Link>:<Link to="/auth" className="rounded-full px-3 py-2 text-sm font-semibold lg:hidden">Sign In</Link>}</div>
      </div>
    </header>}
    {isHome&&<header className="mx-auto hidden h-[130px] max-w-[1468px] items-center justify-between px-8 lg:flex"><Link to="/" aria-label="Emet home" className="flex items-center gap-4"><img src="/emet-logo.png" alt="" className="h-[76px] w-[76px] rounded-[22px]"/><img src="/emet-wordmark-geometric-white.svg" alt="Emet" className="h-[48px] w-auto"/></Link><p className="text-[11px] font-semibold uppercase tracking-[.44em] text-[#c0cdec]/85">Real people. Meaningful connections.</p></header>}
    <div className={isHome?'mx-auto max-w-[1468px] px-4 pb-10 lg:flex lg:min-h-[calc(100vh-180px)] lg:overflow-hidden lg:rounded-[22px] lg:border lg:border-[#625bc1]/70 lg:bg-[#020b20]/95 lg:shadow-[0_0_0_1px_rgba(42,86,190,.18),0_0_32px_rgba(75,55,190,.24)]':'contents'}>
    <aside className={`${isHome?'relative w-[250px] shrink-0 border-r border-[#3156AE]/50 bg-[#020a20]/95':'fixed inset-y-0 left-0 z-40 w-[260px] border-r border-[#253A72]/45 bg-[#030A18]/95'} hidden flex-col px-0 py-6 backdrop-blur-xl lg:flex`}>
      <div className="mb-8 flex shrink-0 flex-col px-6">
        <Link to="/" aria-label="Emet home" className="flex items-center gap-2.5"><img src="/emet-logo.png" alt="" className="h-10 w-10 rounded-xl"/><img src="/emet-wordmark-geometric-white.svg" alt="Emet" className="h-8 w-auto"/></Link>
        {!isHome&&<p className="mt-3 pl-0.5 text-[9px] font-semibold uppercase tracking-[.28em] text-[#9FB6E8]/80">Real people. Meaningful connections.</p>}
      </div>
      <nav className="min-h-0 flex-1 overflow-y-auto flex flex-col gap-1 px-3 pb-4">
        {navItems.map(item=>{const Icon=item.icon;return <NavLink key={item.path} to={item.path} end={item.path==='/'}
          className={({isActive})=>`flex items-center gap-4 rounded-xl px-4 py-3 text-[0.95rem] font-semibold transition ${isActive?'bg-gradient-to-r from-[#182F91] to-[#281370] text-white shadow-[0_0_22px_rgba(73,59,228,.2)]':'text-white/60 hover:bg-white/[.05] hover:text-white'}`}>
          <Icon className="h-5 w-5 shrink-0"/>{item.name}
        </NavLink>;})}
      </nav>
      {isHome&&<section className="mx-4 mb-4 hidden shrink-0 xl:block">
        <div className="mb-2 flex items-center justify-between px-1"><h2 className="text-xs font-bold text-white/85">Your Communities</h2><Link to="/communities" className="text-[10px] font-semibold text-[#91AFFF] hover:text-white">See all</Link></div>
        <div className="space-y-1">
          {communities.filter(item=>item.joined).slice(0,5).map((item,index)=><Link key={item.id} to={`/communities/${item.id}`} className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-white/[.05]"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br ${['from-fuchsia-500 to-indigo-600','from-cyan-400 to-blue-600','from-violet-500 to-purple-700','from-sky-400 to-indigo-600','from-blue-500 to-violet-600'][index]} text-white`}><FiUsers className="h-4 w-4"/></span><span className="min-w-0"><span className="block truncate text-[11px] font-semibold text-white/90">{item.name}</span><span className="block text-[9px] text-white/40">{Number(item.member_count||0).toLocaleString()} members</span></span></Link>)}
          {!communities.some(item=>item.joined)&&<p className="px-1 py-2 text-[10px] leading-4 text-white/40">Join a community to see it here.</p>}
        </div>
      </section>}
      <Link to="/communities" className="mx-4 mt-auto flex shrink-0 items-center justify-between rounded-2xl border border-[#445FDB]/45 bg-gradient-to-br from-[#102989] via-[#221884] to-[#49118E] px-4 py-4 text-sm font-bold text-white shadow-[0_12px_35px_rgba(31,35,145,.22)] transition hover:brightness-110">
        <span><span className="block">Build your community</span><span className="mt-1 block text-[11px] font-normal text-white/65">Find people who matter to you</span></span><FiArrowRight className="h-4 w-4 shrink-0" />
      </Link>
    </aside>
    <div className={isHome?'min-w-0 flex-1':'lg:pl-[260px]'}>
      <div className="min-w-0">
        {isFeed&&<FeedSocialChrome user={user}/>} {isFeed&&<FeedTabStyle/>}
        <main className={isFeed?'feed-page':undefined}>{children}</main>
        {!isHome&&<footer className="hidden border-t border-white/[0.07] mt-8 sm:block" style={{background:'rgba(10,9,20,0.8)'}}><div className="mx-auto max-w-6xl px-5 py-10"><div><h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/40">Quick Links</h4><div className="flex flex-col gap-2 text-sm text-white/50"><Link to="/feed">Feed</Link><Link to="/messages">Messages</Link></div></div></div><div className="border-t border-white/[0.05] py-4 text-center text-xs text-white/25">© {new Date().getFullYear()} Emet</div></footer>}
      </div>
    </div></div>
    <SearchPanel open={searchOpen} onClose={()=>setSearchOpen(false)}/>
    <div className="pb-24 pt-2 text-center text-[10px] text-white/20 lg:hidden">© {new Date().getFullYear()} Emet · Faith · Community · Conversation</div><BottomNav/>
  </div>;
}
