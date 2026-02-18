import { createContext } from "react";

export type SessionContextValue = {
  sessionId: string;
  hasTaken: boolean;
  markTaken: () => void;
};

export const SessionContext = createContext<SessionContextValue | null>(null);
