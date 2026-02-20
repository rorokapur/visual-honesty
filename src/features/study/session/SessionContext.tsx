import type { ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { SessionContext } from "./context";

/**
 * Provides participant session data to the study flow.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(() => {
    const KEY = "vh_session_id";
    return localStorage.getItem(KEY);
  });

  const [hasTaken, setHasTaken] = useState(() => {
    const KEY = "vh_taken";
    const existing = localStorage.getItem(KEY);
    return existing === "true";
  });

  // Validate existing session on mount
  useEffect(() => {
    async function validateSession() {
      if (!sessionId) return;

      try {
        const { data: isValid, error } = await supabase.rpc(
          "is_valid_participant",
          {
            p_session_id: sessionId,
          },
        );

        if (error) {
          console.error("Error validating session:", error);
          return;
        }

        if (isValid === false) {
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

  const initializeSession = useCallback(async () => {
    if (sessionId) return;
    try {
      const { data, error } = await supabase.rpc("create_participant", {
        p_category: "human",
        p_demographics: {},
      });

      if (error) throw error;
      if (!data) throw new Error("No session ID returned");

      const newId = data as string;
      localStorage.setItem("vh_session_id", newId);
      setSessionId(newId);
    } catch (err) {
      console.error("Failed to initialize session via RPC:", err);
      // Fallback to local generation if RPC fails
      const fallbackId = window.crypto.randomUUID();
      console.warn("Using fallback UUID:", fallbackId);
      localStorage.setItem("vh_session_id", fallbackId);
      setSessionId(fallbackId);
    }
  }, [sessionId]);

  const value = useMemo(
    () => ({
      sessionId: sessionId || "",
      hasTaken,
      markTaken: () => {
        const KEY = "vh_taken";
        localStorage.setItem(KEY, "true");
        setHasTaken(true);
      },
      initializeSession,
    }),
    [sessionId, hasTaken, initializeSession],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
