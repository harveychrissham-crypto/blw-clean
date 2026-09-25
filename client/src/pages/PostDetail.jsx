import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiArrowLeft, FiBookmark, FiHeart, FiMessageCircle, FiSend, FiTrash2 } from 'react-icons/fi';
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
  if(error && !post) return <main className="mx-auto grid min-h-[70vh] max-w-2xl place-items-center px-6 text-center text-white"><div><p className="text-sm font-semibold">{error}</p><button onClick={()=>navigate(-1)} className="mt-4 rounded-full bg-white px-4 py-2 text-xs font-bold text-[#0B0F14]">Go back</button></div></main>;

  return <main className="mx-auto min-h-screen max-w-2xl pb-28 text-white">
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/[.07] bg-[#0B0F14]/90 px-4 py-3 backdrop-blur-xl">
      <button onClick={()=>navigate(-1)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-white/[.06]" aria-label="Back"><FiArrowLeft/></button>
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
        <button onClick={()=>updateAction('like')} className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs ${post.liked?'text-pink-400':'text-white/55 hover:bg-white/[.05]'}`}><FiHeart fill={post.liked?'currentColor':'none'}/>{post.likeCount||0}</button>
        <button onClick={()=>document.getElementById('reply-box')?.focus()} className="flex items-center gap-2 rounded-full px-3 py-2 text-xs text-white/55 hover:bg-white/[.05]"><FiMessageCircle/>{post.commentCount||0}</button>
        <button onClick={()=>updateAction('save')} className={`ml-auto grid h-9 w-9 place-items-center rounded-full ${post.saved?'text-white':'text-white/55 hover:bg-white/[.05]'}`} aria-label={post.saved?'Remove bookmark':'Bookmark'}><FiBookmark fill={post.saved?'currentColor':'none'}/></button>
        <button onClick={()=>shareContent({title:post.title||'Post on Emet',text:post.body||post.title,url:window.location.href})} className="grid h-9 w-9 place-items-center rounded-full text-white/55 hover:bg-white/[.05]" aria-label="Share"><FiSend/></button>
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
  </main>;
}
