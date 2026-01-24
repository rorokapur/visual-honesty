import {
  Button,
  Center,
  Container,
  Flex,
  Group,
  Loader,
  Pagination,
  Table,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { getSupabaseAdmin } from "../../lib/supabase";

export function StudyData() {
  const [loading, setLoading] = useState<boolean>(false);
  // TODO: Change this once we have a solidified set of collected info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageCount, setPageCount] = useState<number>(0);
  const [refresh, setRefresh] = useState(0);

  const downloadCsv = async () => {
    const { data } = await getSupabaseAdmin().from("responses").select().csv();
    if (data) {
      const blob = new Blob([data], { type: "csv" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "responses_" + Date.now() + ".csv";
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const supabase = getSupabaseAdmin();

      const { count } = await supabase
        .from("responses")
        .select("*", { count: "exact", head: true });

      const { data: results } = await supabase
        .from("responses")
        .select("*")
        .order("created_at", { ascending: false })
        .range(
          (page - 1) * 50,
          Math.min((page - 1) * 50 + 49, count ? count : 0 - 1),
        );

      if (count) {
        setPageCount(Math.ceil(count / 50));
      }
      if (results) {
        setData(results);
        setLoading(false);
      }
    };

    loadData();
  }, [page, refresh]);

  if (loading) {
    return (
      <Center>
        <Loader></Loader>
      </Center>
    );
  }

  const rows = data?.map((row) => (
    <Table.Tr key={row.created_at + row.pair_id}>
      <Table.Td>{row.created_at}</Table.Td>
      <Table.Td>{row.session_id}</Table.Td>
      <Table.Td>{row.pair_id}</Table.Td>
      <Table.Td>{row.selected_answer}</Table.Td>
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

      <Table>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Created At</Table.Th>
            <Table.Th>Session ID</Table.Th>
            <Table.Th>Pair ID</Table.Th>
            <Table.Th>Selected Answer</Table.Th>
            <Table.Th>Selected Side</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>{rows}</Table.Tbody>
      </Table>
    </Container>
  );
}
