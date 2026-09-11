import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FiArrowLeft, FiMessageCircle, FiSearch, FiSend, FiX } from 'react-icons/fi';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../config/api';

const initials = (name = '') => name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '?';
const formatTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

function Avatar({ person, size = 'h-12 w-12' }) {
  return <div className={`${size} grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/10 bg-white/[0.07] text-xs font-bold text-white`}>
    {person?.avatarUrl ? <img src={person.avatarUrl} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async"/> : initials(person?.name)}
  </div>;
}

export default function Messages() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [people, setPeople] = useState([]);
  const [composer, setComposer] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchingPeople, setSearchingPeople] = useState(false);
  const [error, setError] = useState('');
  const messageListRef = useRef(null);

  const conversationId = params.get('conversation');

  const loadConversations = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const res = await apiFetch('/api/messages/conversations');
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Unable to load messages.');
      setConversations(body.conversations || []);
      if (conversationId) {
        const found = (body.conversations || []).find((item) => item.id === conversationId);
        if (found) setSelected(found);
      }
    } catch (err) { setError(err.message || 'Unable to load messages.'); }
    finally { setLoading(false); }
  }, [conversationId, user]);

  const loadThread = useCallback(async (id, silent = false) => {
    if (!id) return;
    try {
      const res = await apiFetch(`/api/messages/conversations/${encodeURIComponent(id)}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Unable to load conversation.');
      setMessages(body.messages || []);
      await apiFetch(`/api/messages/conversations/${encodeURIComponent(id)}`, { method: 'PATCH' });
      if (!silent) setError('');
    } catch (err) { if (!silent) setError(err.message || 'Unable to load conversation.'); }
  }, []);

  useEffect(() => { loadConversations(); }, [loadConversations]);
  useEffect(() => {
    if (!conversationId) { setMessages([]); return undefined; }
    loadThread(conversationId);
    const timer = window.setInterval(() => { loadThread(conversationId, true); loadConversations(); }, 5000);
    return () => window.clearInterval(timer);
  }, [conversationId, loadConversations, loadThread]);

  useEffect(() => {
    const node = messageListRef.current;
    if (!node) return;
    const frame = window.requestAnimationFrame(() => { node.scrollTop = node.scrollHeight; });
    return () => window.cancelAnimationFrame(frame);
  }, [conversationId, messages.length]);

  useEffect(() => {
    if (!query.trim() || query.trim().length < 2 || !user) { setPeople([]); setSearchingPeople(false); return undefined; }
    const timer = window.setTimeout(async () => {
      setSearchingPeople(true);
      try {
        const res = await apiFetch(`/api/messages/people?q=${encodeURIComponent(query.trim())}`);
        const body = await res.json().catch(() => ({}));
        setPeople(res.ok ? body.people || [] : []);
      } catch { setPeople([]); }
      finally { setSearchingPeople(false); }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [query, user]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || people.length) return conversations;
    return conversations.filter((item) => `${item.other?.name} ${item.lastMessage}`.toLowerCase().includes(q));
  }, [conversations, people.length, query]);

  const openConversation = (conversation) => {
    setSelected(conversation);
    setQuery('');
    setPeople([]);
    setParams({ messages: '1', conversation: conversation.id });
  };

  const startConversation = async (person) => {
    try {
      const res = await apiFetch('/api/messages/conversations', { method: 'POST', body: JSON.stringify({ recipientEmail: person.email }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Unable to start conversation.');
      const conversation = { id: body.conversationId, other: body.other, lastMessage: '', lastMessageAt: null, unreadCount: 0 };
      setConversations((current) => [conversation, ...current.filter((item) => item.id !== conversation.id)]);
      openConversation(conversation);
    } catch (err) { setError(err.message || 'Unable to start conversation.'); }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    const body = composer.trim();
    if (!body || !conversationId || sending) return;
    setSending(true);
    setError('');
    try {
      const res = await apiFetch(`/api/messages/conversations/${encodeURIComponent(conversationId)}`, { method: 'POST', body: JSON.stringify({ body }) });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Message could not be sent.');
      setComposer('');
      await loadThread(conversationId, true);
      await loadConversations();
    } catch (err) { setError(err.message || 'Message could not be sent.'); }
    finally { setSending(false); }
  };

  if (!user) {
    return <section className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-2xl place-items-center px-4 pb-24 text-center">
      <div><div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white/65"><FiMessageCircle className="h-8 w-8" /></div><h1 className="mt-6 text-xl font-bold text-white">Sign in to use Messages</h1><p className="mt-2 text-sm text-white/40">Connect privately with members of your fellowship community.</p><Link to="/auth" className="mt-5 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#0d0c18]">Sign in</Link></div>
    </section>;
  }

  return <section className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl flex-col px-3 pb-24 pt-3 sm:px-6 sm:pt-6">
    <div className="mb-3 flex items-center justify-between px-1 sm:px-0"><div><p className="text-[10px] font-bold uppercase tracking-[.22em] text-white/30">BLW Kenya Zone · Feed</p><h1 className="text-xl font-bold text-white">Messages</h1></div><Link to="/feed" className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/70 hover:bg-white/[0.08] hover:text-white">Back to Feed</Link></div>
    <div className="flex min-h-0 flex-1 overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] shadow-2xl shadow-black/20">
      <aside className={`w-full shrink-0 border-white/[0.07] sm:w-[340px] sm:border-r ${selected ? 'hidden sm:block' : 'block'}`}>
        <div className="border-b border-white/[0.07] px-4 pb-3 pt-4">
          <div className="flex items-center gap-3"><Link to="/feed" aria-label="Back to feed" className="grid h-9 w-9 place-items-center rounded-full text-white/60 hover:bg-white/[0.06] hover:text-white"><FiArrowLeft /></Link><div><h2 className="text-sm font-bold text-white">Inbox</h2><p className="text-[10px] text-white/30">Private conversations</p></div></div>
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5"><FiSearch className="h-4 w-4 text-white/35" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search members or conversations" className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30" />{query && <button onClick={() => setQuery('')} className="text-white/35 hover:text-white" aria-label="Clear search"><FiX /></button>}</div>
        </div>

        {people.length > 0 && <div className="border-b border-white/[0.07] p-2"><p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[.18em] text-white/30">Start a conversation</p>{people.map((person) => <button key={person.email} onClick={() => startConversation(person)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition hover:bg-white/[0.05]"><Avatar person={person} size="h-10 w-10" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-white">{person.name}</span><span className="block truncate text-xs text-white/35">{person.title || person.chapter || person.email}</span></span></button>)}</div>}
        {searchingPeople && <p className="px-4 py-3 text-xs text-white/30">Searching members…</p>}
        {error && <div className="mx-3 mt-3 rounded-xl border border-red-400/10 bg-red-400/[0.05] px-3 py-2 text-xs text-red-200">{error}</div>}

        <div className="overflow-y-auto">
          {loading ? <div className="space-y-2 p-3">{[1,2,3,4].map((item) => <div key={item} className="h-16 animate-pulse rounded-2xl bg-white/[0.035]" />)}</div> : filtered.length ? filtered.map((conversation) => <button key={conversation.id} onClick={() => openConversation(conversation)} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.045] ${conversation.id === conversationId ? 'bg-white/[0.06]' : ''}`}><Avatar person={conversation.other} /><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className={`truncate text-sm ${conversation.unreadCount ? 'font-bold text-white' : 'font-semibold text-white/90'}`}>{conversation.other?.name}</span><span className="shrink-0 text-[10px] text-white/30">{formatTime(conversation.lastMessageAt)}</span></span><span className="mt-1 flex items-center gap-2"><span className={`truncate text-xs ${conversation.unreadCount ? 'font-medium text-white/65' : 'text-white/35'}`}>{conversation.lastMessage || 'Start a conversation'}</span>{conversation.unreadCount > 0 && <span className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-white px-1 text-[10px] font-bold text-[#0d0c18]">{conversation.unreadCount}</span>}</span></span></button>) : <div className="px-5 py-16 text-center"><FiMessageCircle className="mx-auto h-7 w-7 text-white/25" /><p className="mt-4 text-sm font-semibold text-white/70">{query ? 'No matches' : 'No conversations yet'}</p><p className="mt-1 text-xs text-white/35">{query ? 'Try another name.' : 'Search for a member to start chatting.'}</p></div>}
        </div>
      </aside>

      <main className={`min-w-0 flex-1 flex-col bg-[#08080d]/35 ${selected ? 'flex' : 'hidden sm:flex'}`}>
        {selected ? <>
          <header className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3.5"><button onClick={() => { setSelected(null); setParams({ messages: '1' }); }} className="grid h-9 w-9 place-items-center rounded-full text-white/60 hover:bg-white/[0.06] sm:hidden" aria-label="Back to conversations"><FiArrowLeft /></button><Avatar person={selected.other} size="h-10 w-10" /><div className="min-w-0"><h2 className="truncate text-sm font-bold text-white">{selected.other?.name}</h2><p className="truncate text-xs text-white/35">{selected.other?.title || selected.other?.chapter || 'BLW Kenya Zone member'}</p></div></header>
          <div ref={messageListRef} className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">{messages.length ? <div className="mx-auto flex max-w-2xl flex-col gap-2">{messages.map((message) => { const mine = message.senderEmail?.toLowerCase() === user.email?.toLowerCase(); return <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${mine ? 'rounded-br-md bg-white text-[#0d0c18]' : 'rounded-bl-md border border-white/[0.08] bg-white/[0.055] text-white/90'}`}><p className="whitespace-pre-wrap break-words">{message.body}</p><p className={`mt-1 text-[9px] ${mine ? 'text-[#0d0c18]/45' : 'text-white/25'}`}>{formatTime(message.createdAt)}</p></div></div>; })}</div> : <div className="grid h-full place-items-center text-center"><div><Avatar person={selected.other} size="h-16 w-16 mx-auto" /><h3 className="mt-4 font-bold text-white">{selected.other?.name}</h3><p className="mt-1 text-xs text-white/35">Send the first message.</p></div></div>}</div>
          <form onSubmit={sendMessage} className="border-t border-white/[0.07] p-3 sm:p-4"><div className="mx-auto flex max-w-2xl items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.045] p-2"><textarea value={composer} onChange={(event) => setComposer(event.target.value.slice(0, 2000))} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} rows={1} placeholder="Message…" className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-white/30" /><button disabled={!composer.trim() || sending} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#0d0c18] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-30" aria-label="Send message"><FiSend className="h-4 w-4" /></button></div></form>
        </> : <div className="hidden h-full place-items-center text-center sm:grid"><div><FiMessageCircle className="mx-auto h-9 w-9 text-white/20" /><h2 className="mt-4 font-bold text-white">Select a conversation</h2><p className="mt-1 text-sm text-white/35">Choose a member from your inbox.</p></div></div>}
      </main>
    </div>
  </section>;
}
