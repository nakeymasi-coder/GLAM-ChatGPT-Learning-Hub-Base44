import StatusDot from './StatusDot';
import BentoCard from './BentoCard';

export default function BuildStatusCanvas() {
  const steps = [
    { label: 'Install dependencies', status: 'done', time: '12s' },
    { label: 'Compile bundle', status: 'done', time: '18s' },
    { label: 'Optimize assets', status: 'done', time: '8s' },
    { label: 'Upload artifact', status: 'active', time: '…' },
  ];
  return (
    <BentoCard title="Build Status">
      <div className="space-y-3">
        {steps.map((s) => (
          <div key={s.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <StatusDot tone={s.status === 'done' ? 'emerald' : 'amber'} pulse={s.status === 'active'} />
              <span className="text-[0.8rem] text-[#F3F4F6]">{s.label}</span>
            </div>
            <span className="font-mono text-[0.7rem] text-[#8B93A7]">{s.time}</span>
          </div>
        ))}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[#0B0D12]">
          <div className="h-full w-3/4 rounded-full bg-gradient-to-r from-[#059669] to-[#10B981]" />
        </div>
      </div>
    </BentoCard>
  );
}