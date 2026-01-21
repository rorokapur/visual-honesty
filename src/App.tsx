import { useState } from "react";
import { StudyController } from "./components/StudyController";

/**
 *Main application component for the project.
 * * Renders the main UI
 * * Manages session and survey completion info
 * @component
 */
export default function App() {
  // Generate session ID or retrieve existing one
  const [session] = useState(() => {
    const KEY = "vh_session_id";
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;

    const newId = window.crypto.randomUUID();
    localStorage.setItem(KEY, newId);
    return newId;
  });

  // Check if the user has already taken the survey
  const [hasTaken] = useState(() => {
    const KEY = "vh_taken";
    const existing = localStorage.getItem(KEY);
    return existing === "true";
  });

  return <StudyController session={session} hasTaken={hasTaken} />;
}
