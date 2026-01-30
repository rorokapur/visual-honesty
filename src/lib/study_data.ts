import { getSupabaseAdmin } from "./supabase";

export interface PairStat {
  set_id: string;
  set_name: string;

  honest_name: string;
  honest_url: string;

  deceptive_name: string;
  deceptive_url: string;

  total_responses: number;
  correct_count: number;
  accuracy_percent: number;
}

export interface SetStats {
  set_id: string;
  set_name: string;
  rows: PairStat[];
}

export const fetchStats = async () => {
  const supabase = getSupabaseAdmin();

  const { data: stats, error } = await supabase.from("pair_stats").select("*");

  if (error) {
    throw new Error(error.message);
  }

  if (!stats || stats.length === 0) {
    return [];
  }

  if (stats) {
    const grouped = stats.reduce<Record<string, SetStats>>((acc, row) => {
      if (!acc[row.set_id]) {
        acc[row.set_id] = {
          set_id: row.set_id,
          set_name: row.set_name,
          rows: [],
        };
      }

      // Push the current stats row into the correct Set
      acc[row.set_id].rows.push(row);

      return acc;
    }, {});

    return Object.values(grouped);
  }
};

export const downloadStatsCsv = async () => {
  const stats = await fetchStats();

  if (!stats || stats.length === 0) {
    return;
  }

  // Flatten SetStats[] into PairStat[] rows for CSV export
  const flattenedData: PairStat[] = stats.flatMap((set) => set.rows);

  if (flattenedData.length === 0) {
    return;
  }

  // Convert to CSV
  const headers: (keyof PairStat)[] = [
    "set_id",
    "set_name",
    "honest_name",
    "honest_url",
    "deceptive_name",
    "deceptive_url",
    "total_responses",
    "correct_count",
    "accuracy_percent",
  ];

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
  a.download = "pair_stats_" + Date.now() + ".csv";
  a.click();
  URL.revokeObjectURL(url);
};
