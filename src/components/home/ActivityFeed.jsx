const items = [
  { t: '2m', actor: 'deploy-bot', action: 'released v2.4.1 to production' },
  { t: '9m', actor: 'ci-runner', action: 'passed 128 tests on a3f9c2e' },
  { t: '21m', actor: 'system', action: 'scaled web fleet to 4 instances' },
  { t: '38m', actor: 'you', action: 'rolled back v2.4.0 from staging' },
  { t: '1h', actor: 'alert', action: 'p95 latency spike resolved' },
];

export default function ActivityFeed() {
  return (
    <ul className="space-y-3">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span className="w-8 shrink-0 font-mono text-[0.7rem] text-[#3a4150]">{it.t}</span>
          <span className="text-[0.78rem] text-[#8B93A7]">
            <span className="text-[#F3F4F6]">{it.actor}</span> {it.action}
          </span>
        </li>
      ))}
    </ul>
  );
}