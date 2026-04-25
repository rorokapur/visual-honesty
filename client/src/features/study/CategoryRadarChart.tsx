import { RadarChart } from "@mantine/charts";
import { ColorSwatch, Group, Paper, Select, Stack, Text } from "@mantine/core";
import { useState } from "react";
import type { CategoryStats } from "../../lib/participant";

interface CategoryRadarChartProps {
  data: CategoryStats[];
}


/**
 * Radar chart that displays participant performance across categories with average user comparison
 * @component
 */
export function CategoryRadarChart({ data }: CategoryRadarChartProps) {
  const [comparisonGroup, setComparisonGroup] = useState<"ai" | "average">(
    "average",
  );
  // Generate tooltip element
  const tooltipContent = ({ active, payload, label }: { active?: boolean; payload?: readonly any[]; label?: string | number }) => {
    if (!active || !payload || payload.length === 0) return null;

    const user = payload.find((item) => item.dataKey === "user");
    const average = payload.find((item) => item.dataKey === "average");
    const ai = payload.find((item) => item.dataKey === "ai");

    const userValue = typeof user?.value === "number" ? user.value : null;
    const averageValue =
      typeof average?.value === "number" ? average.value : null;
    const aiValue = typeof ai?.value === "number" ? ai.value : null;

    return (
      <div
        style={{
          backgroundColor: "#151b25",
          padding: "var(--mantine-spacing-sm)",
          borderRadius: "0",
          border: "2px solid #00d346",
        }}
      >
        <Stack gap={4}>
          <Text fw={600}>{label}</Text>
          {userValue !== null && (
            <Text size="sm" c="#00d346">
              Your Accuracy: {userValue}%
            </Text>
          )}
          {averageValue !== null && (
            <Text size="sm" c="#888888">
              Avg. Player: {averageValue}%
            </Text>
          )}
          {aiValue !== null && (
            <Text size="sm" c="#888888">
              Avg. AI: {aiValue}%
            </Text>
          )}
        </Stack>
      </div>
    );
  };

  return (
    <Paper p="md" withBorder radius="md" h="100%" w="100%" pos="relative">
      <Select
        pos="absolute"
        top={10}
        right={10}
        size="xs"
        w={100}
        data={[
          { value: "average", label: "Players" },
          { value: "ai", label: "AI" },
        ]}
        value={comparisonGroup}
        onChange={(val) => val && setComparisonGroup(val as "ai" | "average")}
        allowDeselect={false}
      />
      <Stack gap="xs" align="center" h="100%" w="100%">
        <Text fw={600} size="sm" c="rgba(0, 211, 70, 0.5)" tt="uppercase" ta="center">
          Threat Detection
        </Text>
        <Group gap="lg">
          <Group gap={6}>
            <ColorSwatch color="#00d346" size={10} />
            <Text size="xs" fw={500} c="rgba(0, 211, 70, 0.5)">
              You
            </Text>
          </Group>
          <Group gap={6}>
            <ColorSwatch color="#888888" size={10} />
            <Text size="xs" fw={500} c="#888888">
              {comparisonGroup === "average"
                ? "Average Player"
                : "Average AI Agent"}
            </Text>
          </Group>
        </Group>
        <div
          style={{
            flex: 1,
            width: "100%",
            minHeight: 0,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <RadarChart
            withDots
            withTooltip
            withPolarGrid
            h="100%"
            w="100%"
            gridColor="#0a0d12"
            data={data}
            dataKey="category"
            series={[
              { name: comparisonGroup, color: "#888888", opacity: 0.3 },
              { name: "user", color: "#00d346", opacity: 0.2 },
            ]}
            polarGridProps={{
              stroke: "#0a0d12",
              strokeDasharray: "3 3",
            }}
            tooltipProps={{ content: tooltipContent }}
          />
        </div>
      </Stack>
    </Paper>
  );
}
