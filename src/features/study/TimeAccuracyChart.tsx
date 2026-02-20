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
import type { TimeAccuracyBenchmarkData } from "../../lib/participant_results";

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
  // Transform data: convert ms to seconds
  const chartData = data.trend.map((d) => ({
    ...d,
    time: d.x / 1000, // Convert to seconds
    range: [d.range_min, d.range_max],
  }));

  const userTime = currentUser.time / 1000;

  return (
    <Paper p="md" withBorder radius="md">
      <Stack gap="xs" align="center">
        <Text fw={600} size="sm" c="dimmed" tt="uppercase" ta="center">
          Speed vs. Accuracy Benchmark
        </Text>
        <Group gap="lg">
          <Group gap={6}>
            <ColorSwatch color="var(--mantine-color-blue-4)" size={10} />
            <Text size="xs" fw={500} c="dimmed">
              You
            </Text>
          </Group>
          <Group gap={6}>
            <div
              style={{
                width: 14,
                height: 3,
                backgroundColor: "var(--mantine-color-gray-6)",
                borderRadius: 2,
              }}
            />
            <Text size="xs" fw={500} c="dimmed">
              Average Trend
            </Text>
          </Group>
          <Group gap={6}>
            <div
              style={{
                width: 14,
                height: 10,
                backgroundColor: "var(--mantine-color-gray-3)",
                borderRadius: 2,
              }}
            />
            <Text size="xs" fw={500} c="dimmed">
              Typical Range
            </Text>
          </Group>
        </Group>

        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, bottom: 20, left: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--mantine-color-gray-2)"
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
              tick={{ fill: "var(--mantine-color-dimmed)", fontSize: 12 }}
              dy={10}
              label={{
                value: "Avg. time per question (s)",
                position: "bottom",
                offset: 0,
                fill: "var(--mantine-color-dimmed)",
                fontSize: 12,
              }}
            />

            <YAxis
              unit="%"
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--mantine-color-dimmed)", fontSize: 12 }}
              label={{
                value: "Accuracy (%)",
                angle: -90,
                position: "insideLeft",
                fill: "var(--mantine-color-dimmed)",
                fontSize: 12,
                style: { textAnchor: "middle" },
              }}
            />

            <Tooltip
              cursor={{
                stroke: "var(--mantine-color-gray-4)",
                strokeDasharray: "3 3",
              }}
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <Paper
                      withBorder
                      shadow="md"
                      radius="md"
                      p="xs"
                      bg="var(--mantine-color-body)"
                    >
                      <Stack gap={4}>
                        <Text size="xs" fw={600} mb={4}>
                          Time: ~{Number(label).toFixed(1)}s
                        </Text>
                        {payload.map((p) => {
                          if (p.name === "Typical Range") return null;
                          return (
                            <Text key={p.name} size="sm" c={p.color}>
                              {p.name}:{" "}
                              {typeof p.value === "number"
                                ? Math.round(p.value)
                                : p.value}
                              %
                            </Text>
                          );
                        })}
                      </Stack>
                    </Paper>
                  );
                }
                return null;
              }}
            />

            <Area
              dataKey="range"
              name="Typical Range"
              stroke="none"
              fill="var(--mantine-color-gray-2)"
              type="monotone"
            />

            <Line
              dataKey="y"
              name="Average Trend"
              stroke="var(--mantine-color-gray-6)"
              strokeWidth={2}
              dot={false}
              type="monotone"
              activeDot={false}
            />

            <ReferenceDot
              x={userTime}
              y={currentUser.accuracy}
              r={6}
              fill="var(--mantine-color-blue-4)"
              stroke="white"
              strokeWidth={2}
              label={{
                value: "You",
                position: "top",
                fill: "var(--mantine-color-blue-6)",
                fontSize: 12,
                fontWeight: 700,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </Stack>
    </Paper>
  );
}
