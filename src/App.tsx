import { Alert, Button, Container, Stack, Text, Title } from "@mantine/core";
import { useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "./lib/supabase";

export default function App() {
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  // Generate session ID once per page load
  const sessionId = useMemo(() => uuidv4(), []);

  const sendTestData = async () => {
    setStatus("loading");

    // Attempt to insert a row into the 'responses' table we made earlier
    const { error } = await supabase.from("responses").insert({
      session_id: sessionId,
      pair_id: "setup_test",
      selected_choice: 0,
    });

    if (error) {
      console.error("Supabase Error:", error.message);
      setStatus("error");
    } else {
      setStatus("success");
    }
  };

  return (
    <Container py="xl">
      <Stack align="center">
        <Title>Supabase Connection Setup</Title>
        <Text size="sm" c="dimmed">
          Session ID: {sessionId}
        </Text>

        <Button
          onClick={sendTestData}
          loading={status === "loading"}
          color={status === "success" ? "green" : "blue"}
        >
          {status === "success" ? "Connection Verified!" : "Send Test Data"}
        </Button>

        {status === "success" && (
          <Alert color="green" title="It Works!">
            Check your Supabase Dashboard "Table Editor" to see the new row.
          </Alert>
        )}

        {status === "error" && (
          <Alert color="red" title="Connection Failed">
            Check your .env.local keys and ensure RLS is disabled on the table.
          </Alert>
        )}
      </Stack>
    </Container>
  );
}
