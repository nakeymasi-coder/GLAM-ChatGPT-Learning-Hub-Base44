export default function StatusDot({ tone = 'emerald', pulse = false, className = '' }) {
  const tones = {
    emerald: 'bg-[#10B981] shadow-[0_0_8px_2px_rgba(16,185,129,0.45)]',
    amber: 'bg-amber-500 shadow-[0_0_8px_2px_rgba(245,158,11,0.4)]',
    red: 'bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.4)]',
    zinc: 'bg-zinc-600',
  };
  return (
    <span className={`relative inline-flex h-2 w-2 shrink-0 rounded-full ${tones[tone]} ${className}`}>
      {pulse && <span className={`absolute inset-0 animate-ping rounded-full ${tones[tone]} opacity-60`} />}
    </span>
  );
}