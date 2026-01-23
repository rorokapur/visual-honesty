// Adapted from Mantine UI (https://ui.mantine.dev/component/authentication-form/)
import {
  Button,
  Center,
  Group,
  Paper,
  PasswordInput,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState } from "react";
import { getSupabaseAdmin } from "../../lib/supabase";

/**
 * Login screen for admin users to access the admin dashboard.
 *
 */
export function AdminLogin() {
  const [errorMessage, setErrorMessage] = useState<string>("");

  const form = useForm({
    initialValues: {
      email: "",
      password: "",
    },
  });

  const handleSubmit = async (values: typeof form.values) => {
    const supabase = getSupabaseAdmin();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setErrorMessage(error.message);
    }
  };

  return (
    <Center h="100vh">
      <Paper w="30%" radius="md" p="lg" withBorder>
        <Text size="lg" fw={500}>
          Please log in to continue
        </Text>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack>
            <TextInput
              required
              label="Email"
              placeholder=""
              value={form.values.email}
              onChange={(event) =>
                form.setFieldValue("email", event.currentTarget.value)
              }
              error={form.errors.email && "Invalid email"}
              radius="md"
            />

            <PasswordInput
              required
              label="Password"
              placeholder=""
              value={form.values.password}
              onChange={(event) =>
                form.setFieldValue("password", event.currentTarget.value)
              }
              radius="md"
            />
          </Stack>
          <Group justify="space-between" mt="xl">
            <Text c="red">{errorMessage}</Text>
            <Button type="submit" radius="xl">
              Log in
            </Button>
          </Group>
        </form>
      </Paper>
    </Center>
  );
}
