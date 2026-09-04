import { Rocket, ArrowUpRight } from 'lucide-react';
import StatusDot from './StatusDot';
import EnvSwitch from './EnvSwitch';

export default function HeroArrival({ env, onEnvChange, onPublish }) {
  return (
    <section className="relative overflow-hidden rounded-lg border border-[#262B38] bg-gradient-to-br from-[#161922] to-[#0B0D12] p-6 sm:p-8 lg:p-10">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage: 'radial-gradient(circle at 85% 0%, rgba(16,185,129,0.18), transparent 45%)',
        }}
      />
      <div className="relative flex flex-col gap-6 lg:gap-8">
        <div className="flex items-center gap-2 text-[0.75rem] text-[#8B93A7]">
          <StatusDot tone="emerald" pulse />
          <span className="uppercase tracking-wider">All systems operational</span>
          <span className="text-[#3a4150]">·</span>
          <span className="capitalize">{env}</span>
        </div>
        <div>
          <h1
            className="font-display font-semibold leading-[0.95] tracking-tight text-[#F3F4F6]"
            style={{ fontSize: 'clamp(2.5rem, 5vw, 4.5rem)' }}
          >
            App Operations
          </h1>
          <p className="mt-3 max-w-xl text-[0.875rem] text-[#8B93A7]">
            Precision control surface for deployments, telemetry, and environment health across your Base44 application.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <EnvSwitch env={env} onChange={onEnvChange} />
          <button
            onClick={onPublish}
            className="group inline-flex items-center gap-2 rounded-lg bg-[#10B981] px-5 py-3 text-[0.875rem] font-medium text-[#0B0D12] shadow-[0_0_24px_-4px_rgba(16,185,129,0.6)] transition hover:bg-[#059669]"
          >
            <Rocket className="h-4 w-4" />
            Publish to Base44
            <ArrowUpRight className="h-4 w-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>
      </div>
    </section>
  );
}