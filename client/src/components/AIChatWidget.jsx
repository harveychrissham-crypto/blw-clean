import { useState } from 'react';
import { FiCpu, FiSend, FiX } from 'react-icons/fi';

const suggestions = [
  'What is Believers\' LoveWorld Campus Ministry East and Central Africa Region?',
  'Can you suggest a Bible verse for today?',
  'How can I register for outreach?',
  'How can I contact a counselor?'
];

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(suggestions[0]);

  return (
    <div className="fixed bottom-4 right-4 z-[60]">
      {open ? (
        <div className="w-[320px] rounded-3xl border border-white/10 bg-[#140A30]/95 p-4 shadow-soft backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">AI Ministry Assistant</p>
              <p className="text-xs text-slate-400">Helpful guidance for visitors, members, and prayer seekers.</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full border border-white/10 p-2 text-slate-300 hover:text-white">
              <FiX />
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {suggestions.map((item) => (
              <button key={item} onClick={() => setSelected(item)} className={`w-full rounded-2xl border px-3 py-2 text-left text-sm ${selected === item ? 'border-[#A53DFF]/40 bg-[#8A2BE2]/10 text-fuchsia-300' : 'border-white/10 bg-white/5 text-slate-300'}`}>
                {item}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#121321]/60 p-3 text-sm text-slate-300">
            <p className="font-semibold text-white">Suggested response</p>
            <p className="mt-2 text-slate-400">
              {selected === suggestions[0] && 'Believers\' LoveWorld Campus Ministry East and Central Africa Region is a Christ-centered movement focused on discipleship, worship, outreach, leadership, and fellowship across East & Central Africa.'}
              {selected === suggestions[1] && 'A beautiful verse for today is Psalm 46:1: “God is our refuge and strength, an ever-present help in trouble.”'}
              {selected === suggestions[2] && 'You can register for upcoming outreaches through the Outreaches page or by contacting the ministry team directly.'}
              {selected === suggestions[3] && 'You can connect with a counselor through the Salvation or Connect pages for support and prayer.'}
            </p>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
            <input className="flex-1 bg-transparent text-sm text-white outline-none" placeholder="Ask a ministry question" />
            <button className="rounded-full bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] p-2 text-white"><FiSend /></button>
          </div>
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-full border border-[#A53DFF]/40 bg-[#A53DFF]/15 px-4 py-3 text-sm font-semibold text-fuchsia-300 backdrop-blur">
          <FiCpu /> AI Assistant
        </button>
      )}
    </div>
  );
}
