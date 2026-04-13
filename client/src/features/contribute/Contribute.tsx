import {
  AppShell,
  Button,
  Container,
  FileInput,
  NativeSelect,
  Notification,
  Stack,
  TextInput,
  Title,
} from "@mantine/core";
import { useEffect, useState } from "react";
import layoutClasses from "../../Study.module.css";
import {
  fetchPublicCategories,
  uploadContributionPair,
} from "../../lib/contribute";

/**
 * A page for interested participants to contribute their own stimuli pairs.
 *
 * TODO: Write contribution instructions, decide on allowed image formats
 * @component
 */
export default function Contribute() {
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState<string>("");
  const [setName, setSetName] = useState<string>("");
  const [honestFile, setHonestFile] = useState<File | null>(null);
  const [deceptiveFile, setDeceptiveFile] = useState<File | null>(null);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Fetch categories
    fetchPublicCategories()
      .then((data) => {
        setCategories(data);
        if (data.length > 0) setCategory(data[0]);
      })
      .catch((err) => console.error(err));
  }, []);

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
      await uploadContributionPair(formData);

      setStatus({
        type: "success",
        message: "Successfully uploaded!",
      });
      setSetName("");
      setHonestFile(null);
      setDeceptiveFile(null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setStatus({ type: "error", message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell className={layoutClasses.layout}>
      <AppShell.Main>
        <Container size="sm" mt={50}>
          <Title order={2} ta="center" mb="lg">
            Contribute Stimuli
          </Title>
          <Stack>
            {status && (
              <Notification
                color={status.type === "error" ? "red" : "green"}
                onClose={() => setStatus(null)}
              >
                {status.message}
              </Notification>
            )}

            <TextInput
              label="Set Name"
              description="A descriptive title for this stimuli pair"
              placeholder="e.g. X-Axis Trunction - Company Revenue"
              value={setName}
              onChange={(e) => setSetName(e.currentTarget.value)}
              required
            />

            <NativeSelect
              label="Category"
              description="Choose an appropriate category from the list below"
              data={categories}
              value={category}
              onChange={(e) => setCategory(e.currentTarget.value)}
              required
              disabled={categories.length === 0}
            />

            <FileInput
              label="Honest Image"
              description="Upload the honest visualization"
              placeholder="Click to select honest image file"
              value={honestFile}
              onChange={setHonestFile}
              accept="image/png,image/jpeg,image/webp"
              required
            />

            <FileInput
              label="Deceptive Image"
              description="Upload the deceptive visualization."
              placeholder="Click to select deceptive image file"
              value={deceptiveFile}
              onChange={setDeceptiveFile}
              accept="image/png,image/jpeg,image/webp"
              required
            />

            <Button
              mt="md"
              loading={loading}
              onClick={handleUpload}
              disabled={!honestFile || !deceptiveFile || !setName || !category}
            >
              Submit Stimuli Pair
            </Button>
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
