import { useEffect, useState } from 'react';
import { FiArrowLeft, FiSend, FiUsers } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import { createCommunityPost, fetchCommunity, toggleCommunityMembership } from '../utils/communities';
import { useAuth } from '../context/AuthContext';

export default function CommunityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try { setData(await fetchCommunity(id)); } catch (err) { setError(err?.message || 'Unable to load this community.'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const toggleJoin = async () => {
    if (!user) { navigate('/auth'); return; }
    try {
      const result = await toggleCommunityMembership(id);
      setData((current) => current ? { ...current, community: { ...current.community, joined: result.joined, member_count: result.memberCount } } : current);
    } catch (err) { setError(err?.message || 'Unable to update membership.'); }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!user) { navigate('/auth'); return; }
    if (!text.trim()) return;
    setPosting(true);
    setError('');
    try {
      const post = await createCommunityPost(id, text);
      setData((current) => current ? { ...current, posts: [post, ...(current.posts || [])] } : current);
      setText('');
    } catch (err) { setError(err?.message || 'Unable to publish community post.'); } finally { setPosting(false); }
  };

  if (loading) return <main className="min-h-screen bg-[#0B0F14] px-4 py-10 text-white"><div className="mx-auto max-w-3xl animate-pulse"><div className="h-32 rounded-3xl bg-white/[.05]" /><div className="mt-4 h-40 rounded-3xl bg-white/[.05]" /></div></main>;
  if (!data?.community) return <main className="grid min-h-screen place-items-center bg-[#0B0F14] px-6 text-center text-white"><div><p className="font-bold">{error || 'Community not found.'}</p><button onClick={() => navigate('/communities')} className="mt-4 rounded-xl bg-[#E7E9EA] px-5 py-2.5 text-sm font-semibold text-[#0B0F14] hover:bg-[#D9DDE1]">Back to communities</button></div></main>;

  const community = data.community;
  return <main className="min-h-screen bg-[#0B0F14] pb-28 text-white">
    <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
      <header className="flex items-center gap-3"><button onClick={() => navigate('/communities')} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[.03] text-white/65"><FiArrowLeft /></button><div className="min-w-0"><p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#1D9BF0]">Community</p><h1 className="truncate text-2xl font-extrabold">{community.name}</h1></div></header>
      <section className="mt-6 rounded-3xl border border-white/[.07] bg-white/[.025] p-5 sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-sm leading-6 text-white/55">{community.description}</p><div className="mt-4 flex items-center gap-2 text-xs text-white/35"><FiUsers /> {Number(community.member_count || 0).toLocaleString()} members · {community.category}</div></div><button onClick={toggleJoin} className={`shrink-0 rounded-xl px-4 py-2 text-xs font-semibold ${community.joined ? 'border border-white/10 bg-white/[.05] text-white/60' : 'bg-[#E7E9EA] text-[#0B0F14] text-white'}`}>{community.joined ? 'Joined' : 'Join'}</button></div></section>
      {error && <div className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/10 p-4 text-sm text-red-200">{error}</div>}
      {community.joined && <form onSubmit={submit} className="mt-4 rounded-3xl border border-white/[.07] bg-white/[.025] p-4"><textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={5000} rows={4} placeholder="Start a conversation in this community…" className="w-full resize-none bg-transparent text-sm leading-6 text-white outline-none placeholder:text-white/25" /><div className="mt-3 flex justify-end"><button disabled={posting || !text.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[#E7E9EA] text-[#0B0F14] px-4 py-2.5 text-xs font-semibold disabled:opacity-50 hover:bg-[#D9DDE1]"><FiSend /> {posting ? 'Posting…' : 'Post'}</button></div></form>}
      <div className="mt-6 space-y-3">{(data.posts || []).length ? data.posts.map((post) => <article key={post.id} className="rounded-3xl border border-white/[.07] bg-white/[.025] p-5"><p className="text-sm font-bold">{post.author_name}</p><p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/70">{post.body}</p><p className="mt-4 text-xs text-white/25">{new Date(post.created_at).toLocaleString()}</p></article>) : <div className="rounded-3xl border border-dashed border-white/10 px-6 py-14 text-center"><p className="font-semibold text-white/65">No posts yet</p><p className="mt-1 text-sm text-white/35">Start the first conversation.</p></div>}</div>
    </div>
  </main>;
}
