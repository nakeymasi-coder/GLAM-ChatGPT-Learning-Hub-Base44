import { useEffect, useRef, useState } from 'react';

const seed = [
  { t: '16:09:02', lvl: 'info', msg: 'Cloning repository…' },
  { t: '16:09:04', lvl: 'info', msg: 'Installing dependencies (npm ci)' },
  { t: '16:09:14', lvl: 'info', msg: 'Build started: vite build' },
  { t: '16:09:32', lvl: 'ok', msg: 'Bundle generated — 284.1 KB' },
  { t: '16:09:33', lvl: 'info', msg: 'Uploading to edge network' },
];

const pool = [
  { lvl: 'ok', msg: 'Edge cache warmed (3 regions)' },
  { lvl: 'info', msg: 'Health check passed — 200 OK' },
  { lvl: 'info', msg: 'Routing traffic to new release' },
  { lvl: 'ok', msg: 'Deployment verified' },
  { lvl: 'warn', msg: 'Retry: asset /assets/app.9f2.js' },
  { lvl: 'info', msg: 'Draining old instances (0/2)' },
];

const color = (l) => (l === 'ok' ? 'text-[#10B981]' : l === 'warn' ? 'text-amber-400' : 'text-[#8B93A7]');

export default function LogStream() {
  const [lines, setLines] = useState(seed);
  const bodyRef = useRef(null);

  useEffect(() => {
    const id = setInterval(() => {
      setLines((prev) => {
        const next = [
          ...prev,
          { t: new Date().toLocaleTimeString('en-GB', { hour12: false }), ...pool[Math.floor(Math.random() * pool.length)] },
        ];
        return next.slice(-40);
      });
    }, 2200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [lines]);

  return (
    <div
      ref={bodyRef}
      className="h-44 overflow-y-auto rounded-md border border-[#262B38] bg-[#0B0D12] p-3 font-mono text-[0.72rem] leading-relaxed"
    >
      {lines.map((l, i) => (
        <div key={i} className="flex gap-2">
          <span className="text-[#3a4150]">{l.t}</span>
          <span className={color(l.lvl)}>{l.lvl.toUpperCase().padEnd(4)}</span>
          <span className="text-[#F3F4F6]">{l.msg}</span>
        </div>
      ))}
    </div>
  );
}