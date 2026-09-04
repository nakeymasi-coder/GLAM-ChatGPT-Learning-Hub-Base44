import { LayoutDashboard, Rocket, BarChart3, Server, Settings, Activity } from 'lucide-react';
import StatusDot from '@/components/home/StatusDot';

const items = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'deployments', label: 'Deployments', icon: Rocket },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'environment', label: 'Environment', icon: Server },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function NavRail({ activeId = 'overview' }) {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-16 flex-col items-center border-r border-[#262B38] bg-[#0B0D12] py-4 lg:flex">
      <div className="mb-6 flex h-9 w-9 items-center justify-center rounded-lg border border-[#10B981]/30 bg-[#10B981]/15">
        <Activity className="h-5 w-5 text-[#10B981]" />
      </div>
      <nav className="flex flex-1 flex-col items-center gap-2">
        {items.map((it) => {
          const Icon = it.icon;
          const active = it.id === activeId;
          return (
            <button
              key={it.id}
              title={it.label}
              className={`group relative flex h-10 w-10 items-center justify-center rounded-lg transition ${
                active ? 'bg-[#161922] text-[#10B981]' : 'text-[#8B93A7] hover:bg-[#161922] hover:text-[#F3F4F6]'
              }`}
            >
              {active && <span className="absolute left-0 h-5 w-0.5 -translate-x-3 rounded-full bg-[#10B981]" />}
              <Icon className="h-5 w-5" />
              <span className="pointer-events-none absolute left-12 z-50 whitespace-nowrap rounded-md border border-[#262B38] bg-[#161922] px-2 py-1 text-[0.7rem] text-[#F3F4F6] opacity-0 transition group-hover:opacity-100">
                {it.label}
              </span>
            </button>
          );
        })}
      </nav>
      <div className="mt-4 flex flex-col items-center gap-1">
        <StatusDot tone="emerald" pulse />
        <span className="text-[0.55rem] uppercase tracking-wider text-[#8B93A7]">Live</span>
      </div>
    </aside>
  );
}