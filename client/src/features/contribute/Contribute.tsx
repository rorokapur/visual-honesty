import {
  AppShell,
  Button,
  Card,
  Container,
  FileInput,
  NativeSelect,
  Notification,
  Stack,
  Text,
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
        message:
          "Successfully uploaded! Your contribution has been queued for review.",
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
      <AppShell.Main className="crt-effect" style={{ minHeight: "100vh" }}>
        <Container size="sm" py={50}>
          <Stack gap="xl">
            <Stack gap="xs">
              <Title order={1} ta="center">
                Intel Submission
              </Title>
              <Text ta="center" size="sm">
                Have a chart that twists the truth? Submit it to the Data
                Defense Force!
              </Text>
              <Text ta="center" size="sm">
                Please read the{" "}
                <a href="/contribute">Contribution Guidelines</a> before
                submitting.
              </Text>
            </Stack>

            <Card p="xl">
              <Stack gap="md">
                {status && (
                  <Notification
                    color={status.type === "error" ? "red" : "green"}
                    onClose={() => setStatus(null)}
                    withCloseButton
                  >
                    {status.message}
                  </Notification>
                )}

                <TextInput
                  label="Name"
                  description="A descriptive title for this pair of charts"
                  placeholder="e.g. Truncated Axis - Q3 Revenue"
                  value={setName}
                  onChange={(e) => setSetName(e.currentTarget.value)}
                  required
                />

                <NativeSelect
                  label="Classification"
                  description="Choose an appropriate category for this deception (see contribution guidelines)"
                  data={categories}
                  value={category}
                  onChange={(e) => setCategory(e.currentTarget.value)}
                  required
                  disabled={categories.length === 0}
                />

                <FileInput
                  label="Honest Baseline"
                  description="Upload the honest visualization"
                  placeholder="Click to select file"
                  value={honestFile}
                  onChange={setHonestFile}
                  accept="image/png,image/jpeg,image/webp"
                  required
                />

                <FileInput
                  label="Deceptive Variant"
                  description="Upload the deceptive visualization"
                  placeholder="Click to select file"
                  value={deceptiveFile}
                  onChange={setDeceptiveFile}
                  accept="image/png,image/jpeg,image/webp"
                  required
                />

                <Button
                  mt="md"
                  size="lg"
                  loading={loading}
                  onClick={handleUpload}
                  disabled={
                    !honestFile || !deceptiveFile || !setName || !category
                  }
                >
                  Transmit Intel
                </Button>
              </Stack>
            </Card>
          </Stack>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}
