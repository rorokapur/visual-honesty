import { createContext } from "react";

export type SessionContextValue = {
  sessionId: string;
  initializeSession: (demographics?: any) => Promise<string | undefined>;
};

export const SessionContext = createContext<SessionContextValue | null>(null);
