import { useEffect, useMemo, useState } from 'react';
import { FiCpu, FiSend, FiX } from 'react-icons/fi';
import { Card } from './ui/Card';
import Button from './ui/Button';

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
  const [hidden, setHidden] = useState(false);
  const selectedKey = useMemo(() => suggestions.find((item) => answers[item.key] === answer)?.key, [answer]);

  useEffect(() => {
    const onCallActive = (e) => setHidden(Boolean(e.detail));
    window.addEventListener('blw-meeting-call-active', onCallActive);
    return () => window.removeEventListener('blw-meeting-call-active', onCallActive);
  }, []);

  const submit = (event) => {
    event?.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;
    setAnswer(answerForQuestion(trimmed));
    setQuestion('');
  };

  if (hidden) return null;

  return (
    <div className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-[60] sm:bottom-4">
      {open ? (
        <Card variant="raised" className="w-[min(320px,calc(100vw-2rem))] p-4 shadow-soft backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Ministry Assistant</p>
              <p className="text-xs text-slate-400">Guidance for ministry information, verses, outreach, and support.</p>
            </div>
            <Button variant="custom" size="none" onClick={() => setOpen(false)} className="rounded-full border border-white/10 p-2 text-slate-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" aria-label="Close assistant">
              <FiX />
            </Button>
          </div>
          <div className="mt-4 space-y-2">
            {suggestions.map((item) => (
              <Button variant="custom" size="none" key={item.key} onClick={() => setAnswer(answers[item.key])} className={`w-full rounded-xl border px-3 py-2 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#EC2FA8]/60 ${selectedKey === item.key ? 'border-[#EC2FA8]/30 bg-[#EC2FA8]/10 text-[#F04FB8]' : 'border-white/10 bg-white/5 text-slate-300'}`}>
                {item.label}
              </Button>
            ))}
          </div>
          <Card variant="subtle" className="mt-4 p-3 text-sm text-slate-300">
            <p className="font-semibold text-white">Response</p>
            <p className="mt-2 text-slate-400">{answer}</p>
          </Card>
          <form onSubmit={submit} className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
            <input value={question} onChange={(event) => setQuestion(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none" placeholder="Ask a ministry question" aria-label="Ask a ministry question" />
            <Button variant="gradient" size="none" type="submit" disabled={!question.trim()} className="rounded-full p-2" aria-label="Send question">
              <FiSend />
            </Button>
          </form>
        </Card>
      ) : (
        <Button variant="secondary" size="none" onClick={() => setOpen(true)} className="flex items-center gap-2 rounded-full px-4 py-3 text-sm text-white backdrop-blur">
          <FiCpu /> Ministry Assistant
        </Button>
      )}
    </div>
  );
}
