import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function CategoryBarChart({ data }) {
  if (!data || data.length === 0) return <p className="text-sm text-muted-foreground">Aucune donnée</p>;

  return (
    <div className="w-full h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis dataKey="name" type="category" fontSize={12} tickLine={false} axisLine={false} width={100} />
          <Tooltip 
            cursor={{ fill: 'rgba(30, 58, 95, 0.05)' }}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}
          />
          <Bar dataKey="value" fill="#E8A838" radius={[0, 4, 4, 0]} barSize={20} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
