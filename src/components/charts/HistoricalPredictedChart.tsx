/**
 * HistoricalPredictedChart
 * Line chart showing historical performance gap (solid) and the predicted
 * future data point (dashed) using Recharts.
 */
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  Dot,
} from 'recharts';
import type { HistoricalPoint } from '@/lib/calculations/prediction';

interface Props {
  data: HistoricalPoint[];
}

// Custom dot: predicted points get a hollow ring, historical get a filled dot
function CustomDot(props: {
  cx?: number;
  cy?: number;
  payload?: HistoricalPoint;
}) {
  const { cx = 0, cy = 0, payload } = props;
  if (!payload) return null;

  if (payload.isPredicted) {
    return (
      <Dot
        cx={cx}
        cy={cy}
        r={6}
        stroke="#3b82f6"
        strokeWidth={2.5}
        fill="#fff"
      />
    );
  }
  return <Dot cx={cx} cy={cy} r={4} stroke="#3b82f6" strokeWidth={2} fill="#3b82f6" />;
}

// Custom tooltip
function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; payload: HistoricalPoint }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0];
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-gray-900 dark:text-gray-100">
        {label}
        {point.payload.isPredicted && (
          <span className="ml-1 text-xs font-medium text-blue-500">(Predicted)</span>
        )}
      </p>
      <p className={`font-bold ${point.value >= 0 ? 'text-green-600' : 'text-red-600'}`}>
        Gap: {point.value >= 0 ? '+' : ''}{point.value.toFixed(2)}%
      </p>
    </div>
  );
}

export default function HistoricalPredictedChart({ data }: Props) {
  if (!data.length) return null;

  // Separate into historical (solid) and predicted (shown as dashed segment)
  // We pass ALL points to one line, and overlay a second line just for the
  // last historical→predicted segment so we can style the dashed part.
  const lastHistoricalIndex = data.reduce(
    (acc, p, i) => (!p.isPredicted ? i : acc),
    0
  );

  // Build the handoff segment: last historical point + predicted point(s)
  const handoffData = data.slice(lastHistoricalIndex);

  // Determine y-axis domain with a little padding
  const gaps = data.map(d => d.gap);
  const minGap = Math.min(...gaps);
  const maxGap = Math.max(...gaps);
  const padding = Math.max(1, (maxGap - minGap) * 0.25);
  const yMin = parseFloat((minGap - padding).toFixed(1));
  const yMax = parseFloat((maxGap + padding).toFixed(1));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart
        data={data}
        margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 12, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          domain={[yMin, yMax]}
          tickFormatter={v => `${v}%`}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          width={48}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12 }}
          formatter={(value) =>
            value === 'gap' ? 'Historical Performance Gap' : 'Predicted Gap'
          }
        />
        {/* Zero reference line */}
        <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="4 2" />

        {/* Historical line — solid blue */}
        <Line
          data={data.filter(d => !d.isPredicted)}
          dataKey="gap"
          name="gap"
          type="monotone"
          stroke="#3b82f6"
          strokeWidth={2.5}
          dot={<CustomDot />}
          activeDot={{ r: 6 }}
          isAnimationActive
        />

        {/* Dashed handoff segment: last historical → predicted */}
        <Line
          data={handoffData}
          dataKey="gap"
          name="predicted"
          type="monotone"
          stroke="#3b82f6"
          strokeWidth={2.5}
          strokeDasharray="6 4"
          dot={<CustomDot />}
          activeDot={{ r: 6 }}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
