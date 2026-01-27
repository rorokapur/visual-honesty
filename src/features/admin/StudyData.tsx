import {
  Button,
  Container,
  Flex,
  Group,
  LoadingOverlay,
  Pagination,
  Table,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { getSupabaseAdmin } from "../../lib/supabase";

/**
 * Displays all response data (latest first) and allows downloads in csv format
 * @component
 */
export function StudyData() {
  const [loading, setLoading] = useState<boolean>(false);
  // TODO: Change this once we have a solidified set of collected info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any[]>([]);
  const [page, setPage] = useState<number>(1);
  const [pageCount, setPageCount] = useState<number>(0);
  const [refresh, setRefresh] = useState(0);

  // Fetches CSV data and triggers a download
  const downloadCsv = async () => {
    const { data } = await getSupabaseAdmin()
      .from("responses")
      .select(
        "*, sets(name), left_stim:stimuli!responses_left_stimulus_fkey(name), right_stim:stimuli!responses_right_stimulus_fkey(name), selected_stim:stimuli!responses_selected_stimulus_fkey(name)",
      );

    if (data) {
      // Flatten joined data for CSV export
      const flattenedData = data.map((row) => ({
        ...row,
        set_name: row.sets?.name ?? "",
        left_stimulus_name: row.left_stim?.name ?? "",
        right_stimulus_name: row.right_stim?.name ?? "",
        selected_stimulus_name: row.selected_stim?.name ?? "",
        sets: undefined,
        left_stim: undefined,
        right_stim: undefined,
        selected_stim: undefined,
      }));

      // Convert to CSV
      const headers = Object.keys(flattenedData[0] || {}).filter(
        (key) => flattenedData[0][key] !== undefined,
      );
      const csvRows = [
        headers.join(","),
        ...flattenedData.map((row) =>
          headers
            .map((header) => {
              const value = row[header];
              // Escape values with commas or quotes
              if (
                typeof value === "string" &&
                (value.includes(",") || value.includes('"'))
              ) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value ?? "";
            })
            .join(","),
        ),
      ];
      const csvString = csvRows.join("\n");

      const blob = new Blob([csvString], { type: "text/csv" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "responses_" + Date.now() + ".csv";
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Load data on page change or refresh button
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const supabase = getSupabaseAdmin();

      const { count } = await supabase
        .from("responses")
        .select("*", { count: "exact", head: true });

      const { data: results } = await supabase
        .from("responses")
        .select(
          "*, sets(name), left_stim:stimuli!responses_left_stimulus_fkey(name), right_stim:stimuli!responses_right_stimulus_fkey(name), selected_stim:stimuli!responses_selected_stimulus_fkey(name)",
        )
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

  // Map JSON response to table entry
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

      <Table>
        <LoadingOverlay visible={loading} />
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
    </Container>
  );
}
