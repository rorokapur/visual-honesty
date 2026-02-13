import { Group, Paper, Stack, Text } from "@mantine/core";
import type { ParticipantResults } from "../../lib/participant_results";

interface ResultsCardProps {
  /** Perfomance data to display */
  data: ParticipantResults | null;
}

/**
 * Card that display participant results data
 * @component
 */
export function ResultsCard({ data }: ResultsCardProps) {
  if (!data) {
    return (
      <>
        <Paper p="xl" radius="md" withBorder w="75%">
          <Stack gap="lg">
            <Group justify="space-between">
              <Text fw={500}>Total Questions Answered:</Text>
              <Text size="lg" fw={700}>
                -
              </Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Correct Answers:</Text>
              <Text size="lg" fw={700}>
                -
              </Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Average Time Taken:</Text>
              <Text size="lg" fw={700}>
                -
              </Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Percentage Correct:</Text>
              <Text size="lg" fw={700}>
                -
              </Text>
            </Group>
          </Stack>
        </Paper>
      </>
    );
  }

  return (
    <Paper p="xl" radius="md" withBorder w="75%">
      <Stack gap="lg">
        <Group justify="space-between">
          <Text fw={500}>Total Questions Answered:</Text>
          <Text size="lg" fw={700}>
            {data.total_questions}
          </Text>
        </Group>
        <Group justify="space-between">
          <Text fw={500}>Correct Answers:</Text>
          <Text size="lg" fw={700}>
            {data.correct_answers}
          </Text>
        </Group>
        <Group justify="space-between">
          <Text fw={500}>Percentage Correct:</Text>
          <Text size="lg" fw={700}>
            {data.accuracy_percentage}%
          </Text>
        </Group>
        <Group justify="space-between">
          <Text fw={500}>Average Time Taken:</Text>
          <Text size="lg" fw={700}>
            {`${Math.floor(data.average_time / 60000)}:${Math.floor(
              (data.average_time % 60000) / 1000,
            )
              .toString()
              .padStart(2, "0")}`}
          </Text>
        </Group>
        <Group justify="space-between">
          <Text fw={500}>Percentile:</Text>
          <Text size="lg" fw={700}>
            {data.percentile}%
          </Text>
        </Group>
      </Stack>
    </Paper>
  );
}
