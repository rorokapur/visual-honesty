import { Group, Paper, Stack, Text } from "@mantine/core";
import type { ParticipantResults } from "../../lib/participant_results";

interface ResultsCardProps {
  /** Perfomance data to display */
  data: ParticipantResults | null;
}

const getMessage = (percentile: number): string => {
  if (percentile > 90) {
    return "You're a master at catching deception!";
  } else if (percentile > 50) {
    return "You're hard to fool!";
  } else {
    return "You're starting to gain an intuition when you are being deceived.";
  }
};

/**
 * Card that display participant results data
 * @component
 */
export function ResultsCard({ data }: ResultsCardProps) {
  if (!data) {
    return (
      <>
        <Paper p="xl" radius="md" withBorder w="100%">
          <Stack gap="lg">
            <Group justify="space-between">
              <Text fw={500}>Correct Answers</Text>
              <Text size="lg" fw={700}>
                - / -
              </Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Accuracy:</Text>
              <Text size="lg" fw={700}>
                -%
              </Text>
            </Group>
            <Group justify="space-between">
              <Text fw={500}>Average Time:</Text>
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
    <Paper p="xl" radius="md" withBorder>
      <Stack gap="lg">
        <Text size="lg">
          You perfomed the same as or better than <b>{data.percentile}%</b> of
          the <b>{data.total_users}</b> other participants that took this test
          {data.percentile > 50 ? "!" : "."} {getMessage(data.percentile)}
        </Text>
        <Group justify="space-between">
          <Text fw={500}>Correct Answers:</Text>
          <Text size="lg" fw={700}>
            {data.correct_answers} / {data.total_questions}
          </Text>
        </Group>
        <Group justify="space-between">
          <Text fw={500}>Accuracy:</Text>
          <Text size="lg" fw={700}>
            {data.accuracy_percentage}%
          </Text>
        </Group>
        <Group justify="space-between">
          <Text fw={500}>Avg. Time:</Text>
          <Text size="lg" fw={700}>
            {`${Math.floor(data.average_time / 60000)}:${Math.floor(
              (data.average_time % 60000) / 1000,
            )
              .toString()
              .padStart(2, "0")}`}
          </Text>
        </Group>
      </Stack>
    </Paper>
  );
}
