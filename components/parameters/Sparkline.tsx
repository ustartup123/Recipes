"use client";

import { LineChart, Line, ResponsiveContainer } from "recharts";
import type { ParameterEntry } from "@/lib/types";
import { PARAMETER_COLORS } from "@/lib/types";

interface SparklineProps {
  entries: ParameterEntry[];
  parameter: string;
  height?: number;
}

export function Sparkline({ entries, parameter, height = 40 }: SparklineProps) {
  const data = [...entries]
    .reverse()
    .slice(-20)
    .filter((e) => e[parameter as keyof ParameterEntry] != null)
    .map((e) => ({ value: e[parameter as keyof ParameterEntry] as number }));

  if (data.length < 2) return null;

  const color = PARAMETER_COLORS[parameter] || "#14b8a6";

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
