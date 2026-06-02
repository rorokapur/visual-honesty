import { ColorSwatch, Group, Paper, Stack, Text } from "@mantine/core";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimeAccuracyBenchmarkData } from "../../lib/participant";

interface TAChartProps {
  /** Benchmark data to display curve */
  data: TimeAccuracyBenchmarkData;

  /** Current user data to display as point */
  currentUser: { time: number; accuracy: number };
}

/**
 * A line chart showing a benchmark curve of the relationship between time and accuracy over a participant dataset
 * @component
 */
export function TimeAccuracyChart({ data, currentUser }: TAChartProps) {
  // Transform data: convert ms to seconds and sort by time
  const chartData = data.trend
    .map((d) => ({
      ...d,
      time: d.x / 1000, // Convert to seconds
      range: [d.range_min, d.range_max],
    }))
    .sort((a, b) => a.time - b.time);

  const userTime = currentUser.time / 1000;

  return (
    <Paper p="md" withBorder radius="md">
      <Stack gap="xs" align="center">
        <Text fw={600} size="sm" c="#00d346" tt="uppercase" ta="center">
          Performance
        </Text>
        <Group gap="lg">
          <Group gap={6}>
            <ColorSwatch color="#00d346" size={10} />
            <Text size="xs" fw={500} c="#00d346">
              You
            </Text>
          </Group>
          <Group gap={6}>
            <div
              style={{
                width: 14,
                height: 3,
                backgroundColor: "#00d346",
                borderRadius: 0,
              }}
            />
            <Text size="xs" fw={500} c="#00d346">
              Average Trend
            </Text>
          </Group>
          <Group gap={6}>
            <div
              style={{
                width: 14,
                height: 10,
                backgroundColor: "rgba(0, 211, 70, 0.2)",
                borderRadius: 0,
              }}
            />
            <Text size="xs" fw={500} c="#00d346">
              Typical Range
            </Text>
          </Group>
        </Group>

        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, bottom: 45, left: 15 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#888888"
            />

            <XAxis
              dataKey="time"
              type="number"
              unit="s"
              domain={[
                (dataMin: number) =>
                  Math.min(Math.floor(dataMin || 0), Math.floor(userTime)),
                (dataMax: number) =>
                  Math.max(Math.ceil(dataMax || 0), Math.ceil(userTime)),
              ]}
              allowDataOverflow={false}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#00d346", fontSize: 10, fontFamily: '"VCR OSD Mono", monospace' }}
              dy={10}
              label={{
                value: "Avg. time per task (s)",
                position: "bottom",
                offset: 20,
                fill: "#00d346",
                fontSize: 11,
                fontFamily: '"VCR OSD Mono", monospace',
              }}
            />

            <YAxis
              unit="%"
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#00d346", fontSize: 10, fontFamily: '"VCR OSD Mono", monospace' }}
              label={{
                value: "Accuracy (%)",
                angle: -90,
                position: "insideLeft",
                offset: 5,
                fill: "#00d346",
                fontSize: 11,
                style: { textAnchor: "middle" },
                fontFamily: '"VCR OSD Mono", monospace',
              }}
            />

            <Tooltip
              cursor={{
                stroke: "rgba(0, 211, 70, 0.3)",
                strokeDasharray: "3 3",
              }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div
                      style={{
                        backgroundColor: "#151b25",
                        padding: "var(--mantine-spacing-xs)",
                        borderRadius: "0",
                        border: "2px solid #00d346",
                      }}
                    >
                      <Stack gap={4}>
                        <Text size="xs" fw={600} mb={4} c="#00d346">
                          Time: ~{Number(label).toFixed(1)}s
                        </Text>
                        {payload.map((p) => {
                          if (p.name === "Typical Range") return null;
                          return (
                            <Text key={p.name} size="sm" c={p.color === "var(--mantine-color-blue-4)" || p.color === "blue.4" ? "#00d346" : p.color}>
                              {p.name}:{" "}
                              {typeof p.value === "number"
                                ? Math.round(p.value)
                                : p.value}
                              %
                            </Text>
                          );
                        })}
                      </Stack>
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area
              dataKey="range"
              name="Typical Range"
              stroke="none"
              fill="rgba(0, 211, 70, 0.2)"
              type="monotone"
            />

            <Line
              dataKey="y"
              name="Average Trend"
              stroke="#00d346"
              strokeWidth={2}
              dot={false}
              type="monotone"
              activeDot={false}
            />

            <ReferenceDot
              x={userTime}
              y={currentUser.accuracy}
              r={6}
              fill="#00d346"
              stroke="#151b25"
              strokeWidth={2}
              label={{
                value: "You",
                position: "top",
                fill: "#00d346",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: '"Upheaval Pro", sans-serif',
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Stack>
    </Paper>
  );
}
