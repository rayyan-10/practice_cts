/**
 * RiskDriversChart
 * Horizontal bar chart of the top feature importances driving risk.
 */
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from 'recharts';
import type { RiskDriver } from '@/lib/calculations/prediction';

interface Props {
  drivers: RiskDriver[];
}

// Colour gradient: most important = dark blue, least = light blue
const COLORS = ['#1d4ed8', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: RiskDriver }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-gray-900 dark:text-gray-100">{d.payload.displayLabel}</p>
      <p className="text-gray-600 dark:text-gray-300">
        Importance: <span className="font-bold text-blue-600">{(d.value * 100).toFixed(1)}%</span>
      </p>
    </div>
  );
}

export default function RiskDriversChart({ drivers }: Props) {
  if (!drivers.length) return null;

  // Recharts horizontal bar: swap axes
  const formatted = [...drivers]
    .sort((a, b) => a.importance - b.importance) // ascending so top item at top
    .map(d => ({
      ...d,
      importancePct: parseFloat((d.importance * 100).toFixed(1)),
    }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, formatted.length * 42)}>
      <BarChart
        layout="vertical"
        data={formatted}
        margin={{ top: 4, right: 40, left: 8, bottom: 4 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={v => `${v}%`}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="displayLabel"
          width={160}
          tick={{ fontSize: 11, fill: '#374151' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f3f4f6' }} />
        <Bar dataKey="importancePct" radius={[0, 4, 4, 0]} isAnimationActive>
          {formatted.map((_, index) => (
            <Cell
              key={index}
              fill={COLORS[Math.min(index, COLORS.length - 1)]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
