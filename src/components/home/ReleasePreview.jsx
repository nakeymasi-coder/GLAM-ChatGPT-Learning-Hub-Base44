import { ExternalLink } from 'lucide-react';
import StatusDot from './StatusDot';
import BentoCard from './BentoCard';

export default function ReleasePreview({ release, env }) {
  return (
    <BentoCard title="Active Release">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <StatusDot tone="emerald" pulse />
            <span className="font-mono text-[1.125rem] font-semibold text-[#F3F4F6]">{release.version}</span>
          </div>
          <div className="mt-1 text-[0.75rem] text-[#8B93A7]">
            commit {release.commit} · built {release.builtAgo}
          </div>
        </div>
        <button className="inline-flex items-center gap-1 text-[0.7rem] text-[#8B93A7] transition hover:text-[#F3F4F6]">
          Open <ExternalLink className="h-3 w-3" />
        </button>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-[0.75rem]">
        <div>
          <dt className="text-[#8B93A7]">Uptime</dt>
          <dd className="mt-0.5 font-mono text-[#F3F4F6]">{release.uptime}</dd>
        </div>
        <div>
          <dt className="text-[#8B93A7]">Region</dt>
          <dd className="mt-0.5 font-mono text-[#F3F4F6]">{release.region}</dd>
        </div>
        <div>
          <dt className="text-[#8B93A7]">Environment</dt>
          <dd className="mt-0.5 capitalize text-[#F3F4F6]">{env}</dd>
        </div>
        <div>
          <dt className="text-[#8B93A7]">Status</dt>
          <dd className="mt-0.5 text-[#10B981]">Healthy</dd>
        </div>
      </dl>
    </BentoCard>
  );
}