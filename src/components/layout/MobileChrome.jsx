import { LayoutDashboard, Rocket, BarChart3, Settings, Activity } from 'lucide-react';
import StatusDot from '@/components/home/StatusDot';

const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'deployments', label: 'Deploy', icon: Rocket },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function MobileChrome() {
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-[#262B38] bg-[#0B0D12]/80 px-4 backdrop-blur lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[#10B981]/30 bg-[#10B981]/15">
            <Activity className="h-4 w-4 text-[#10B981]" />
          </div>
          <span className="font-display text-[0.95rem] font-semibold text-[#F3F4F6]">App Ops</span>
        </div>
        <div className="flex items-center gap-2 text-[0.75rem] text-[#8B93A7]">
          <StatusDot tone="emerald" pulse /> Live
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-[#262B38] bg-[#0B0D12]/90 px-2 backdrop-blur lg:hidden">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = t.id === 'overview';
          return (
            <button key={t.id} className="flex flex-col items-center gap-1 px-3 py-2">
              <Icon className={`h-5 w-5 ${active ? 'text-[#10B981]' : 'text-[#8B93A7]'}`} />
              <span className={`text-[0.625rem] ${active ? 'text-[#F3F4F6]' : 'text-[#8B93A7]'}`}>{t.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}