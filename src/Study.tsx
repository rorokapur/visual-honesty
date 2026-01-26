import { useState } from "react";
import { StudyController } from "./features/study/StudyController";

/**
 *Main application component for the project.
 * * Renders the main UI
 * * Manages session and survey completion info
 * @component
 */
export default function Study() {
  // Generate session ID or retrieve existing one
  const [participantSession] = useState(() => {
    const KEY = "vh_session_id";
    const existing = localStorage.getItem(KEY);
    if (existing) return existing;

    const newId = window.crypto.randomUUID();
    localStorage.setItem(KEY, newId);
    return newId;
  });

  // Check if the user has already taken the survey
  const [hasTakenSurvey] = useState(() => {
    const KEY = "vh_taken";
    const existing = localStorage.getItem(KEY);
    return existing === "true";
  });

  return (
    <StudyController session={participantSession} hasTaken={hasTakenSurvey} />
  );
}
