import {
  Anchor,
  Box,
  Button,
  Container,
  Flex,
  Group,
  Image,
  LoadingOverlay,
  Modal,
  Stack,
  Table,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState } from "react";
import { deleteStimulus } from "../../lib/storage";
import { getSupabaseAdmin } from "../../lib/supabase";
import { StimuliUpload } from "./StimuliUpload";

interface StimulusRow {
  image_id: string;
  set_id: string;
  image_url: string;
  is_deceptive: number;
}

interface StimuliSet {
  set_id: string;
  rows: StimulusRow[];
}

export function StimuliManager() {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<StimuliSet[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [uploadOpened, { open, close }] = useDisclosure(false);

  const handleDelete = async (imageId: string) => {
    setLoading(true);
    try {
      await deleteStimulus(imageId);
      setRefresh((r) => r + 1);
    } catch (error) {
      alert("Failed to delete:" + error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const supabase = getSupabaseAdmin();

      const { data: stimuli } = await supabase.from("stimuli").select("*");

      if (stimuli) {
        const grouped = (stimuli as StimulusRow[]).reduce<
          Record<string, StimuliSet>
        >((acc, row) => {
          if (!acc[row.set_id]) {
            acc[row.set_id] = { set_id: row.set_id, rows: [] };
          }
          acc[row.set_id].rows.push(row);
          return acc;
        }, {});

        setData(Object.values(grouped));
      }
      setLoading(false);
    };

    loadData();
  }, [refresh]);

  const tables = data.map((set) => (
    <Box key={set.set_id} mb="xl">
      <Title order={4} mb="xs">
        {set.set_id}
      </Title>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Image ID</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Image</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {set.rows.map((row) => (
            <Table.Tr key={row.image_id}>
              <Table.Td>{row.image_id}</Table.Td>
              <Table.Td>
                {row.is_deceptive === 1 ? "Deceptive" : "Honest"}
              </Table.Td>
              <Table.Td>
                <Anchor
                  href={row.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image
                    src={row.image_url}
                    alt={row.image_id}
                    w={100}
                    fit="contain"
                  />
                </Anchor>
              </Table.Td>
              <Table.Td>
                <Anchor onClick={() => handleDelete(row.image_id)}>
                  Delete
                </Anchor>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Box>
  ));

  return (
    <Container>
      <Modal
        opened={uploadOpened}
        onClose={close}
        title="Upload New Stimulus"
        size="lg"
        centered
      >
        <StimuliUpload
          onSuccess={() => {
            close();
            setTimeout(() => setRefresh((r) => r + 1), 1500);
          }}
        />
      </Modal>

      <Flex justify={"space-between"} mb="md">
        <Group>
          <Button
            onClick={() => setRefresh((r) => r + 1)}
            variant="outline"
            size="sm"
          >
            Refresh
          </Button>
          <Button onClick={open} variant="outline" size="sm">
            Add Stimulus
          </Button>
        </Group>
      </Flex>
      <Box pos="relative">
        <LoadingOverlay visible={loading} />
        <Stack>{tables}</Stack>
      </Box>
    </Container>
  );
}
