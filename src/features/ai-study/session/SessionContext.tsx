import type { ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { getSupabaseAdmin } from "../../../lib/supabase";
import { SessionContext } from "./context";

/**
 * Provides AI session data to the study flow.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [hasTaken, setHasTaken] = useState(false);
  const supabase = getSupabaseAdmin();

  const initializeSession = useCallback(
    async (category: string) => {
      if (sessionId) return sessionId;
      try {
        const { data, error } = await supabase.rpc("create_ai_participant", {
          p_category: category,
          p_demographics: {},
        });

        if (error) throw error;
        if (!data) throw new Error("No session ID returned");

        const newId = data as string;
        setSessionId(newId);
        return newId;
      } catch (err) {
        console.error("Failed to initialize session via RPC:", err);
        // Fallback to local generation if RPC fails
        const fallbackId = window.crypto.randomUUID();
        console.warn("Using fallback UUID:", fallbackId);
        setSessionId(fallbackId);
        return fallbackId;
      }
    },
    [sessionId, supabase],
  );

  const value = useMemo(
    () => ({
      sessionId: sessionId || "",
      hasTaken,
      markTaken: () => {
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
