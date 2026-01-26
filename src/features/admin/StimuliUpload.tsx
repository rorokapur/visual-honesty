import {
  Button,
  FileInput,
  Notification,
  Stack,
  TextInput,
} from "@mantine/core";
import { useState } from "react";
import { uploadStimulus } from "../../lib/storage";

interface StimuliUploadProps {
  onSuccess?: () => void;
}

export function StimuliUpload({ onSuccess }: StimuliUploadProps) {
  const [honestFile, setHonestFile] = useState<File | null>(null);
  const [deceptiveFile, setDeceptiveFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleUpload = async () => {
    if (!honestFile || !deceptiveFile || !name) return;
    setLoading(true);
    setStatus(null);

    try {
      uploadStimulus(honestFile, name, 0);
      uploadStimulus(deceptiveFile, name, 1);
      setStatus({
        type: "success",
        message: "Stimuli set uploaded successfully!",
      });

      // Reset form
      setHonestFile(null);
      setDeceptiveFile(null);
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
        label="Honest Visualization"
        placeholder="Click to select file"
        value={honestFile}
        onChange={setHonestFile}
        accept="image/png,image/jpeg"
        required
      />

      <FileInput
        label="Deceptive Visualization"
        placeholder="Click to select file"
        value={deceptiveFile}
        onChange={setDeceptiveFile}
        accept="image/png,image/jpeg"
        required
      />

      <Button
        onClick={handleUpload}
        loading={loading}
        disabled={!honestFile || !deceptiveFile || !name}
      >
        Upload
      </Button>
    </Stack>
  );
}
