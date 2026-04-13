import { AppShell } from "@mantine/core";
import { SessionProvider } from "./features/study/session/SessionContext";
import { StudyController } from "./features/study/StudyController";
import "./index.css";
import layoutClasses from "./Study.module.css";

/**
 *Main application component for the project.
 * * Renders the main UI
 * * Manages session and survey completion info
 * @component
 */
export default function Study() {
  return (
    <SessionProvider>
      <AppShell className={layoutClasses.layout}>
        <AppShell.Main>
          <StudyController />
        </AppShell.Main>
      </AppShell>
    </SessionProvider>
  );
}
