import { useEffect, useState } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';

export default function LatencyChart() {
  const [data, setData] = useState(() =>
    Array.from({ length: 24 }, (_, i) => ({ i, ms: 120 + Math.round(Math.sin(i / 3) * 40 + Math.random() * 30) }))
  );

  useEffect(() => {
    const id = setInterval(() => {
      setData((prev) => [...prev.slice(1), { i: prev[prev.length - 1].i + 1, ms: 110 + Math.round(Math.random() * 120) }]);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="h-28">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="lat" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10B981" stopOpacity={0.4} />
              <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            contentStyle={{ background: '#161922', border: '1px solid #262B38', borderRadius: 8, fontSize: '0.7rem', color: '#F3F4F6' }}
            labelStyle={{ display: 'none' }}
            formatter={(v) => [`${v} ms`, 'latency']}
          />
          <Area type="monotone" dataKey="ms" stroke="#10B981" strokeWidth={2} fill="url(#lat)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}