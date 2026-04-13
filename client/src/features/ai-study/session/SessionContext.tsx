import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { SessionContext } from "./context";
import { initializeAiSession as initAiSessionBackend } from "../../../lib/participant";

/**
 * Provides AI session data to the study flow.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const initializeSession = useCallback(
    async (category: string) => {
      if (sessionId) return sessionId;
      try {
        const newId = await initAiSessionBackend(category, {});
        setSessionId(newId);
        return newId;
      } catch (err) {
        console.error("Failed to initialize AI session:", err);
        alert("Server validation failed. Restarting application.");
        throw err;
      }
    },
    [sessionId],
  );

  const value = useMemo(
    () => ({
      sessionId: sessionId || "",
      initializeSession,
    }),
    [sessionId, initializeSession],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
