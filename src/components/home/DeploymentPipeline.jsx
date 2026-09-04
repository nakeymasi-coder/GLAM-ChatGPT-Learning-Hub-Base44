import StatusDot from './StatusDot';
import BentoCard from './BentoCard';
import LogStream from './LogStream';
import BuildStatusCanvas from './BuildStatusCanvas';
import ReleasePreview from './ReleasePreview';

export default function DeploymentPipeline({ release, env }) {
  const stages = [
    { id: 'source', label: 'Source', sub: 'a3f9c2e', status: 'done' },
    { id: 'build', label: 'Build', sub: '42s', status: 'done' },
    { id: 'test', label: 'Test', sub: '128 passed', status: 'done' },
    { id: 'deploy', label: 'Deploy', sub: 'in progress', status: 'active' },
  ];
  return (
    <div className="flex flex-col gap-4">
      <BentoCard
        title="Deployment Pipeline"
        action={
          <span className="flex items-center gap-2 text-[0.7rem] text-[#8B93A7]">
            <StatusDot tone="emerald" pulse /> Deploying
          </span>
        }
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {stages.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg border ${
                    s.status === 'active'
                      ? 'border-[#10B981]/40 bg-[#10B981]/10'
                      : 'border-[#262B38] bg-[#0B0D12]'
                  }`}
                >
                  <StatusDot
                    tone={s.status === 'active' || s.status === 'done' ? 'emerald' : 'zinc'}
                    pulse={s.status === 'active'}
                  />
                </div>
                <div>
                  <div className="text-[0.875rem] font-medium text-[#F3F4F6]">{s.label}</div>
                  <div className="text-[0.7rem] text-[#8B93A7]">{s.sub}</div>
                </div>
              </div>
              {i < stages.length - 1 && <div className="hidden h-px min-w-6 flex-1 bg-[#262B38] sm:block" />}
            </div>
          ))}
        </div>
      </BentoCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BuildStatusCanvas />
        <ReleasePreview release={release} env={env} />
      </div>

      <BentoCard
        title="Live Log Stream"
        action={<span className="font-mono text-[0.7rem] text-[#8B93A7]">tail -f deploy.log</span>}
      >
        <LogStream />
      </BentoCard>
    </div>
  );
}