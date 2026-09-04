export default function EnvSwitch({ env, onChange }) {
  const opts = [
    { id: 'production', label: 'Production', dot: 'bg-[#10B981]' },
    { id: 'staging', label: 'Staging', dot: 'bg-amber-500' },
  ];
  return (
    <div className="inline-flex items-center rounded-lg border border-[#262B38] bg-[#0B0D12] p-1">
      {opts.map((o) => {
        const active = env === o.id;
        return (
          <button
            key={o.id}
            onClick={() => onChange(o.id)}
            className={`inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-[0.75rem] font-medium transition ${
              active ? 'bg-[#161922] text-[#F3F4F6]' : 'text-[#8B93A7] hover:text-[#F3F4F6]'
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${o.dot}`} />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}