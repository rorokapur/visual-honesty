import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  initializeParticipantSession,
  validateParticipantSession,
} from "../../../lib/participant";
import { SessionContext } from "./context";

/**
 * Provides participant session data to the study flow.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(() => {
    const KEY = "vh_session_id";
    return localStorage.getItem(KEY);
  });

  // Validate existing session on mount
  useEffect(() => {
    async function validateSession() {
      if (!sessionId) return;

      try {
        const isValid = await validateParticipantSession(sessionId);

        if (!isValid) {
          console.warn("Stored session ID is invalid. Clearing.");
          localStorage.removeItem("vh_session_id");
          setSessionId(null);
        }
      } catch (err) {
        console.error("Session validation exception:", err);
      }
    }

    validateSession();
  }, [sessionId]);

  // Create a new session on the backend
  const initializeSession = useCallback(async () => {
    if (sessionId) return;
    try {
      const newId = await initializeParticipantSession("human", {
        agreed_to_consent: true,
      });
      localStorage.setItem("vh_session_id", newId);
      setSessionId(newId);
    } catch (err) {
      console.error("Failed to initialize backend session:", err);
      alert(
        "Failed to connect to the backend database. Please ensure the server is active!",
      );
      throw err;
    }
  }, [sessionId]);

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
