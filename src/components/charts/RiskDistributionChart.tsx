/**
 * RiskDistributionChart
 * Donut / Pie chart showing breakdown of ACOs by risk category.
 */
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import type { RiskDistributionEntry } from '@/lib/calculations/prediction';

interface Props {
  data: RiskDistributionEntry[];
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: RiskDistributionEntry }>;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold" style={{ color: entry.color }}>{entry.label}</p>
      <p className="text-gray-700 dark:text-gray-300">Count: <span className="font-bold">{entry.count}</span></p>
      <p className="text-gray-700 dark:text-gray-300">Share: <span className="font-bold">{entry.pct}%</span></p>
    </div>
  );
}

// Custom legend to show count + %
function CustomLegend({ data }: { data: RiskDistributionEntry[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="flex flex-col gap-1.5 text-xs mt-2">
      {data.map(entry => (
        <div key={entry.label} className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full flex-shrink-0"
            style={{ background: entry.color }}
          />
          <span className="text-gray-700 dark:text-gray-300 flex-1">{entry.label}</span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {entry.count} <span className="text-gray-400">({entry.pct}%)</span>
          </span>
        </div>
      ))}
      <div className="flex items-center gap-2 pt-1 border-t border-gray-200 dark:border-gray-700 mt-1">
        <span className="inline-block h-2.5 w-2.5 flex-shrink-0" />
        <span className="text-gray-500 flex-1">Total ACOs</span>
        <span className="font-bold text-gray-900 dark:text-gray-100">{total}</span>
      </div>
    </div>
  );
}

export default function RiskDistributionChart({ data }: Props) {
  if (!data.length) return null;

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={52}
            outerRadius={80}
            paddingAngle={3}
            dataKey="count"
            nameKey="label"
            isAnimationActive
          >
            {data.map(entry => (
              <Cell key={entry.label} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <CustomLegend data={data} />
    </div>
  );
}
