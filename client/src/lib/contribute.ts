/**
 * Fetches the list of valid, enabled categories for the public contribution dropdown.
 */
export const fetchPublicCategories = async (): Promise<string[]> => {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const res = await fetch(`${apiUrl}/api/developer/categories`);
  const data = await res.json();
  if (Array.isArray(data)) {
    return data;
  }
  return [];
};

/**
 * Uploads a public contributor's pair to the moderation queue.
 */
export const uploadContributionPair = async (formData: FormData): Promise<void> => {
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
  const res = await fetch(`${apiUrl}/api/developer/upload`, {
    method: "POST",
    body: formData,
  });
  
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || "Upload failed");
  }
};
