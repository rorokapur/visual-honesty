import { createContext } from "react";

export type SessionContextValue = {
  sessionId: string;
  initializeSession: () => Promise<void>;
};

export const SessionContext = createContext<SessionContextValue | null>(null);
