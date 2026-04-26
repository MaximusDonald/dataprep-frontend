import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function HistogramChart({ data, xKey = 'bin_start', yKey = 'count' }) {
  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground">Aucune donnée</p>;

  // Format tick to 2 decimals
  const formatTick = (val) => {
    if (typeof val === 'number') return Number.isInteger(val) ? val : val.toFixed(2);
    return val;
  }

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis dataKey={xKey} tickFormatter={formatTick} fontSize={12} tickLine={false} axisLine={false} />
          <YAxis fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            cursor={{ fill: 'rgba(30, 58, 95, 0.05)' }}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}
            labelFormatter={formatTick}
          />
          <Bar dataKey={yKey} fill="#2E6DA4" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
