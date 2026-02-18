import { RadarChart } from "@mantine/charts";
import { Paper, Stack, Text } from "@mantine/core";
import type { CategoryStats } from "../../lib/participant_results";

interface CategoryRadarChartProps {
  data: CategoryStats[];
}

interface TooltipItem {
  dataKey?: string | number | null;
  value?: string | number | null;
}

interface TooltipProps {
  active?: boolean;
  payload?: readonly TooltipItem[];
  label?: string | number;
}

export function CategoryRadarChart({ data }: CategoryRadarChartProps) {
  const tooltipContent = ({ active, payload, label }: TooltipProps) => {
    if (!active || !payload || payload.length === 0) return null;

    const user = payload.find((item) => item.dataKey === "user");
    const average = payload.find((item) => item.dataKey === "average");

    const userValue = typeof user?.value === "number" ? user.value : null;
    const averageValue =
      typeof average?.value === "number" ? average.value : null;

    return (
      <Paper shadow="sm" radius="md" p="sm" withBorder>
        <Stack gap={4}>
          <Text fw={600}>{label}</Text>
          {userValue !== null && (
            <Text size="sm" c="blue.6">
              Your Accuracy: {userValue}%
            </Text>
          )}
          {averageValue !== null && (
            <Text size="sm" c="gray.7">
              Avg. Participant: {averageValue}%
            </Text>
          )}
        </Stack>
      </Paper>
    );
  };

  return (
    <RadarChart
      withDots
      withTooltip
      withPolarGrid
      h="100%"
      w="100%"
      style={{ width: 360 }}
      data={data}
      dataKey="category"
      series={[
        { name: "user", color: "blue.4", opacity: 0.2 },
        { name: "average", color: "grey", opacity: 0.2 },
      ]}
      polarGridProps={{
        stroke: "rgba(0,0,0,0.12)",
        strokeDasharray: "3 3",
      }}
      radarProps={{
        stroke: "#1f6feb",
        fill: "#1f6feb",
        fillOpacity: 0.2,
      }}
      tooltipProps={{ content: tooltipContent }}
    />
  );
}
