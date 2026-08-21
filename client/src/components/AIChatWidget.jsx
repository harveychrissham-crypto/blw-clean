import { useMemo, useState } from 'react';
import { FiCpu, FiSend, FiX } from 'react-icons/fi';
import { Card } from './ui/Card';

const answers = {
  region: "Believers' LoveWorld Campus Ministry Kenya Zone Region is a Christ-centered ministry focused on discipleship, worship, outreach, leadership, and fellowship across Kenya Zone.",
  verse: 'A verse for today is Psalm 46:1: God is our refuge and strength, an ever-present help in trouble.',
  outreach: 'Upcoming outreach opportunities are listed on the Outreaches page, where you can find current ministry activities and details.',
  counselor: 'You can connect with the ministry through the Connect or Salvation pages for prayer and support.',
};

const suggestions = [
  { label: "What is BLW Campus Ministry Kenya Zone?", key: 'region' },
  { label: 'Can you suggest a Bible verse for today?', key: 'verse' },
  { label: 'How can I register for outreach?', key: 'outreach' },
  { label: 'How can I contact a counselor?', key: 'counselor' },
];

function answerForQuestion(question) {
  const q = question.toLowerCase();
  if (/verse|bible|scripture/.test(q)) return answers.verse;
  if (/outreach|register/.test(q)) return answers.outreach;
  if (/counsel|support|prayer/.test(q)) return answers.counselor;
  if (/region|campus ministry|blw/.test(q)) return answers.region;
  return 'I can help with ministry information, Bible verses, outreach, and finding support. Try one of the suggested questions below.';
}

export default function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(answers.region);
  const selectedKey = useMemo(() => suggestions.find((item) => answers[item.key] === answer)?.key, [answer]);

  const submit = (event) => {
    event?.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;
    setAnswer(answerForQuestion(trimmed));
    setQuestion('');
  };

  return (
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-[60] sm:bottom-4">
      {open ? (
        <Card variant="raised" className="w-[min(320px,calc(100vw-2rem))] p-4 shadow-soft backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Ministry Assistant</p>
              <p className="text-xs text-slate-400">Guidance for ministry information, verses, outreach, and support.</p>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full border border-white/10 p-2 text-slate-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" aria-label="Close assistant">
              <FiX />
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {suggestions.map((item) => (
              <button key={item.key} onClick={() => setAnswer(answers[item.key])} className={`w-full rounded-2xl border px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${selectedKey === item.key ? 'border-[#A53DFF]/40 bg-[#8A2BE2]/10 text-fuchsia-300' : 'border-white/10 bg-white/5 text-slate-300'}`}>
                {item.label}
              </button>
            ))}
          </div>
          <Card variant="subtle" className="mt-4 p-3 text-sm text-slate-300">
            <p className="font-semibold text-white">Response</p>
            <p className="mt-2 text-slate-400">{answer}</p>
          </Card>
          <form onSubmit={submit} className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <input value={question} onChange={(event) => setQuestion(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none" placeholder="Ask a ministry question" aria-label="Ask a ministry question" />
            <button type="submit" disabled={!question.trim()} className="rounded-full bg-gradient-to-r from-[#EC2FA8] via-[#8A2BE2] to-[#3D5AFE] p-2 text-white disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" aria-label="Send question">
              <FiSend />
            </button>
          </form>
        </Card>
      ) : (
        <button onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-full border border-[#A53DFF]/40 bg-[#A53DFF]/15 px-4 py-3 text-sm font-semibold text-fuchsia-300 backdrop-blur focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40">
          <FiCpu /> Ministry Assistant
        </button>
      )}
    </div>
  );
}
