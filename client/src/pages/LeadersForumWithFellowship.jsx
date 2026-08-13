import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiCalendar, FiCheckCircle, FiFilm, FiImage, FiMapPin, FiRadio, FiTool, FiX } from 'react-icons/fi';
import { apiFetch } from '../config/api';
import LeadersForum from './LeadersForum';
import FellowshipLocationsAdmin from './FellowshipLocationsAdmin';
import OfflineAttendanceSheet from '../components/OfflineAttendanceSheet';

const LEADER_CODE = '1120363';

const TOOL_BUTTONS = [
  { label: 'Check Attendance', description: 'View today\'s signed-in members, including offline records waiting to sync.', kind: 'attendance', icon: FiCheckCircle },
  { label: 'Manage Events', description: 'Add, edit, and remove public events.', kind: 'internal', icon: FiCalendar },
  { label: 'Manage Outreach', description: 'Publish outreach stories and photos.', kind: 'internal', icon: FiImage },
  { label: 'Manage Sermons', description: 'Manage sermon videos and the featured sermon.', kind: 'internal', icon: FiFilm },
  { label: 'Manage Fellowship Locations', description: 'Search, pin, drag, save, edit, and delete fellowship locations.', kind: 'fellowship', icon: FiMapPin },
  { label: 'Manage Service Venues', description: 'Set chapter service venues and times.', kind: 'internal', icon: FiMapPin },
  { label: 'Manage Live Stream', description: 'Control the public live stream and viewer information.', kind: 'internal', icon: FiRadio },
];

function LeadershipToolsCard({ onOpen }) {
  return (
    <div onClick={onOpen} role="button" tabIndex={0} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen()} className="group cursor-pointer overflow-hidden rounded-[2rem] border border-[#8A2BE2]/30 bg-gradient-to-r from-[#8A2BE2]/15 via-[#EC2FA8]/10 to-[#3D5AFE]/10 p-6 transition hover:-translate-y-0.5 hover:border-[#EC2FA8]/50 hover:bg-white/[0.06]">
      <div className="flex items-center justify-between gap-5">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-[#D8B2FF]">Leadership</p><h3 className="mt-2 text-xl font-bold text-white">Leadership Tools ▸</h3><p className="mt-1 text-sm text-white/50">Manage content, campus fellowships, venues, attendance, and the live stream from one place.</p></div>
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#8A2BE2]/20 text-[#D8B2FF] transition group-hover:bg-[#8A2BE2]/30"><FiTool className="h-7 w-7" /></div>
      </div>
    </div>
  );
}

function ToolsDashboard({ onClose, onFellowship, onInternalOpen, onAttendance }) {
  return createPortal(
    <div data-leadership-tools-overlay className="fixed inset-0 z-[110] overflow-y-auto bg-[#0d0c18]/98 backdrop-blur-xl">
      <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-start justify-between gap-5"><div><p className="text-[10px] font-bold uppercase tracking-[0.4em] text-[#F2A31C]">Leaders Forum</p><h2 className="mt-2 text-3xl font-extrabold text-white">Leadership Tools</h2><p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/45">All management tools are organized here so the main Leaders Forum stays focused on attendance and the member directory.</p></div><button onClick={onClose} className="inline-flex shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-semibold text-white/75 hover:bg-white/10"><FiX /> Back to Leaders Forum</button></div>
        <div className="space-y-8">
          <section><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D8B2FF]">Attendance</p><div className="grid gap-3 sm:grid-cols-2"><button onClick={onAttendance} className="group rounded-2xl border border-emerald-500/20 bg-emerald-950/35 p-5 text-left transition hover:-translate-y-0.5 hover:bg-emerald-950/50"><div className="flex items-center justify-between gap-3"><div><h3 className="font-bold text-white">Check Attendance</h3><p className="mt-1 text-xs leading-relaxed text-white/40">View today\'s signed-in members and offline attendance waiting to sync.</p></div><FiCheckCircle className="h-6 w-6 shrink-0 text-emerald-300" /></div></button></div></section>
          <section><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D8B2FF]">Content Management</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{TOOL_BUTTONS.filter((tool) => ['Manage Events','Manage Outreach','Manage Sermons'].includes(tool.label)).map((tool) => { const Icon=tool.icon; return <button key={tool.label} onClick={() => onInternalOpen(tool.label)} className="group rounded-2xl border border-white/10 bg-[#090b12] p-5 text-left transition hover:-translate-y-0.5 hover:bg-[#0f121c]"><div className="flex items-center justify-between gap-3"><div><h3 className="font-bold text-white">{tool.label}</h3><p className="mt-1 text-xs leading-relaxed text-white/40">{tool.description}</p></div><Icon className="h-6 w-6 shrink-0 text-[#A53DFF]" /></div></button>; })}</div></section>
          <section><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D8B2FF]">Campus & Fellowship</p><div className="grid gap-3 sm:grid-cols-2">{TOOL_BUTTONS.filter((tool) => ['Manage Fellowship Locations','Manage Service Venues'].includes(tool.label)).map((tool) => { const Icon=tool.icon; const action=tool.kind==='fellowship'?() => { onClose(); onFellowship(); }:() => onInternalOpen(tool.label); return <button key={tool.label} onClick={action} className="group rounded-2xl border border-white/10 bg-[#090b12] p-5 text-left transition hover:-translate-y-0.5 hover:bg-[#0f121c]"><div className="flex items-center justify-between gap-3"><div><h3 className="font-bold text-white">{tool.label}</h3><p className="mt-1 text-xs leading-relaxed text-white/40">{tool.description}</p></div><Icon className="h-6 w-6 shrink-0 text-[#D8B2FF]" /></div></button>; })}</div></section>
          <section><p className="mb-3 text-[10px] font-bold uppercase tracking-[0.3em] text-[#D8B2FF]">Broadcast</p><div className="grid gap-3 sm:grid-cols-2">{TOOL_BUTTONS.filter((tool) => tool.label==='Manage Live Stream').map((tool) => { const Icon=tool.icon; return <button key={tool.label} onClick={() => onInternalOpen(tool.label)} className="group rounded-2xl border border-white/10 bg-[#090b12] p-5 text-left transition hover:-translate-y-0.5 hover:bg-[#0f121c]"><div className="flex items-center justify-between gap-3"><div><h3 className="font-bold text-white">{tool.label}</h3><p className="mt-1 text-xs leading-relaxed text-white/40">{tool.description}</p></div><Icon className="h-6 w-6 shrink-0 text-red-300" /></div></button>; })}</div></section>
        </div>
      </div></div>
    </div>, document.body,
  );
}

