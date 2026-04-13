import {
  Button,
  FileInput,
  NativeSelect,
  Notification,
  Stack,
  TextInput,
} from "@mantine/core";
import { useEffect, useState } from "react";
import { uploadStimulusPair } from "../../lib/admin";
import { fetchPublicCategories } from "../../lib/contribute";

interface StimuliUploadProps {
  /**
   * callback for upload success (i.e. close upload window if using a modal)
   */
  onSuccess?: () => void;
}

/**
 * Uploads images into a stimuli set in the backend (used as a modal)
 *
 * NOTE: This might need to be phased out, since the contribution page
 * does the exact same thing with less clicks. A file-based upload with
 * names and categories extracted from filenames and folder names may
 * also be a possible future addition.
 * @component
 */
export function StimuliUpload({ onSuccess }: StimuliUploadProps) {
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string>("");
  const [setName, setSetName] = useState("");
  const [honestFile, setHonestFile] = useState<File | null>(null);
  const [deceptiveFile, setDeceptiveFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    // Fetch categories
    const fetchCategories = async () => {
      try {
        const data = await fetchPublicCategories();
        setCategories(data);
        if (data.length > 0) setCategory(data[0]);
      } catch (err) {
        console.error("Failed to load categories:", err);
      }
    };
    fetchCategories();
  }, []);

  /**
   * Attempts to upload stimuli pair to the backend
   */
  const handleUpload = async () => {
    if (!honestFile || !deceptiveFile || !setName || !category) return;
    setLoading(true);
    setStatus(null);

    const formData = new FormData();
    formData.append("set_name", setName);
    formData.append("category", category);
    formData.append("honest_image", honestFile);
    formData.append("deceptive_image", deceptiveFile);

    try {
      await uploadStimulusPair(formData);

      setStatus({
        type: "success",
        message: "Stimuli pair uploaded successfully!",
      });

      // Reset form
      setSetName("");
      setHonestFile(null);
      setDeceptiveFile(null);

      // Delay success callback to let them see message
      setTimeout(() => onSuccess?.(), 1000);
    } catch (error: unknown) {
      console.error("Upload failed:", error);
      const message = error instanceof Error ? error.message : "An error occurred!";
      setStatus({
        type: "error",
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack maw={400} mx="auto" mt="xl">
      {status && (
        <Notification
          color={status.type === "error" ? "red" : "green"}
          onClose={() => setStatus(null)}
        >
          {status.message}
        </Notification>
      )}

      <TextInput
        label="Stimuli Set Name"
        placeholder="e.g. Modern Architecture"
        value={setName}
        onChange={(e) => setSetName(e.currentTarget.value)}
        required
      />

      <NativeSelect
        label="Category"
        description="Select an approved category"
        data={categories}
        value={category}
        onChange={(e) => setCategory(e.currentTarget.value)}
        required
        disabled={categories.length === 0}
      />

      <FileInput
        label="Honest Image"
        placeholder="Select real/human image"
        value={honestFile}
        onChange={setHonestFile}
        accept="image/png,image/jpeg,image/webp"
        required
      />

      <FileInput
        label="Deceptive Image"
        placeholder="Select fake/AI image"
        value={deceptiveFile}
        onChange={setDeceptiveFile}
        accept="image/png,image/jpeg,image/webp"
        required
      />

      <Button
        onClick={handleUpload}
        loading={loading}
        disabled={!honestFile || !deceptiveFile || !setName || !category}
      >
        Upload Pair
      </Button>
    </Stack>
  );
}
