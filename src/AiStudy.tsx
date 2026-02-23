import { AppShell } from "@mantine/core";
import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { AdminLogin } from "./features/admin/AdminLogin";
import { AiStudyController } from "./features/ai-study/AiStudyController";
import { SessionProvider } from "./features/ai-study/session/SessionContext";
import { getSupabaseAdmin } from "./lib/supabase";

/**
 * AI application component.
 * Uses the same SessionProvider as the regular study but renders AiStudyController.
 */
export default function AiStudy() {
  const [adminSession, setAdminSession] = useState<Session | null>(null);
  // Initialize Supabase admin client session
  useEffect(() => {
    const supabaseAdmin = getSupabaseAdmin();
    supabaseAdmin.auth.getSession().then(({ data: { session } }) => {
      setAdminSession(session);
    });

    const {
      data: { subscription },
    } = supabaseAdmin.auth.onAuthStateChange((_event, session) => {
      setAdminSession(session);
    });

    return () => subscription.unsubscribe();
  });

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
