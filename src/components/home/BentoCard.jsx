export default function BentoCard({ title, action, children, className = '', bodyClassName = '' }) {
  return (
    <section className={`overflow-hidden rounded-lg border border-[#262B38] bg-[#161922] ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between border-b border-[#262B38] px-4 py-2.5">
          {title && (
            <h3 className="text-[0.7rem] font-medium uppercase tracking-wider text-[#8B93A7]">{title}</h3>
          )}
          {action}
        </header>
      )}
      <div className={`p-4 ${bodyClassName}`}>{children}</div>
    </section>
  );
}