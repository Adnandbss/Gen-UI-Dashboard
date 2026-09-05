/**
 * Demo-mode Chart.jsx sources. Live Gemini writes these; the keyword router
 * only ships two frozen templates so a clone without a key can still open the
 * sandbox. Numbers always come from `data.rows` injected by execute.
 */

export const SEGMENT_PIE_CODE = `import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export default function View({ data }) {
  const grouped = {};
  for (const row of data.rows) {
    if (row.amount <= 0) continue;
    const key = row.segment || "Unknown";
    grouped[key] = (grouped[key] || 0) + row.amount;
  }
  const chart = Object.entries(grouped).map(([name, value]) => ({ name, value }));
  const colors = ["#4f46e5", "#94a3b8", "#0d9488", "#d97706", "#e11d48"];

  return (
    <div className="flex h-full min-h-[280px] flex-col p-2">
      <h2 className="mb-2 text-sm font-semibold text-slate-900">Inflows by segment</h2>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chart} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={52} outerRadius={88} paddingAngle={2}>
              {chart.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
`;

export const CASH_AREA_CODE = `import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function View({ data }) {
  const chart = data.rows.map((row) => ({ month: row.label, cash: row.cash }));

  return (
    <div className="flex h-full min-h-[280px] flex-col p-2">
      <h2 className="mb-2 text-sm font-semibold text-slate-900">Cash over time</h2>
      <div className="min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} width={56} />
            <Tooltip />
            <Area type="monotone" dataKey="cash" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
`;
