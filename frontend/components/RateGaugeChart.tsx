'use client';

import { ResponsiveContainer, Tooltip, PieChart, Pie, Cell } from 'recharts';

interface RateGaugeChartProps {
  rate: number;
  attended: number;
  total: number;
  unit?: string;
  activeLabel?: string;
}

export function RateGaugeChart({
  rate,
  attended,
  total,
  unit = '건',
  activeLabel = '참여율',
}: RateGaugeChartProps) {
  return (
    <div className="flex flex-col items-center -mb-2">
      <div className="w-full" style={{ height: 80 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[
                { name: activeLabel, value: rate },
                { name: '미참여',    value: 100 - rate },
              ]}
              cx="50%" cy="100%"
              startAngle={180} endAngle={0}
              innerRadius="70%" outerRadius="100%"
              dataKey="value"
              strokeWidth={0}
              isAnimationActive={true}
              animationBegin={0}
              animationDuration={900}
              animationEasing="ease-out"
            >
              <Cell fill="#0d6e69" />
              <Cell fill="rgba(13,110,105,0.1)" />
            </Pie>
            <Tooltip
              formatter={(v: number, name: string) =>
                name === activeLabel ? [`${v.toFixed(1)}%`, name] : (null as any)
              }
              contentStyle={{
                background: 'var(--color-surface-high)',
                border: 'none',
                borderRadius: 8,
                color: '#1a2535',
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="font-manrope text-3xl font-bold text-primary leading-none">
        {rate.toFixed(1)}%
      </div>
      <div className="font-jakarta text-xs text-on-surface/40 mt-1">
        {attended.toLocaleString()} / {total.toLocaleString()} {unit}
      </div>
    </div>
  );
}
