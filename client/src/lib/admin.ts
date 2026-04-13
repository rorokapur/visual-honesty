/**
 * Checks if the current user has a valid admin session.
 */
export const fetchAdminSession = async (): Promise<boolean> => {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  try {
    const res = await fetch(`${apiUrl}/api/admin/me`, {
      credentials: "include",
    });
    const data = await res.json();
    return data.success && data.user;
  } catch {
    return false;
  }
};

/**
 * Attempts to log in as an administrator.
 */
export const adminLogin = async (
  email: string,
  password: string,
): Promise<boolean> => {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const res = await fetch(`${apiUrl}/api/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });
  const data = await res.json();
  return data.success;
};

/** Admin category structure */
export interface AdminCategory {
  name: string;
  enabled: boolean;
  created_at: string;
}

/**
 * Fetches the master list of all categories.
 */
export const fetchAdminCategories = async (): Promise<AdminCategory[]> => {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const res = await fetch(`${apiUrl}/api/admin/categories`, {
    credentials: "include",
  });
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Failed to fetch.");
  return data;
};

/**
 * Safely creates a new Admin category.
 */
export const addCategory = async (name: string): Promise<void> => {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const res = await fetch(`${apiUrl}/api/admin/categories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name }),
  });
  const data = await res.json();
  if (!res.ok || !data.success)
    throw new Error(data.error || "Failed to add category");
};

/**
 * Safely deletes a category (will error if in use).
 */
export const deleteCategory = async (name: string): Promise<void> => {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const res = await fetch(
    `${apiUrl}/api/admin/categories/${encodeURIComponent(name)}`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );
  const data = await res.json();
  if (!res.ok || !data.success)
    throw new Error(data.error || "Failed to delete category");
};

/**
 * Fetches all stimuli data joined with sets information.
 */
export const fetchStimuli = async () => {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const res = await fetch(`${apiUrl}/api/admin/stimuli`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch stimuli");
  return await res.json();
};

/**
 * Toggles whether a stimulus set is actively enabled in the public study.
 */
export const toggleSetEnabled = async (
  setId: string,
  enabled: boolean,
): Promise<void> => {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const res = await fetch(`${apiUrl}/api/admin/sets/${setId}/toggle`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ enabled }),
  });
  const data = await res.json();
  if (!res.ok || !data.success)
    throw new Error(data.error || "Failed to update set");
};

/** Response Data structure */
export interface ResponseData {
  // TODO: replace this with a typed admin response payload.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  results: any[];
  count?: number;
}

/**
 * Fetches paginated response data.
 */
export const fetchResponses = async (page: number): Promise<ResponseData> => {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const res = await fetch(`${apiUrl}/api/admin/data/responses?page=${page}`, {
    credentials: "include",
  });
  return await res.json();
};

/**
 * Exports all responses to a dynamic CSV download.
 */
export const exportResponsesCsv = async (): Promise<void> => {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const res = await fetch(`${apiUrl}/api/admin/data/responses?all=true`, {
    credentials: "include",
  });
  const { results: data } = await res.json();

  if (!data || data.length === 0) return;

  // Flatten joined data for CSV export
  // TODO: formalize the response row shape before expanding CSV export logic.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flattenedData = data.map((row: any) => ({
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
    // TODO: replace the ad hoc row bag with a dedicated CSV export type.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...flattenedData.map((row: any) =>
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
};

/** A single stimulus entry in database/storage */
export interface Stimulus {
  id: string;
  set_id: string;
  image_url: string;
  is_deceptive: boolean;
  name: string;
}

/** A set of stimuli in database/storage */
export interface StimuliSet {
  set_id: string;
  set_name: string;
  category: string;
  enabled: boolean;
  rows: Stimulus[];
}

/**
 * Add an image to a stimuli set in the backend
 */
export async function uploadStimulus(
  file: File,
  setName: string,
  isDeceptive: boolean,
  category?: string,
  name?: string,
) {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("set_name", setName);
  formData.append("is_deceptive", String(isDeceptive));
  if (category) formData.append("category", category);
  if (name) formData.append("name", name);
  else formData.append("name", file.name.split(".")[0]);

  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const res = await fetch(`${apiUrl}/api/admin/stimulus/upload`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok || !data.success)
    throw new Error(data.error || "Failed to upload stimulus");
}

/**
 * Removes a specified image from the backend (db + storage)
 */
export async function deleteStimulus(id: string) {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const res = await fetch(`${apiUrl}/api/admin/stimuli/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok || !data.success)
    throw new Error(data.error || "Failed to delete stimulus");
}

/**
 * Uploads an honest and deceptive pair simultaneously to the backend
 */
export async function uploadStimulusPair(formData: FormData): Promise<void> {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const res = await fetch(`${apiUrl}/api/admin/stimulus/upload-pair`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Upload failed");
  }
}

/** Statistics for a given honest/deceptive pair of stimuli from the same set */
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

/** Gets the latest overall stats for all pairs from Supabase */
export const fetchStats = async (): Promise<SetStats[]> => {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const res = await fetch(`${apiUrl}/api/admin/data/pair-stats`, {
    credentials: "include",
  });
  const stats = await res.json();

  if (!res.ok) throw new Error(stats.error || "Failed to fetch stats");
  if (!stats || stats.length === 0) return [];

  const grouped = (stats as PairStat[]).reduce(
    (acc: Record<string, SetStats>, row: PairStat) => {
      if (!acc[row.set_id]) {
        acc[row.set_id] = {
          set_id: row.set_id,
          set_name: row.set_name,
          rows: [],
        };
      }
      acc[row.set_id].rows.push(row);
      return acc;
    },
    {},
  );

  return Object.values(grouped) as SetStats[];
};

/** Fetches all pair stats and triggers a csv download */
export const downloadStatsCsv = async () => {
  const stats = await fetchStats();
  if (!stats || stats.length === 0) return;

  const flattenedData: PairStat[] = stats.flatMap((set) => set.rows);
  if (flattenedData.length === 0) return;

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
