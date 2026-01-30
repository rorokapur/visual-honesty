import {
  Center,
  Container,
  Group,
  LoadingOverlay,
  Paper,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import {
  fetchResults,
  type ParticipantResults,
} from "../../lib/participant_results";

interface ResultsProps {
  /** Session ID of user to fetch statistics for */
  session: string;
}

/**
 * Results page displayed after survey completion
 */
export function Results({ session }: ResultsProps) {
  const [data, setData] = useState<ParticipantResults | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadResults = async () => {
      setLoading(true);
      const results = await fetchResults(session);
      if (results) {
        setData(results);
      } else {
        alert("An error occured while trying to fetch your results!");
      }
      setLoading(false);
    };
    loadResults();
  }, [session]);

  return (
    <>
      <header style={{ background: "white" }}>
        <Container px="md">
          <Center style={{ padding: "16px 0" }}>
            <Title ta="center">Survey Complete!</Title>
          </Center>
        </Container>
      </header>
      <main>
        <Container size="sm" px="md">
          <Stack align="center" gap="md">
            <LoadingOverlay visible={loading} />
            {data ? (
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
                      {data.accuracy_percentage.toFixed(1)}%
                    </Text>
                  </Group>
                </Stack>
              </Paper>
            ) : (
              <></>
            )}
          </Stack>
        </Container>
      </main>
    </>
  );
}
