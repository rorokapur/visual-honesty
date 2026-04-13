import { createContext } from "react";

export type SessionContextValue = {
  sessionId: string;
  initializeSession: (category: string) => Promise<string>;
};

export const SessionContext = createContext<SessionContextValue | null>(null);
