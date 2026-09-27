import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiBookmark, FiCheck, FiFolder, FiHeart, FiMessageCircle, FiPlus, FiSend, FiTrash2 } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { addComment, deleteComment, fetchComments, fetchPost, toggleLike, toggleSave } from '../utils/feed';
import { shareContent } from '../utils/share';

function timeLabel(value) {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [post,setPost]=useState(null);
  const [comments,setComments]=useState([]);
  const [body,setBody]=useState('');
  const [loading,setLoading]=useState(true);
  const [commentLoading,setCommentLoading]=useState(true);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState('');
  const [collectionData,setCollectionData]=useState({collections:[],memberships:{}});
  const [loadedStorageKey,setLoadedStorageKey]=useState('');
  const [showCollections,setShowCollections]=useState(false);
  const collectionStorageKey=`emet-bookmark-collections:${String(user?.email||'guest').toLowerCase()}`;
  useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(collectionStorageKey)||'{}');setCollectionData({collections:Array.isArray(saved.collections)?saved.collections:[],memberships:saved.memberships&&typeof saved.memberships==='object'?saved.memberships:{}});}catch{setCollectionData({collections:[],memberships:{}});}setLoadedStorageKey(collectionStorageKey);},[collectionStorageKey]);
  useEffect(()=>{if(loadedStorageKey!==collectionStorageKey)return;try{localStorage.setItem(collectionStorageKey,JSON.stringify(collectionData));}catch{}},[collectionData,collectionStorageKey,loadedStorageKey]);
  const toggleCollection=(collectionId)=>setCollectionData(current=>{const key=String(id);const ids=current.memberships[key]||[];const next=ids.includes(collectionId)?ids.filter(item=>item!==collectionId):[...ids,collectionId];return{...current,memberships:{...current.memberships,[key]:next}};});
  const postCollections=collectionData.memberships[String(id)]||[];

  const load=async()=>{
    setLoading(true); setError('');
    try {
      const [item,replies]=await Promise.all([fetchPost(id),fetchComments(id)]);
      setPost(item); setComments(replies);
    } catch(e) { setError(e?.message || 'Unable to load this post.'); }
    finally { setLoading(false); setCommentLoading(false); }
  };
  useEffect(()=>{ load(); },[id]);

  const updateAction=async(action)=>{
    if(!user){navigate('/auth');return;}
    const previous=post;
    setPost(p=>p?{...p,[action==='like'?'liked':'saved']:!(action==='like'?p.liked:p.saved),[action==='like'?'likeCount':'saveCount']:Math.max(0,(action==='like'?p.likeCount:p.saveCount)+((action==='like'?p.liked:p.saved)?-1:1))}:p);
    try {
      const result=action==='like'?await toggleLike(id):await toggleSave(id);
      setPost(p=>p?{...p,...result}:p);
    } catch(e) { setPost(previous); setError(e?.message || 'Unable to update this post.'); }
  };

  const submit=async(e)=>{
    e.preventDefault();
    if(!user){navigate('/auth');return;}
    const text=body.trim(); if(!text || sending)return;
    setSending(true); setError('');
    try {
      const comment=await addComment(id,text);
      if(comment) setComments(items=>[...items,comment]);
      setBody('');
      setPost(p=>p?{...p,commentCount:Number(p.commentCount||0)+1}:p);
    } catch(e) { setError(e?.message || 'Unable to add reply.'); }
    finally { setSending(false); }
  };

  const removeComment=async(comment)=>{
    if(!comment?.id)return;
    try { await deleteComment(id,comment.id); setComments(items=>items.filter(item=>String(item.id)!==String(comment.id))); setPost(p=>p?{...p,commentCount:Math.max(0,Number(p.commentCount||0)-1)}:p); }
    catch(e){setError(e?.message || 'Unable to delete reply.');}
  };

  if(loading) return <main className="mx-auto min-h-[70vh] max-w-2xl px-4 py-8 text-white"><div className="animate-pulse space-y-4"><div className="h-6 w-28 rounded bg-white/10"/><div className="h-56 rounded-2xl bg-white/5"/><div className="h-20 rounded-2xl bg-white/5"/></div></main>;
  if(error && !post) return <main className="mx-auto grid min-h-[70vh] max-w-2xl place-items-center px-6 text-center text-white"><div><p className="text-sm font-semibold">{error}</p><button onClick={()=>navigate(-1)} className="mt-4 rounded-xl bg-white px-4 py-2 text-xs font-semibold text-[#0B0F14] hover:bg-white/90">Go back</button></div></main>;

  return <main className="mx-auto min-h-screen w-full max-w-[1180px] px-3 pb-28 text-white sm:px-5 xl:px-7">
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
    <div className="min-w-0">
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/[.07] bg-[#0B0F14]/90 px-4 py-3 backdrop-blur-xl">
      <button onClick={()=>navigate(-1)} className="grid h-9 w-9 place-items-center rounded-xl hover:bg-white/[.06]" aria-label="Back"><FiArrowLeft/></button>
      <div><h1 className="text-sm font-bold">Post</h1><p className="text-[11px] text-white/35">{post?.commentCount||0} {Number(post?.commentCount||0)===1?'reply':'replies'}</p></div>
    </header>
    <article className="border-b border-white/[.07] px-4 py-5 sm:px-6">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 text-sm font-bold">{post.avatarUrl?<img src={post.avatarUrl} alt="" className="h-full w-full object-cover"/>:(post.author||'E').slice(0,1).toUpperCase()}</div>
        <div className="min-w-0"><p className="truncate text-sm font-bold">{post.author||'Emet member'}</p><p className="text-xs text-white/35">{timeLabel(post.created_at||post.createdAt||'')}</p></div>
      </div>
      {post.title&&<h2 className="mt-5 text-xl font-bold">{post.title}</h2>}
      {post.body&&<p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-white/80">{post.body}</p>}
      {post.mediaUrl&&<img src={post.mediaUrl} alt="" className="mt-5 max-h-[70vh] w-full rounded-2xl object-contain bg-black"/>}
      {post.videoId&&<div className="mt-5 aspect-video overflow-hidden rounded-2xl bg-black"><iframe className="h-full w-full" src={'https://www.youtube-nocookie.com/embed/'+post.videoId+'?rel=0&modestbranding=1'} title={post.title||'Video'} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen/></div>}
      <div className="mt-4 flex items-center gap-1 border-t border-white/[.06] pt-3">
        <button onClick={()=>updateAction('like')} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${post.liked?'text-pink-400':'text-white/55 hover:bg-white/[.05]'}`}><FiHeart fill={post.liked?'currentColor':'none'}/>{post.likeCount||0}</button>
        <button onClick={()=>document.getElementById('reply-box')?.focus()} className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-white/55 hover:bg-white/[.05]"><FiMessageCircle/>{post.commentCount||0}</button>
        <button onClick={()=>updateAction('save')} className={`ml-auto grid h-9 w-9 place-items-center rounded-xl ${post.saved?'text-white':'text-white/55 hover:bg-white/[.05]'}`} aria-label={post.saved?'Remove bookmark':'Bookmark'}><FiBookmark fill={post.saved?'currentColor':'none'}/></button>
        <button onClick={()=>shareContent({title:post.title||'Post on Emet',text:post.body||post.title,url:window.location.href})} className="grid h-9 w-9 place-items-center rounded-xl text-white/55 hover:bg-white/[.05]" aria-label="Share"><FiSend/></button>
      </div>
    </article>
    <section className="px-4 py-5 sm:px-6">
      <h2 className="text-sm font-bold">Replies</h2>
      {error&&post&&<p className="mt-2 text-xs text-red-300">{error}</p>}
      <form onSubmit={submit} className="mt-4 flex gap-2">
        <input id="reply-box" value={body} onChange={e=>setBody(e.target.value)} maxLength={1000} placeholder={user?'Reply to this post':'Sign in to reply'} className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[.04] px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/20"/>
        <button disabled={sending||!body.trim()} className="rounded-xl bg-white px-4 py-3 text-xs font-bold text-[#0B0F14] disabled:opacity-40">{sending?'Sending…':'Reply'}</button>
      </form>
      <div className="mt-5 space-y-3">
        {commentLoading?<p className="text-xs text-white/35">Loading replies…</p>:comments.length?comments.map(comment=><div key={comment.id||comment.clientId} className="rounded-2xl border border-white/[.07] bg-white/[.025] p-4"><div className="flex items-start gap-3"><div className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-white/10 text-[10px] font-bold">{comment.avatarUrl?<img src={comment.avatarUrl} alt="" className="h-full w-full object-cover"/>:(comment.author_name||comment.author||'E').slice(0,1).toUpperCase()}</div><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><p className="text-xs font-bold">{comment.author_name||comment.author||'Emet member'}</p>{user?.email?.toLowerCase()===(comment.user_email||'').toLowerCase()&&comment.id&&<button onClick={()=>removeComment(comment)} className="text-white/30 hover:text-red-300" aria-label="Delete reply"><FiTrash2/></button>}</div><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-white/70">{comment.body}</p></div></div></div>):<div className="rounded-2xl border border-dashed border-white/10 py-10 text-center"><p className="text-sm text-white/45">No replies yet.</p><p className="mt-1 text-xs text-white/25">Start the conversation.</p></div>}
      </div>
    </section>
    </div>
    <aside className="space-y-3">
      <section className="rounded-2xl border border-[#17386f]/70 bg-[#031126]/95 p-4">
        <div className="flex items-center justify-between"><h2 className="text-sm font-bold">Saved to Collections</h2><button onClick={()=>navigate('/bookmarks')} className="text-[10px] font-semibold text-cyan-300">Manage</button></div>
        <p className="mt-1 text-[11px] text-white/45">This post is saved in {postCollections.length} {postCollections.length===1?'collection':'collections'}.</p>
        {postCollections.length>0&&<div className="mt-3 space-y-2">{collectionData.collections.filter(collection=>postCollections.includes(collection.id)).map(collection=><div key={collection.id} className="flex items-center gap-2 rounded-xl border border-[#1d3d73] bg-[#071a35] px-3 py-2 text-xs text-white/80"><span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-cyan-400 to-fuchsia-500"><FiFolder /></span>{collection.name}</div>)}</div>}
        <button onClick={()=>setShowCollections(open=>!open)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-fuchsia-500 py-2.5 text-xs font-bold text-white"><FiPlus />Add to Collection</button>
        {showCollections&&<div className="mt-2 rounded-xl border border-[#23467f] bg-[#081a36] p-2">{collectionData.collections.length?collectionData.collections.map(collection=>{const selected=postCollections.includes(collection.id);return <button key={collection.id} onClick={()=>toggleCollection(collection.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-white/75 hover:bg-white/[.05]"><span className={`grid h-4 w-4 place-items-center rounded border ${selected?'border-cyan-300 bg-cyan-400 text-[#061126]':'border-white/30'}`}>{selected&&<FiCheck className="h-3 w-3"/>}</span>{collection.name}</button>}):<p className="px-2 py-3 text-xs text-white/45">Create a collection from Bookmarks first.</p>}</div>}
      </section>
      <section className="rounded-2xl border border-[#17386f]/70 bg-[#031126]/95 p-4">
        <div className="flex items-center justify-between"><h2 className="text-sm font-bold">Collections</h2><button onClick={()=>navigate('/bookmarks')} className="text-[10px] font-semibold text-cyan-300">View all</button></div>
        <div className="mt-3 space-y-2">{collectionData.collections.map((collection,index)=><div key={collection.id} className="flex items-center gap-2.5 rounded-xl border border-[#1d3d73] bg-[#071a35]/80 p-2"><span className={`grid h-9 w-9 place-items-center rounded-lg ${['bg-gradient-to-br from-fuchsia-500 to-violet-600','bg-gradient-to-br from-teal-400 to-cyan-600','bg-gradient-to-br from-amber-300 to-orange-500','bg-gradient-to-br from-sky-400 to-blue-600'][index%4]}`}><FiFolder /></span><span className="min-w-0 flex-1 truncate text-xs font-semibold">{collection.name}</span><span className="text-[10px] text-white/45">{Object.values(collectionData.memberships).filter(items=>items.includes(collection.id)).length}</span></div>)}</div>
      </section>
      <section className="rounded-2xl border border-[#324ab5]/60 bg-gradient-to-br from-[#08276d] via-[#24117a] to-[#4a0f87] p-4"><FiBookmark className="h-6 w-6 text-cyan-300"/><h2 className="mt-3 text-sm font-bold">Save what matters</h2><p className="mt-2 text-xs leading-5 text-white/70">Keep posts, ideas and conversations for later.</p></section>
    </aside>
    </div>
  </main>;
}
