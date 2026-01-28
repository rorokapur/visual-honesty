import {
  Button,
  FileInput,
  NativeSelect,
  Notification,
  Stack,
  TextInput,
} from "@mantine/core";
import { useState } from "react";
import { uploadStimulus } from "../../lib/storage";

interface StimuliUploadProps {
  /**
   * callback for upload success (i.e. close upload window if using a modal)
   */
  onSuccess?: () => void;
}

/**
 * Uploads images into a stimuli set in supabase (used as a modal)
 * @component
 */
export function StimuliUpload({ onSuccess }: StimuliUploadProps) {
  const [file, setfile] = useState<File | null>(null);
  const [isDeceptive, setIsDeceptive] = useState<boolean>(false);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  /**
   * Attempts to upload stimulus to Supabase
   */
  const handleUpload = async () => {
    if (!file || !name) return;
    setLoading(true);
    setStatus(null);

    try {
      uploadStimulus(file, name, isDeceptive);
      setStatus({
        type: "success",
        message: "Stimuli set uploaded successfully!",
      });

      // Reset form
      setfile(null);
      setName("");
    } catch (error: unknown) {
      console.error("Upload failed:", error);
      setStatus({ type: "error", message: "An error occurred!" });
    } finally {
      setLoading(false);
      onSuccess?.();
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
        placeholder=""
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        required
      />

      <FileInput
        label="Image"
        placeholder="Click to select file"
        value={file}
        onChange={setfile}
        accept="image/png,image/jpeg"
        required
      />

      <NativeSelect
        label="Type"
        description="Input description"
        data={["Honest", "Deceptive"]}
        value={isDeceptive ? "Deceptive" : "Honest"}
        onChange={(e) => setIsDeceptive(e.currentTarget.value === "Deceptive")}
      />

      <Button
        onClick={handleUpload}
        loading={loading}
        disabled={!file || !name}
      >
        Upload
      </Button>
    </Stack>
  );
}
