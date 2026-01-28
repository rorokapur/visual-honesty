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
  Switch,
  Table,
  Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { useEffect, useState } from "react";
import {
  deleteStimulus,
  type StimuliSet,
  type Stimulus,
} from "../../lib/storage";
import { getSupabaseAdmin } from "../../lib/supabase";
import { StimuliUpload } from "./StimuliUpload";

/**
 * Interface for viewing, uploading and deleting stimuli and stimuli sets
 * @component
 */
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
      alert("Failed to delete:" + JSON.stringify(error));
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSetEnabled = async (setId: string, enabled: boolean) => {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase
      .from("sets")
      .update({ enabled })
      .eq("id", setId);

    if (error) {
      alert("Failed to update set: " + JSON.stringify(error));
    } else {
      setData((prev) =>
        prev.map((set) => (set.set_id === setId ? { ...set, enabled } : set)),
      );
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const supabase = getSupabaseAdmin();

      const { data: stimuli } = await supabase
        .from("stimuli")
        .select("*, sets!inner(name, enabled)");

      if (stimuli) {
        const grouped = (
          stimuli as (Stimulus & {
            sets: { name: string; enabled: boolean };
          })[]
        ).reduce<Record<string, StimuliSet>>((acc, row) => {
          if (!acc[row.set_id]) {
            acc[row.set_id] = {
              set_id: row.set_id,
              set_name: row.sets.name,
              enabled: row.sets.enabled,
              rows: [],
            };
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
      <Group mb="xs">
        <Title order={4}>{set.set_name}</Title>
        <Switch
          label={set.enabled ? "Enabled" : "Disabled"}
          checked={set.enabled}
          onChange={(e) =>
            handleToggleSetEnabled(set.set_id, e.currentTarget.checked)
          }
        />
      </Group>
      <Table striped highlightOnHover withTableBorder>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Type</Table.Th>
            <Table.Th>Image</Table.Th>
            <Table.Th></Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {set.rows.map((row) => (
            <Table.Tr key={row.id}>
              <Table.Td>{row.name}</Table.Td>
              <Table.Td>{row.is_deceptive ? "Deceptive" : "Honest"}</Table.Td>
              <Table.Td>
                <Anchor
                  href={row.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image
                    src={row.image_url}
                    alt={row.name}
                    w={100}
                    fit="contain"
                  />
                </Anchor>
              </Table.Td>
              <Table.Td>
                <Anchor onClick={() => handleDelete(row.id)}>Delete</Anchor>
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
