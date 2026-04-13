import {
  Box,
  Button,
  Container,
  Flex,
  Group,
  LoadingOverlay,
  Pagination,
  Table,
} from "@mantine/core";
import { useEffect, useState } from "react";

import { exportResponsesCsv, fetchResponses } from "../../lib/admin";

/**
 * Displays all response data (latest first) and allows downloads in csv format
 * @component
 */
export function DataViewer() {
  const [loading, setLoading] = useState<boolean>(false);
  // TODO: Change once we have more concrete data format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageCount, setPageCount] = useState<number>(0);
  const [refresh, setRefresh] = useState(0);

  /**
   * Fetches data from the server, converts to csv and triggers download
   */
  const downloadCsv = async () => {
    try {
      await exportResponsesCsv();
    } catch (e) {
      console.error("Failed to export CSV:", e);
      alert("Failed to export CSV data");
    }
  };

  // Load data on page change or refresh button
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const body = await fetchResponses(page);
        if (body.count) {
          setPageCount(Math.ceil(body.count / 50));
        }
        if (body.results) {
          setData(body.results);
        }
      } catch (e) {
        console.error("Failed to fetch responses:", e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [page, refresh]);

  /**
   * Table entries mapped to the JSON response
   */
  const rows = data?.map((row) => (
    <Table.Tr key={row.created_at + row.pair_id}>
      <Table.Td>{row.created_at}</Table.Td>
      <Table.Td>{row.session_id}</Table.Td>
      <Table.Td>{row.sets?.name ?? row.set_id}</Table.Td>
      <Table.Td>{row.left_stim?.name ?? row.left_stimulus}</Table.Td>
      <Table.Td>{row.right_stim?.name ?? row.right_stimulus}</Table.Td>
      <Table.Td>{row.selected_stim?.name ?? row.selected_stimulus}</Table.Td>
      <Table.Td>{row.selected_side}</Table.Td>
    </Table.Tr>
  ));

  return (
    <Container>
      <Flex justify={"space-between"}>
        <Group>
          <Button
            onClick={() => setRefresh((r) => r + 1)}
            variant="outline"
            size="sm"
          >
            Refresh
          </Button>
          <Button onClick={() => downloadCsv()} variant="outline" size="sm">
            Export data (csv)
          </Button>
        </Group>
        <Pagination
          total={pageCount}
          value={page}
          onChange={setPage}
          withPages={true}
        />
      </Flex>
      <Box pos="relative" mih={200}>
        <LoadingOverlay visible={loading} />
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Created At</Table.Th>
              <Table.Th>Session ID</Table.Th>
              <Table.Th>Set</Table.Th>
              <Table.Th>Left</Table.Th>
              <Table.Th>Right</Table.Th>
              <Table.Th>Selected Answer</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>{rows}</Table.Tbody>
        </Table>
      </Box>
    </Container>
  );
}
