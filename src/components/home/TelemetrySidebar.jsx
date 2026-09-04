import BentoCard from './BentoCard';
import LatencyChart from './LatencyChart';
import StatusDot from './StatusDot';
import ActivityFeed from './ActivityFeed';

const apiEndpoints = [
  { name: '/api/auth', status: 'operational', latency: '42ms' },
  { name: '/api/entities', status: 'operational', latency: '88ms' },
  { name: '/api/uploads', status: 'degraded', latency: '410ms' },
  { name: '/api/webhooks', status: 'operational', latency: '61ms' },
];

export default function TelemetrySidebar() {
  return (
    <div className="flex flex-col gap-4">
      <BentoCard
        title="Response Latency"
        action={<span className="font-mono text-[0.7rem] text-[#10B981]">142 ms</span>}
      >
        <LatencyChart />
        <div className="mt-3 flex items-center justify-between text-[0.7rem] text-[#8B93A7]">
          <span>p50 118ms</span>
          <span>p95 204ms</span>
          <span>p99 312ms</span>
        </div>
      </BentoCard>

      <BentoCard title="Active Sessions">
        <div className="flex items-end justify-between">
          <div>
            <div className="font-display text-[1.75rem] font-semibold text-[#F3F4F6]">1,284</div>
            <div className="text-[0.7rem] text-[#8B93A7]">live now · peak 1,920</div>
          </div>
          <div className="flex items-center gap-1.5 text-[0.7rem] text-[#10B981]">
            <StatusDot tone="emerald" pulse /> +12.4%
          </div>
        </div>
        <div className="mt-3 flex items-end gap-1.5">
          {[40, 65, 52, 78, 90, 72, 84, 96, 70, 88].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-sm bg-[#10B981]/25"
              style={{ height: `${h * 0.28}px` }}
            />
          ))}
        </div>
      </BentoCard>

      <BentoCard title="API Health">
        <div className="space-y-3">
          {apiEndpoints.map((e) => (
            <div key={e.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <StatusDot tone={e.status === 'operational' ? 'emerald' : 'amber'} pulse={e.status !== 'operational'} />
                <span className="font-mono text-[0.78rem] text-[#F3F4F6]">{e.name}</span>
              </div>
              <span className="font-mono text-[0.7rem] text-[#8B93A7]">{e.latency}</span>
            </div>
          ))}
        </div>
      </BentoCard>

      <BentoCard title="Recent Activity">
        <ActivityFeed />
      </BentoCard>
    </div>
  );
}