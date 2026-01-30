import {
  Anchor,
  Box,
  Button,
  Container,
  Flex,
  Group,
  Image,
  LoadingOverlay,
  Stack,
  Table,
  Text,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import {
  downloadStatsCsv,
  fetchStats,
  type SetStats,
} from "../../lib/study_data";

/**
 * Interface for viewing, uploading and deleting stimuli and stimuli sets
 * @component
 */
export function ResultsViewer() {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<SetStats[] | null>([]);
  const [refresh, setRefresh] = useState(0);

  // Load stimuli data from Supabase and format to rows and sets
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchStats();
        if (data) {
          setData(data);
        }
      } catch {
        setData(null);
      }
      setLoading(false);
    };

    loadData();
  }, [refresh]);

  if (data == null) {
    return <Text>Results could not be fetched at this time.</Text>;
  }

  // Generate tables for each stimuli set
  const tables = data.map((set) => (
    <Box key={set.set_id} mb="xl">
      <Group mb="xs">
        <Title order={4}>{set.set_name}</Title>
      </Group>
      <Table striped highlightOnHover withTableBorder withColumnBorders>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Honest Stimulus</Table.Th>
            <Table.Th>Preview</Table.Th>
            <Table.Th>Deceptive Stimulus</Table.Th>
            <Table.Th>Preview</Table.Th>
            <Table.Th>Total Reponses</Table.Th>
            <Table.Th>Correct Responses</Table.Th>
            <Table.Th>Correct Rate</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {set.rows.map((row) => (
            <Table.Tr key={`${row.honest_name}-${row.deceptive_name}`}>
              <Table.Td>{row.honest_name}</Table.Td>
              <Table.Td>
                <Anchor
                  href={row.honest_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image
                    src={row.honest_url}
                    alt={row.honest_name}
                    w={100}
                    fit="contain"
                  />
                </Anchor>
              </Table.Td>
              <Table.Td>{row.deceptive_name}</Table.Td>
              <Table.Td>
                <Anchor
                  href={row.honest_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image
                    src={row.deceptive_url}
                    alt={row.deceptive_name}
                    w={100}
                    fit="contain"
                  />
                </Anchor>
              </Table.Td>
              <Table.Td>{row.total_responses}</Table.Td>
              <Table.Td>{row.correct_count}</Table.Td>
              <Table.Td>{row.accuracy_percent}%</Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Box>
  ));

  return (
    <Container>
      <Flex justify={"space-between"} mb="md">
        <Group>
          <Button
            onClick={() => setRefresh((r) => r + 1)}
            variant="outline"
            size="sm"
          >
            Refresh
          </Button>
          <Button
            onClick={() => downloadStatsCsv()}
            variant="outline"
            size="sm"
          >
            Export results (csv)
          </Button>
        </Group>
      </Flex>
      <Box pos="relative" mih={200}>
        <LoadingOverlay visible={loading} />
        <Stack>{tables}</Stack>
      </Box>
    </Container>
  );
}