export default function LeadersForumWithFellowship() {
  const [toolsGrid, setToolsGrid] = useState(null), [toolsOpen, setToolsOpen] = useState(false), [showFellowship, setShowFellowship] = useState(false), [showAttendance, setShowAttendance] = useState(false);
  const returnToToolsRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = sessionStorage.getItem('blw_leader_admin_token');
        if (existing) return;
        const response = await apiFetch('/api/fellowships/admin/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accessCode: LEADER_CODE }) });
        const body = await response.json().catch(() => ({}));
        if (!cancelled && response.ok && body.token) sessionStorage.setItem('blw_leader_admin_token', body.token);
      } catch {
        // Fellowship manager surfaces the session error if leadership auth is unavailable.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled=false, observer;
    const findToolsGrid=()=>{ if(cancelled)return; const candidates=Array.from(document.querySelectorAll('div.grid')); const grid=candidates.find((el)=>{const text=el.textContent||'';return text.includes('Manage Events')&&text.includes('Manage Outreach')&&text.includes('Manage Sermons')&&text.includes('Manage Live Stream');}); if(grid){setToolsGrid(grid); Array.from(grid.children).forEach((card)=>{const text=card.textContent||''; if(['Manage Events','Manage Outreach','Manage Sermons','Manage Service Venues','Manage Live Stream'].some((label)=>text.includes(label))) card.style.display='none';}); if(observer)observer.disconnect();}};
    findToolsGrid(); observer=new MutationObserver(findToolsGrid); observer.observe(document.body,{childList:true,subtree:true}); return()=>{cancelled=true;if(observer)observer.disconnect();};
  },[]);

  useEffect(() => {
    if (!returnToToolsRef.current) return undefined;
    const observer = new MutationObserver(() => {
      const modal = Array.from(document.querySelectorAll('div.fixed')).find((el) => {
        const text = el.textContent || '';
        return /Manage (Events|Outreach Stories|Sermons|Service Venues|Live Stream)/.test(text) && text.includes('Leaders tool');
      });
      if (!modal) {
        returnToToolsRef.current = false;
        setToolsOpen(true);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [toolsOpen]);

  const openInternal = (label) => {
    const cards = Array.from(document.querySelectorAll('div[role="button"]'));
    const target = cards.find((el) => (el.textContent || '').includes(label) && !el.closest('[data-leadership-tools-overlay]'));
    if (!target) return;
    returnToToolsRef.current = true;
    setToolsOpen(false);
    setTimeout(() => target.click(), 0);
  };

  return <>
    <LeadersForum />
    {toolsGrid&&createPortal(<LeadershipToolsCard onOpen={()=>setToolsOpen(true)}/>,toolsGrid)}
    {toolsOpen&&<ToolsDashboard onClose={()=>setToolsOpen(false)} onFellowship={()=>setShowFellowship(true)} onInternalOpen={openInternal} onAttendance={()=>setShowAttendance(true)}/>} 
    {showAttendance&&<OfflineAttendanceSheet members={[]} onClose={()=>{setShowAttendance(false);setToolsOpen(true);}} />}
    {showFellowship&&<div className="fixed inset-0 z-[120] overflow-y-auto bg-[#0d0c18]/98 backdrop-blur-xl"><div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="mb-3 flex justify-end"><button type="button" onClick={()=>{setShowFellowship(false);setToolsOpen(true);}} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-semibold text-white/80 hover:bg-white/10"><FiX /> Back to Leadership Tools</button></div><FellowshipLocationsAdmin /></div></div></div>}
  </>;
}
