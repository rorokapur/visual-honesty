import { createContext } from "react";

export type SessionContextValue = {
  sessionId: string;
  hasTaken: boolean;
  markTaken: () => void;
  initializeSession: (category: string) => Promise<string>;
};

export const SessionContext = createContext<SessionContextValue | null>(null);
