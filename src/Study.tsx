import { AppShell } from "@mantine/core";
import { SessionProvider } from "./features/study/session/SessionContext";
import { StudyController } from "./features/study/StudyController";
import "./index.css";

/**
 *Main application component for the project.
 * * Renders the main UI
 * * Manages session and survey completion info
 * @component
 */
export default function Study() {
  return (
    <SessionProvider>
      <AppShell>
        <AppShell.Main>
          <StudyController />
        </AppShell.Main>
      </AppShell>
    </SessionProvider>
  );
}
