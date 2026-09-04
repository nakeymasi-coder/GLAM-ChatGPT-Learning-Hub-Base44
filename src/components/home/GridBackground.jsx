export default function GridBackground() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 opacity-50"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(38,43,56,0.45) 1px, transparent 1px), linear-gradient(to bottom, rgba(38,43,56,0.45) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
        maskImage: 'radial-gradient(ellipse at top, black 25%, transparent 75%)',
        WebkitMaskImage: 'radial-gradient(ellipse at top, black 25%, transparent 75%)',
      }}
    />
  );
}