import { Outlet } from 'react-router-dom';
import NavRail from './NavRail';
import MobileChrome from './MobileChrome';
import GridBackground from '@/components/home/GridBackground';

export default function AppShell() {
  return (
    <div className="relative min-h-screen bg-[#0B0D12] text-[#F3F4F6]">
      <GridBackground />
      <NavRail activeId="overview" />
      <MobileChrome />
      <main className="relative z-10 min-h-screen pt-14 pb-20 lg:pt-0 lg:pb-0 lg:pl-16">
        <Outlet />
      </main>
    </div>
  );
}