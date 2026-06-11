// FINANCE FORK: shared sparkline primitive distilled from AreaGraph.tsx.
import React, { useId } from 'react';

import { theme } from '@actual-app/components/theme';
import {
  Area,
  AreaChart,
  ReferenceLine,
  ResponsiveContainer,
  YAxis,
} from 'recharts';

export type CompactAreaPoint = { x: string | number; y: number };

type CompactAreaChartProps = {
  data: CompactAreaPoint[];
  height?: number;
  /** Stroke + gradient color. Defaults to theme.reportsBlue. */
  color?: string;
  /** Optional horizontal reference line (e.g. trailing-3-mo avg, zero). */
  referenceY?: number | null;
};

export function CompactAreaChart({
  data,
  height = 80,
  color,
  referenceY,
}: CompactAreaChartProps) {
  const gid = useId();
  const strokeColor = color ?? theme.reportsBlue;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.4} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis hide domain={['auto', 'auto']} />
        {referenceY != null && (
          <ReferenceLine
            y={referenceY}
            stroke={theme.pageTextSubdued}
            strokeDasharray="3 3"
          />
        )}
        <Area
          type="monotone"
          dataKey="y"
          stroke={strokeColor}
          strokeWidth={1.5}
          fill={`url(#${gid})`}
          isAnimationActive={false}
          dot={false}
          activeDot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
