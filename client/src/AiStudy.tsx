import { AppShell } from "@mantine/core";
import { useEffect, useState } from "react";
import { AdminLogin } from "./features/admin/AdminLogin";
import { AiStudyController } from "./features/ai-study/AiStudyController";
import { SessionProvider } from "./features/ai-study/session/SessionContext";
import { fetchAdminSession } from "./lib/admin";

/**
 * AI application component.
 * Uses the same SessionProvider as the regular study but renders AiStudyController.
 */
export default function AiStudy() {
  const [adminSession, setAdminSession] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchAdminSession()
      .then((isValid) => setAdminSession(isValid))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  if (!adminSession) {
    return <AdminLogin></AdminLogin>;
  }

  return (
    <SessionProvider>
      <AppShell>
        <AppShell.Main>
          <AiStudyController />
        </AppShell.Main>
      </AppShell>
    </SessionProvider>
  );
}
