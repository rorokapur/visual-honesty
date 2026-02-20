import { AppShell } from "@mantine/core";
import { AiStudyController } from "./features/ai-study/AiStudyController";
import { SessionProvider } from "./features/study/session/SessionContext";

/**
 * AI application component.
 * Uses the same SessionProvider as the regular study but renders AiStudyController.
 */
export default function AiStudy() {
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
