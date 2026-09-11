import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiAlertCircle, FiBookmark, FiHeart, FiLoader, FiMessageCircle, FiMoreHorizontal, FiSend, FiShare2, FiVolume2, FiVolumeX, FiWifiOff, FiX, FiFlag, FiLink2, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { fetchFeed, toggleLike, toggleSave, toggleFollow, fetchComments, addComment, deleteComment, reportPost, readCachedFeed, writeCachedFeed, recordFeedView } from '../utils/feed';
import { shareContent } from '../utils/share';
import { hapticTap, hapticSuccess, hapticError } from '../utils/haptics';
import StoriesRow from '../components/StoriesRow';
import PullToRefreshIndicator from '../components/PullToRefreshIndicator';
import { Skeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import Messages from './Messages';
const PAGE_SIZE = 20;
const tabs = ['All','Following','Ministry','Reels'];
const canViewPostInsights = (viewer) => Boolean(viewer?.isAdmin || /leader|secretary|coordinator|pastor|president|director|chair|supervisor|administrator/i.test(String(viewer?.title || '')));
function formatNameList(names) {
  if (names.length <= 1) return names[0] || '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
function formatLikeLine(post) {
  if (!post.likeCount || post.likeCount <= 0) return '';
  const names = (post.recentLikers || []).filter(Boolean);
  if (!names.length) return `${post.likeCount} ${post.likeCount === 1 ? 'like' : 'likes'}`;
  const others = post.likeCount - names.length;
  if (others <= 0) return `Liked by ${formatNameList(names)}`;
  return `Liked by ${names[0]}${names[1] ? `, ${names[1]}` : ''} and ${others} other${others === 1 ? '' : 's'}`;
}

const REPORT_REASONS = ['Spam', 'Inappropriate', 'Harassment', 'False information', 'Other'];

function ActionMenu({post}) {
  const [open,setOpen]=useState(false); const [reporting,setReporting]=useState(false); const [reported,setReported]=useState(false); const menuRef=useRef(null);
  useEffect(()=>{if(!open)return;const onDoc=e=>{if(menuRef.current&&!menuRef.current.contains(e.target))setOpen(false);};const onKey=e=>{if(e.key==='Escape')setOpen(false);};document.addEventListener('pointerdown',onDoc);document.addEventListener('keydown',onKey);return()=>{document.removeEventListener('pointerdown',onDoc);document.removeEventListener('keydown',onKey);};},[open]);
  const copy=async()=>{try{await navigator.clipboard?.writeText(`${window.location.origin}/feed?${post.type==='reel'?'tab=Reels&':''}notificationId=${encodeURIComponent(post.id)}`);hapticSuccess();}catch{hapticError();}setOpen(false);};
  const submitReport=async(reason)=>{try{await reportPost(post.id,reason);setReported(true);hapticSuccess();setTimeout(()=>{setOpen(false);setReporting(false);setReported(false);},1200);}catch{hapticError();}};
  return <div ref={menuRef} className="relative"><button type="button" onClick={()=>setOpen(v=>!v)} className="grid h-9 w-9 place-items-center rounded-full text-white/45 hover:bg-white/[.06]" aria-label="More options"><FiMoreHorizontal/></button><AnimatePresence>{open&&<motion.div initial={{opacity:0,scale:.96,y:-4}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.96,y:-4}} className="absolute right-0 top-10 z-30 min-w-44 overflow-hidden rounded-xl border border-white/10 bg-[#171526]/95 p-1 shadow-2xl backdrop-blur-xl">
    {reported ? <div className="px-3 py-3 text-center text-xs text-white/70">Thanks — this has been reported.</div>
    : reporting ? <div className="p-1">{REPORT_REASONS.map(reason=><button key={reason} type="button" onClick={()=>submitReport(reason)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/80 hover:bg-white/[.06]">{reason}</button>)}</div>
    : <><button type="button" onClick={copy} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/80 hover:bg-white/[.06]"><FiLink2/>Copy link</button><button type="button" onClick={()=>{setReporting(true);hapticTap();}} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-white/80 hover:bg-white/[.06]"><FiFlag/>Report</button></>}
  </motion.div>}</AnimatePresence></div>;
}

function useDoubleTap(action,delay=280){const last=useRef(0);return useCallback((e)=>{const now=Date.now();if(now-last.current<delay){last.current=0;action(e);}else last.current=now;},[action,delay]);}
function useTapAction(doubleAction,singleAction,delay=280){const timer=useRef(null);const action=useCallback((e)=>{if(timer.current){clearTimeout(timer.current);timer.current=null;doubleAction?.(e);return;}timer.current=setTimeout(()=>{timer.current=null;singleAction?.(e);},delay);},[doubleAction,singleAction,delay]);useEffect(()=>()=>{if(timer.current)clearTimeout(timer.current);},[delay]);return action;}
function useLongPress(action,delay=480){const timer=useRef(null);const startPoint=useRef(null);const clear=useCallback(()=>{if(timer.current){clearTimeout(timer.current);timer.current=null;}startPoint.current=null;},[]);const onPointerDown=useCallback(e=>{if(e.pointerType==='mouse'&&e.button!==0)return;clear();startPoint.current={x:e.clientX,y:e.clientY};timer.current=setTimeout(()=>{timer.current=null;action?.(e);},delay);},[action,clear,delay]);const onPointerMove=useCallback(e=>{if(!timer.current||!startPoint.current)return;const distance=Math.hypot(e.clientX-startPoint.current.x,e.clientY-startPoint.current.y);if(distance>10)clear();},[clear]);const onPointerCancel=useCallback(()=>clear(),[clear]);useEffect(()=>clear,[clear]);return {onPointerDown,onPointerMove,onPointerUp:onPointerCancel,onPointerCancel,onPointerLeave:onPointerCancel};}

function Actions({post,user,onUpdate,onComments}) {
  const [busy,setBusy]=useState('');
  const action=async name=>{if(!user)return hapticError();setBusy(name);const previous={liked:post.liked,saved:post.saved,likeCount:post.likeCount,saveCount:post.saveCount};onUpdate(post.id,name==='like'?{liked:!post.liked,likeCount:Math.max(0,post.likeCount+(post.liked?-1:1))}:{saved:!post.saved,saveCount:Math.max(0,post.saveCount+(post.saved?-1:1))});try{const r=name==='like'?await toggleLike(post.id):await toggleSave(post.id);onUpdate(post.id,r);hapticSuccess();}catch{onUpdate(post.id,previous);hapticError();}finally{setBusy('');}};
  const share=()=>{hapticTap();shareContent({title:post.title,text:post.body||post.title,url:`${window.location.origin}/feed?${post.type==='reel'?'tab=Reels&':''}notificationId=${encodeURIComponent(post.id)}`});};
  return <div className="flex items-center gap-1 pt-3"><button aria-label={post.liked?'Unlike':'Like'} disabled={busy==='like'} onClick={()=>action('like')} className={`grid h-9 w-9 place-items-center rounded-full ${post.liked?'text-[#EC2FA8]':'text-white/75'}`}><FiHeart className="h-6 w-6" fill={post.liked?'currentColor':'none'}/></button><button aria-label="Comment" onClick={onComments} className="grid h-9 w-9 place-items-center rounded-full text-white/75"><FiMessageCircle className="h-6 w-6"/></button><button aria-label="Share" onClick={share} className="grid h-9 w-9 place-items-center rounded-full text-white/75"><FiSend className="h-6 w-6"/></button><button aria-label={post.saved?'Unsave':'Save'} disabled={busy==='save'} onClick={()=>action('save')} className={`ml-auto grid h-9 w-9 place-items-center rounded-full ${post.saved?'text-white':'text-white/65'}`}><FiBookmark className="h-6 w-6" fill={post.saved?'currentColor':'none'}/></button></div>;
}

function VideoMedia({post,active=false,reel=false,onDoubleTap}) {
  const videoRef=useRef(null); const frameRef=useRef(null); const [muted,setMuted]=useState(true); const [playing,setPlaying]=useState(active); const [progress,setProgress]=useState(0); const isYoutube=Boolean(post.videoId);
  useEffect(()=>{if(!videoRef.current)return;videoRef.current.muted=muted;if(active){videoRef.current.play?.().then(()=>setPlaying(true)).catch(()=>setPlaying(false));}else{videoRef.current.pause?.();setPlaying(false);}},[active,muted]);
  useEffect(()=>{if(!isYoutube)return;const frame=frameRef.current;if(!frame)return;const send=()=>{frame.contentWindow?.postMessage(JSON.stringify({event:'command',func:active?'playVideo':'pauseVideo',args:[]}), '*');frame.contentWindow?.postMessage(JSON.stringify({event:'command',func:muted?'mute':'unMute',args:[]}), '*');};const timers=[0,350,900,1800].map(delay=>setTimeout(send,delay));setPlaying(active);return()=>timers.forEach(clearTimeout);},[active,muted,isYoutube]);
  useEffect(()=>{const v=videoRef.current;if(!v)return;const update=()=>setProgress(v.duration?Math.min(100,(v.currentTime/v.duration)*100):0);const onPlay=()=>setPlaying(true);const onPause=()=>setPlaying(false);v.addEventListener('timeupdate',update);v.addEventListener('play',onPlay);v.addEventListener('pause',onPause);return()=>{v.removeEventListener('timeupdate',update);v.removeEventListener('play',onPlay);v.removeEventListener('pause',onPause);};},[]);
  const toggleMute=()=>setMuted(v=>!v);
  const togglePlayback=useCallback((e)=>{if(e?.target?.closest?.('button'))return;const v=videoRef.current;if(!v)return;if(v.paused){v.play?.().then(()=>setPlaying(true)).catch(()=>{});}else{v.pause?.();setPlaying(false);}},[]);
  const handleTap=useTapAction(onDoubleTap,togglePlayback);
  const media = isYoutube ? <iframe ref={frameRef} className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${post.videoId}?enablejsapi=1&playsinline=1&rel=0&modestbranding=1&loop=1&playlist=${post.videoId}`} title={post.title} allow="autoplay; encrypted-media; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/> : <video ref={videoRef} src={post.mediaUrl} preload={active?'auto':'none'} autoPlay={active} muted={muted} loop playsInline controls={false} className="h-full w-full object-cover" onClick={handleTap} onTimeUpdate={e=>setProgress(e.currentTarget.duration?(e.currentTarget.currentTime/e.currentTarget.duration)*100:0)}/>;
  return <div className="relative h-full w-full" onDoubleClick={onDoubleTap}>{media}<div className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-white/10"><div className="h-full bg-white/80" style={{width:`${progress}%`}}/></div>{(reel||!isYoutube)&&<button type="button" onClick={toggleMute} className="absolute bottom-4 right-4 z-10 rounded-full bg-black/55 p-2.5 text-white backdrop-blur-xl" aria-label={muted?'Unmute video':'Mute video'}>{muted?<FiVolumeX/>:<FiVolume2/>}</button>}</div>;
}

function ZoomableImage({src,onDoubleTap}) {
  const [zoom,setZoom]=useState({scale:1,x:0,y:0});
  const pointers=useRef(new Map());
  const gesture=useRef({mode:'',startDistance:0,startScale:1,startX:0,startY:0,startMidpoint:null,lastPoint:null});
  const clampOffset=useCallback((x,y,scale)=>{
    const node=pointers.current.get('__node');
    const width=node?.clientWidth||0;
    const height=node?.clientHeight||0;
    const maxX=Math.max(0,(width*(scale-1))/2);
    const maxY=Math.max(0,(height*(scale-1))/2);
    return {x:Math.max(-maxX,Math.min(maxX,x)),y:Math.max(-maxY,Math.min(maxY,y))};
  },[]);
  const distanceAndMidpoint=()=>{
    const pts=[...pointers.current.entries()].filter(([key])=>key!=='__node').map(([,p])=>p);
    if(pts.length<2)return null;
    const [a,b]=pts; return {distance:Math.hypot(b.x-a.x,b.y-a.y),midpoint:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};
  };
  const onPointerDown=e=>{
    if(e.pointerType!=='touch')return;
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    pointers.current.set('__node',e.currentTarget);
    if(pointers.current.size-1===2){
      const g=distanceAndMidpoint();
      gesture.current={mode:'pinch',startDistance:g.distance,startScale:zoom.scale,startX:zoom.x,startY:zoom.y,startMidpoint:g.midpoint,lastPoint:null};
      e.preventDefault();
    }else if(pointers.current.size-1===1&&zoom.scale>1){
      gesture.current={...gesture.current,mode:'pan',lastPoint:{x:e.clientX,y:e.clientY},startX:zoom.x,startY:zoom.y};
    }
  };
  const onPointerMove=e=>{
    if(e.pointerType!=='touch'||!pointers.current.has(e.pointerId))return;
    pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const g=gesture.current;
    if((pointers.current.size-1)>=2&&g.mode==='pinch'){
      const next=distanceAndMidpoint(); if(!next)return;
      const scale=Math.max(1,Math.min(4,g.startScale*(next.distance/Math.max(1,g.startDistance))));
      const deltaX=next.midpoint.x-g.startMidpoint.x; const deltaY=next.midpoint.y-g.startMidpoint.y;
      const offset=clampOffset(g.startX+deltaX,g.startY+deltaY,scale);
      setZoom({scale,...offset}); e.preventDefault();
    }else if((pointers.current.size-1)===1&&g.mode==='pan'&&zoom.scale>1){
      const point=pointers.current.get(e.pointerId); const dx=point.x-g.lastPoint.x; const dy=point.y-g.lastPoint.y;
      const offset=clampOffset(zoom.x+dx,zoom.y+dy,zoom.scale); setZoom(v=>({...v,...offset})); gesture.current.lastPoint=point; e.preventDefault();
    }
  };
  const endPointer=e=>{
    if(e.pointerType!=='touch')return;
    pointers.current.delete(e.pointerId);
    if(pointers.current.size-1===0)gesture.current.mode='';
    else if(pointers.current.size-1===1){
      const point=[...pointers.current.values()][0]; if(point&&zoom.scale>1)gesture.current={...gesture.current,mode:'pan',lastPoint:point,startX:zoom.x,startY:zoom.y};
    }
    if(zoom.scale<=1.02)setZoom({scale:1,x:0,y:0});
  };
  const onWheel=e=>{if(!e.ctrlKey)return;e.preventDefault();const scale=Math.max(1,Math.min(4,zoom.scale-(e.deltaY*.01)));const offset=clampOffset(zoom.x,zoom.y,scale);setZoom({scale,...offset});};
  return <div className="h-full w-full overflow-hidden" style={{touchAction:'pan-y'}} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endPointer} onPointerCancel={endPointer} onWheel={onWheel} onDoubleClick={onDoubleTap}><img src={src} alt="" draggable={false} className="h-full w-full select-none object-cover" style={{transform:`translate3d(${zoom.x}px,${zoom.y}px,0) scale(${zoom.scale})`,transformOrigin:'center center',transition:gesture.current.mode?'none':'transform 120ms ease-out'}} loading="lazy" decoding="async"/></div>;
}

function MediaPreview({src,type,title,onClose}) {
  useEffect(()=>{const onKey=e=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[onClose]);
  return <AnimatePresence><motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-3 backdrop-blur-md" onClick={onClose}><motion.div initial={{scale:.94,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:.96,opacity:0}} transition={{duration:.16}} className="relative flex max-h-[92dvh] max-w-5xl items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl" onClick={e=>e.stopPropagation()}><button type="button" onClick={onClose} aria-label="Close preview" className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/65 text-white backdrop-blur-xl"><FiX/></button>{type==='video'?<video src={src} title={title||'Feed preview'} controls autoPlay playsInline className="max-h-[92dvh] max-w-full object-contain"/>:<img src={src} alt={title||''} className="max-h-[92dvh] max-w-full object-contain" loading="lazy" decoding="async"/>}</motion.div></motion.div></AnimatePresence>;
}

function PostCard({post,user,onUpdate,notificationId}) {
  const [comments,setComments]=useState(false); const [followBusy,setFollowBusy]=useState(false); const [heart,setHeart]=useState(false); const [videoActive,setVideoActive]=useState(false); const [previewOpen,setPreviewOpen]=useState(false); const ref=useRef(null); const target=String(post.id)===String(notificationId); const showViews=post.isOwner&&canViewPostInsights(user);
  const label=post.sourceType==='sermon'?'Teaching':post.sourceType==='devotional'?'Devotional':post.sourceType==='testimony'?'Testimony':'Post';
  const like=useCallback(async()=>{if(!user)return hapticError();if(post.liked)return;setHeart(true);setTimeout(()=>setHeart(false),650);onUpdate(post.id,{liked:true,likeCount:post.likeCount+1});try{const r=await toggleLike(post.id);onUpdate(post.id,r);}catch{onUpdate(post.id,{liked:false,likeCount:Math.max(0,post.likeCount)});hapticError();}},[post,user,onUpdate]);
  const doubleTap=useDoubleTap(like);
  const follow=async()=>{if(!user||!post.authorEmail||post.isOwner||followBusy)return;setFollowBusy(true);const next=!post.following;onUpdate(post.id,{following:next});try{const r=await toggleFollow(post.authorEmail);onUpdate(post.id,r);hapticSuccess();}catch{onUpdate(post.id,{following:!next});hapticError();}finally{setFollowBusy(false);}};
  const previewSource=post.mediaUrl||post.image||'';
  const previewType=post.mediaType==='video'?'video':'image';
  const longPress=useLongPress(()=>{if(previewSource)setPreviewOpen(true);});
  useEffect(()=>{const node=ref.current;if(!node||!((post.mediaType==='video'&&post.mediaUrl)||post.videoId))return;const obs=new IntersectionObserver(([e])=>setVideoActive(Boolean(e?.isIntersecting&&e.intersectionRatio>=.6)),{threshold:[.6]});obs.observe(node);return()=>obs.disconnect();},[post.mediaType,post.mediaUrl,post.videoId]);
  useEffect(()=>{const node=ref.current;if(!node||!post.isUserPost||!user)return;let recorded=false;const obs=new IntersectionObserver(([e])=>{if(e?.isIntersecting&&e.intersectionRatio>=.6&&!recorded){recorded=true;recordFeedView(post.id).catch(()=>{});}}, {threshold:[.6]});obs.observe(node);return()=>obs.disconnect();},[post.id,post.isUserPost,user]);
  return <article ref={ref} id={`feed-${post.id}`} className={`overflow-hidden border-y border-white/[.07] bg-[#0d0c18] sm:rounded-2xl sm:border sm:shadow-[0_10px_30px_rgba(0,0,0,.18)] ${target?'ring-2 ring-white/50':''}`}><div className="flex items-center justify-between px-4 py-3"><div className="flex min-w-0 items-center gap-2.5"><div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white/[.07]">{post.avatarUrl?<img src={post.avatarUrl} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async"/>:<img src="/logo.png" alt="" className="h-full w-full object-cover"/>}</div><div className="flex min-w-0 items-center gap-2"><div className="flex min-w-0 items-baseline gap-2"><p className="max-w-[15rem] truncate text-sm font-bold">{post.author}{post.isOfficial&&<span className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-[9px] text-ink-950" aria-label="Official ministry">✓</span>}</p><span className="shrink-0 text-[10px] text-white/35">{post.time}</span></div>{post.isUserPost&&!post.isOwner&&post.authorEmail&&<button type="button" onClick={follow} disabled={followBusy} className="shrink-0 text-[10px] font-bold text-white/70 hover:text-white disabled:opacity-40">{post.following?'Following':'Follow'}</button>}</div></div><ActionMenu post={post}/></div>{post.mediaUrl&&post.mediaType==='video'?<div className="relative aspect-video bg-black" {...longPress}><VideoMedia post={post} active={videoActive} onDoubleTap={doubleTap}/></div>:post.videoId?<div className="aspect-video bg-black" onDoubleClick={doubleTap}><VideoMedia post={post} active={videoActive} onDoubleTap={doubleTap}/></div>:post.mediaUrl||post.image?<div className="relative aspect-video overflow-hidden bg-black" {...longPress}><ZoomableImage src={previewSource} onDoubleTap={doubleTap}/><AnimatePresence>{heart&&<motion.div initial={{opacity:0,scale:.4}} animate={{opacity:1,scale:1}} exit={{opacity:0,scale:1.25}} className="pointer-events-none absolute inset-0 grid place-items-center"><FiHeart className="h-24 w-24 text-white drop-shadow-2xl" fill="currentColor"/></motion.div>}</AnimatePresence></div>:null}<div className="px-4 pb-4 pt-2"><span className="rounded-full bg-white/[.06] px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-white/45">{label}</span><p className="mt-2 text-sm leading-6"><b>{post.author}</b>{post.body&&<> <span className="text-white/70">{post.body}</span></>}</p><Actions post={post} user={user} onUpdate={onUpdate} onComments={()=>setComments(true)}/>{post.likeCount>0&&<p className="mt-1.5 text-xs font-semibold text-white/85">{formatLikeLine(post)}</p>}<p className="mt-1 text-xs text-white/55">{post.commentCount} comments · {post.saveCount} saves{showViews?` · ${post.viewCount} views`:''}</p></div><Comments post={post} user={user} onUpdate={onUpdate} open={comments} onClose={()=>setComments(false)}/>{previewOpen&&<MediaPreview src={previewSource} type={previewType} title={post.title} onClose={()=>setPreviewOpen(false)}/>}</article>;
}

function ReelCard({post,user,onUpdate,active,notificationId}) {
  const [comments,setComments]=useState(false); const [heart,setHeart]=useState(false); const [busyAction,setBusyAction]=useState(''); const actionBusy=useRef(false); const showViews=post.isOwner&&canViewPostInsights(user);
  const runAction=useCallback(async(name,request,optimistic,rollback)=>{if(!user)return hapticError();if(actionBusy.current)return;actionBusy.current=true;setBusyAction(name);const previous={liked:post.liked,saved:post.saved,likeCount:post.likeCount,saveCount:post.saveCount};onUpdate(post.id,optimistic());try{const r=await request();onUpdate(post.id,r);hapticSuccess();}catch{onUpdate(post.id,rollback(previous));hapticError();}finally{actionBusy.current=false;setBusyAction('');}},[user,post,onUpdate]);
  const like=useCallback(()=>runAction('like',()=>toggleLike(post.id),()=>{const wasLiked=post.liked;setHeart(!wasLiked);setTimeout(()=>setHeart(false),650);return {liked:!wasLiked,likeCount:Math.max(0,post.likeCount+(wasLiked?-1:1))};},previous=>({liked:previous.liked,likeCount:previous.likeCount})),[runAction,post]);
  const save=useCallback(()=>runAction('save',()=>toggleSave(post.id),()=>({saved:!post.saved,saveCount:Math.max(0,post.saveCount+(post.saved?-1:1))}),previous=>({saved:previous.saved,saveCount:previous.saveCount})),[runAction,post]);
  const share=()=>shareContent({title:post.title,text:post.body||post.title,url:`${window.location.origin}/feed?tab=Reels&notificationId=${encodeURIComponent(post.id)}`});
  useEffect(()=>{if(!active||!post.isUserPost||!user)return;recordFeedView(post.id).catch(()=>{});},[active,post.id,post.isUserPost,user]);
  const doubleTap=useDoubleTap(like);
  return <article id={`feed-${post.id}`} className={`relative h-full min-h-[540px] snap-start overflow-hidden bg-black ${String(post.id)===String(notificationId)?'ring-2 ring-white':''}`}><div className="absolute inset-0" onDoubleClick={doubleTap}><VideoMedia post={post} active={active} reel onDoubleTap={doubleTap}/></div><AnimatePresence>{heart&&<motion.div initial={{opacity:0,scale:.4}} animate={{opacity:1,scale:1.1}} exit={{opacity:0,scale:1.35}} className="pointer-events-none absolute inset-0 z-20 grid place-items-center"><FiHeart className="h-28 w-28 text-white drop-shadow-2xl" fill="currentColor"/></motion.div>}</AnimatePresence><div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-black/90"/><div className="absolute bottom-0 left-0 right-0 z-10 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"><div className="flex items-end gap-5"><div className="min-w-0 flex-1"><p className="text-sm font-bold">{post.author}</p><h2 className="mt-2 text-lg font-bold">{post.title}</h2>{post.body&&<p className="mt-1 line-clamp-2 text-sm text-white/75">{post.body}</p>}{showViews&&<p className="mt-2 text-xs text-white/50">{post.viewCount} views</p>}</div><div className="mr-2 flex flex-col items-center gap-3">{[[post.liked,FiHeart,like,post.likeCount,post.liked?'Unlike':'Like',post.liked],[false,FiMessageCircle,()=>setComments(true),post.commentCount,'Comment',false],[false,FiShare2,share,null,'Share',false],[post.saved,FiBookmark,save,null,post.saved?'Unsave':'Save',false]].map(([on,Icon,fn,count,label,tinted])=><button key={label} type="button" onClick={fn} disabled={busyAction!==''} aria-label={label} className={`grid min-w-10 place-items-center rounded-full bg-black/35 p-2.5 backdrop-blur-md transition hover:bg-black/55 disabled:opacity-50 ${tinted?'text-[#EC2FA8]':'text-white'}`}><Icon className="h-6 w-6" fill={on?'currentColor':'none'}/>{count!=null&&<span className="text-[10px]">{count}</span>}</button>)}</div></div></div><Comments post={post} user={user} onUpdate={onUpdate} open={comments} onClose={()=>setComments(false)}/></article>;
}

function Reels({posts,user,onUpdate,notificationId}) {
  const ref=useRef(null); const [active,setActive]=useState(String(posts[0]?.id||''));
  const scrollToReel=useCallback((direction)=>{const root=ref.current;if(!root)return;const cards=[...root.querySelectorAll('[data-reel]')];if(!cards.length)return;const current=cards.findIndex(card=>card.dataset.reel===String(active));const next=Math.max(0,Math.min(cards.length-1,current+(direction==='next'?1:-1)));cards[next]?.scrollIntoView({block:'start',behavior:'smooth'});},[active]);
  useEffect(()=>{const root=ref.current;if(!root)return;const cards=[...root.querySelectorAll('[data-reel]')];const obs=new IntersectionObserver(entries=>{const e=entries.filter(x=>x.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];if(e)setActive(e.target.dataset.reel);},{root,threshold:.6});cards.forEach(c=>obs.observe(c));return()=>obs.disconnect();},[posts.length]);
  useEffect(()=>{if(!notificationId)return;const node=rootElement(ref.current,`[data-reel=\"${CSS.escape(notificationId)}\"]`);if(node)setTimeout(()=>node.scrollIntoView({block:'start',behavior:'instant'}),80);},[notificationId,posts.length]);
  useEffect(()=>{const onKeyDown=e=>{if(e.defaultPrevented||e.metaKey||e.ctrlKey||e.altKey)return;const tag=String(e.target?.tagName||'').toLowerCase();if(tag==='input'||tag==='textarea'||tag==='select'||e.target?.isContentEditable)return;if(e.key==='ArrowDown'||e.key==='PageDown'){e.preventDefault();scrollToReel('next');}else if(e.key==='ArrowUp'||e.key==='PageUp'){e.preventDefault();scrollToReel('prev');}};window.addEventListener('keydown',onKeyDown);return()=>window.removeEventListener('keydown',onKeyDown);},[scrollToReel]);
  return <div ref={ref} className="h-[calc(100dvh-8.5rem)] snap-y snap-mandatory overflow-y-auto" style={{scrollbarWidth:'none'}}>{posts.map(p=><div key={p.id} data-reel={p.id} className="h-[calc(100dvh-8.5rem)]"><ReelCard post={p} user={user} onUpdate={onUpdate} active={active===String(p.id)} notificationId={notificationId}/></div>)}</div>;
}
function rootElement(root,selector){try{return root?.querySelector(selector)||null;}catch{return null;}}

function Comments({post,user,onUpdate,open,onClose}) {
  const [items,setItems]=useState([]); const [text,setText]=useState(''); const [loading,setLoading]=useState(false); const [removingId,setRemovingId]=useState(''); const listRef=useRef(null);
  useEffect(()=>{if(!open)return;setLoading(true);fetchComments(post.id).then(setItems).catch(()=>setItems([])).finally(()=>setLoading(false));},[open,post.id]);
  useEffect(()=>{if(open&&listRef.current)listRef.current.scrollTop=listRef.current.scrollHeight;},[open,items.length]);
  const submit=async e=>{e.preventDefault();if(!user||!text.trim())return;const body=text.trim();setText('');try{const created=await addComment(post.id,body);setItems(v=>[...v,created]);onUpdate(post.id,{commentCount:post.commentCount+1});hapticSuccess();}catch{hapticError();}};
  const remove=async(commentId)=>{setRemovingId(commentId);try{await deleteComment(post.id,commentId);setItems(v=>v.filter(c=>c.id!==commentId));onUpdate(post.id,{commentCount:Math.max(0,post.commentCount-1)});hapticSuccess();}catch{hapticError();}finally{setRemovingId('');}};
  if(!open)return null;
  return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-0 sm:p-6" onClick={onClose}><motion.div initial={{y:'100%'}} animate={{y:0}} onClick={e=>e.stopPropagation()} className="flex h-[78dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-[#12111f] shadow-2xl sm:rounded-[28px]"><div className="flex justify-center pt-3"><span className="h-1 w-12 rounded-full bg-white/20"/></div><div className="flex items-center justify-between border-b border-white/10 px-4 py-3"><h3 className="font-bold">Comments</h3><button type="button" onClick={onClose} aria-label="Close comments" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/[.06]"><FiX/></button></div><div ref={listRef} className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">{loading?<div className="flex items-center justify-center py-10 text-white/50"><FiLoader className="animate-spin"/></div>:items.length?items.map(c=><div key={c.id} className="flex items-start gap-3"><div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-white/[.08]"><img src={c.avatarUrl||'/logo.png'} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async"/></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{c.author}</p><p className="text-sm text-white/70">{c.body}</p></div>{user&&c.user_email&&c.user_email.toLowerCase()===user.email?.toLowerCase()&&<button type="button" onClick={()=>remove(c.id)} disabled={removingId===c.id} aria-label="Delete comment" className="shrink-0 rounded-full p-1.5 text-white/30 hover:bg-white/[.06] hover:text-red-300 disabled:opacity-40"><FiTrash2 className="h-3.5 w-3.5"/></button>}</div>):<EmptyState title="No comments yet" description="Be the first to add a comment."/>}</div>{user&&<form onSubmit={submit} className="flex gap-2 border-t border-white/10 p-3"><input value={text} onChange={e=>setText(e.target.value)} placeholder="Add a comment..." className="min-w-0 flex-1 rounded-full bg-white/[.06] px-4 py-3 text-sm outline-none"/><button className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black">Post</button></form>}</motion.div></div>;
}

export default function Feed(){
  const [params]=useSearchParams(); const notificationId=params.get('notificationId')||''; const messagesOpen=params.get('messages')==='1'; const requestedTab=params.get('tab');
  const {user}=useAuth(); const online=useOnlineStatus(); const [tab,setTab]=useState(tabs.includes(requestedTab)?requestedTab:'All'); const [posts,setPosts]=useState([]); const [loading,setLoading]=useState(true); const [loadingMore,setLoadingMore]=useState(false); const [hasMore,setHasMore]=useState(true); const [error,setError]=useState(''); const [newPosts,setNewPosts]=useState(0); const sentinel=useRef(null); const pendingUpdates=useRef([]); const updateFrame=useRef(0);
  const scrollKey=`feed-scroll:${tab}`;
  const update=useCallback((id,patch)=>{pendingUpdates.current.push({id,patch});if(updateFrame.current)return;updateFrame.current=requestAnimationFrame(()=>{updateFrame.current=0;const queued=pendingUpdates.current;pendingUpdates.current=[];setPosts(v=>{let next=v;for(const item of queued){next=next.map(p=>String(p.id)===String(item.id)?{...p,...item.patch,likeCount:Number(item.patch.likeCount??p.likeCount),commentCount:Number(item.patch.commentCount??p.commentCount),saveCount:Number(item.patch.saveCount??p.saveCount),viewCount:Number(item.patch.viewCount??p.viewCount)}:p);}return next;});});},[]);
  useEffect(()=>()=>cancelAnimationFrame(updateFrame.current),[]);
  const loadFirst=useCallback(async({silent=false}={})=>{if(!silent)setLoading(true);setError('');try{const result=await fetchFeed({limit:PAGE_SIZE,offset:0,followingOnly:tab==='Following'});const normalized=result.posts.map(normalize);if(silent){setPosts(current=>{const currentIds=new Set(current.map(p=>String(p.id)));const incoming=normalized.filter(p=>!currentIds.has(String(p.id)));if(incoming.length)setNewPosts(v=>v+incoming.length);return incoming.length?[...incoming,...current]:current;});}else{setPosts(normalized);setHasMore(result.hasMore);if(tab==='All')writeCachedFeed(normalized);}}catch(e){if(!silent)setError(e?.message||'Unable to load the Feed.');}finally{if(!silent)setLoading(false);}},[tab]);
  const loadMore=useCallback(async()=>{if(loading||loadingMore||!hasMore||messagesOpen)return;setLoadingMore(true);try{const result=await fetchFeed({limit:PAGE_SIZE,offset:posts.length,followingOnly:tab==='Following'});const more=result.posts.map((p,i)=>normalize(p,posts.length+i));setPosts(v=>{const ids=new Set(v.map(x=>String(x.id)));return [...v,...more.filter(x=>!ids.has(String(x.id)))];});setHasMore(result.hasMore);}catch{}finally{setLoadingMore(false);}},[loading,loadingMore,hasMore,messagesOpen,posts.length,tab]);
  useEffect(()=>{if(messagesOpen)return;if(tab==='All'){const cached=readCachedFeed();if(cached.length){setPosts(cached.map(normalize));setLoading(false);}loadFirst({silent:Boolean(cached.length)});}else{setPosts([]);setHasMore(true);loadFirst();}},[loadFirst,messagesOpen,tab]);
  useEffect(()=>{if(messagesOpen)return;const id=setInterval(()=>{if(document.visibilityState==='visible')loadFirst({silent:true});},45000);return()=>clearInterval(id);},[loadFirst,messagesOpen]);
  useEffect(()=>{const node=sentinel.current;if(!node)return;const obs=new IntersectionObserver(([entry])=>{if(entry.isIntersecting)loadMore();},{rootMargin:'500px'});obs.observe(node);return()=>obs.disconnect();},[loadMore]);
  useEffect(()=>{if(messagesOpen||!notificationId||loading)return;const node=document.getElementById(`feed-${notificationId}`);if(node)setTimeout(()=>node.scrollIntoView({block:'center',behavior:'smooth'}),120);},[messagesOpen,notificationId,loading,posts.length,tab]);
  useEffect(()=>{const next=tabs.find(t=>t.toLowerCase()===String(requestedTab||'').toLowerCase());if(next)setTab(next);},[requestedTab]);
  useEffect(()=>{if(messagesOpen||notificationId)return;let frame=0;const save=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{try{sessionStorage.setItem(scrollKey,String(window.scrollY));}catch{}});};const persist=()=>{try{sessionStorage.setItem(scrollKey,String(window.scrollY));}catch{}};window.addEventListener('scroll',save,{passive:true});window.addEventListener('pagehide',persist);return()=>{window.removeEventListener('scroll',save);window.removeEventListener('pagehide',persist);cancelAnimationFrame(frame);persist();};},[messagesOpen,notificationId,scrollKey]);
  useEffect(()=>{if(messagesOpen||notificationId||loading||!posts.length)return;let frame=0;try{const saved=Number(sessionStorage.getItem(scrollKey));if(!Number.isFinite(saved)||saved<1)return;frame=requestAnimationFrame(()=>{requestAnimationFrame(()=>window.scrollTo({top:saved,behavior:'instant'}));});}catch{}return()=>cancelAnimationFrame(frame);},[messagesOpen,notificationId,loading,posts.length,scrollKey]);
  const {pullDistance,refreshing,bind}=usePullToRefresh(async()=>{hapticTap();await loadFirst();hapticSuccess();});
  const filtered=useMemo(()=>tab==='Reels'?posts.filter(p=>p.type==='reel'&&(p.videoId||(p.mediaUrl&&p.mediaType==='video'))):tab==='Following'?posts.filter(p=>p.following===true):tab==='Ministry'?posts.filter(p=>['sermon','devotional','testimony'].includes(String(p.sourceType||'').toLowerCase())||p.isOfficial):posts,[tab,posts]);
  if(messagesOpen)return <Messages/>;
  return <main {...bind} className="min-h-screen bg-[#090812] pb-24 text-white"><div className="sticky top-0 z-40 border-b border-white/[.06] bg-[#090812]/90 px-4 py-3 backdrop-blur-xl"><div className="mx-auto flex max-w-2xl items-center justify-between"><Link to="/dashboard" className="h-9 w-9 overflow-hidden rounded-full bg-white/[.07]" aria-label="Profile"><img src={user?.avatar_url||user?.avatarUrl||'/logo.png'} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async"/></Link><div className="flex items-center gap-2"><Link to="/feed?messages=1" aria-label="Open messages" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/[.06]"><FiMessageCircle/></Link><Link to="/create" className="hidden rounded-full bg-white px-4 py-2 text-xs font-bold text-black sm:inline-flex">Create</Link></div></div></div><div className="mx-auto max-w-2xl"><StoriesRow/><div className="sticky top-[61px] z-30 border-b border-white/[.06] bg-[#090812]/90 px-4 backdrop-blur-xl"><div className="flex gap-5 overflow-x-auto py-3">{tabs.map(t=><button key={t} type="button" onClick={()=>setTab(t)} className={`relative whitespace-nowrap pb-1.5 text-xs font-bold ${tab===t?'text-white':'text-white/40'}`}>{t}{tab===t&&<motion.span layoutId="feed-tab-indicator" className="absolute -bottom-[1px] left-1/2 h-[3px] w-5 -translate-x-1/2 rounded-full bg-white" transition={{type:'spring',stiffness:500,damping:35}}/>}</button>)}</div></div>{newPosts>0&&<button type="button" onClick={()=>{setNewPosts(0);window.scrollTo({top:0,behavior:'smooth'});loadFirst();}} className="sticky top-[104px] z-20 mx-auto mt-3 block rounded-full bg-white px-4 py-2 text-xs font-bold text-black">{newPosts} new post{newPosts===1?'':'s'}</button>}{error&&<div className="m-4 rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200"><div className="flex items-center gap-2"><FiAlertCircle/>{error}</div></div>}{!online&&<div className="m-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] p-3 text-xs text-white/60"><FiWifiOff/>You're offline. Showing cached content when available.</div>}{loading&&!posts.length?<div className="space-y-4 p-4"><Skeleton className="h-72 w-full"/><Skeleton className="h-72 w-full"/></div>:filtered.length?<>{tab==='Reels'?<Reels posts={filtered} user={user} onUpdate={update} notificationId={notificationId}/>:<div className="space-y-4">{filtered.map(p=><PostCard key={p.id} post={p} user={user} onUpdate={update} notificationId={notificationId}/>)}</div>}<div ref={sentinel} className="flex justify-center py-8">{loadingMore&&<FiLoader className="animate-spin text-white/40"/>}</div></>:<EmptyState title="Nothing here yet" description="New ministry posts and updates will appear in your Feed."/>}</div></main>;
}

function normalize(post,index=0){return {...post,id:post.id??`post-${index}`,type:post.type||'post',title:post.title||post.body||'Untitled',body:post.body||'',author:post.author||'BLW Kenya Zone',authorEmail:post.authorEmail||post.author_email||post.user_email||'',avatarUrl:post.avatarUrl||post.avatar_url||'',time:post.time||'',likeCount:Number(post.likeCount??post.like_count??0),commentCount:Number(post.commentCount??post.comment_count??0),saveCount:Number(post.saveCount??post.save_count??0),viewCount:Number(post.viewCount??post.view_count??0),isOwner:Boolean(post.isOwner??post.is_owner),liked:Boolean(post.liked),saved:Boolean(post.saved),following:post.following===true||post.following==='true',isOfficial:Boolean(post.isOfficial??post.is_official),sourceType:post.sourceType||post.source_type||'',isUserPost:Boolean(post.isUserPost??post.is_user_post),recentLikers:Array.isArray(post.recentLikers)?post.recentLikers:Array.isArray(post.recent_likers)?post.recent_likers:[]};
}
