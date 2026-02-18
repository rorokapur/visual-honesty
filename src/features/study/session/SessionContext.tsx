import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { SessionContext } from "./context";

/**
 * Provides participant session data to the study flow.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [sessionId] = useState(() => {
    const KEY = "vh_session_id";
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;

    const newId = window.crypto.randomUUID();
    localStorage.setItem(KEY, newId);
    return newId;
  });

  const [hasTaken, setHasTaken] = useState(() => {
    const KEY = "vh_taken";
    const existing = localStorage.getItem(KEY);
    return existing === "true";
  });

  const value = useMemo(
    () => ({
      sessionId,
      hasTaken,
      markTaken: () => {
        const KEY = "vh_taken";
        localStorage.setItem(KEY, "true");
        setHasTaken(true);
      },
    }),
    [sessionId, hasTaken],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}
