import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { AdminDashboard } from "./features/admin/AdminDashboard";
import { AdminLogin } from "./features/admin/AdminLogin";
import { StudyController } from "./features/study/StudyController";
import { getSupabaseAdmin } from "./lib/supabase";

/**
 *Main application component for the project.
 * * Renders the main UI
 * * Manages session and survey completion info
 * @component
 */
export default function App() {
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

  const [admin, setAdmin] = useState(false);
  const [adminSession, setAdminSession] = useState<Session | null>(null);

  // Checks for admin url and changes state accordingly
  useEffect(() => {
    const checkURLHash = () => setAdmin(window.location.hash === "#admin");
    checkURLHash();
    window.addEventListener("hashchange", checkURLHash);
    return () => window.removeEventListener("hashchange", checkURLHash);
  }, []);

  // Initialize Supabase admin client session
  useEffect(() => {
    if (admin) {
      const supabaseAdmin = getSupabaseAdmin();
      supabaseAdmin.auth.getSession().then(({ data: { session } }) => {
        setAdminSession(session);
      });

      const {
        data: { subscription },
      } = supabaseAdmin.auth.onAuthStateChange((_event, session) => {
        setAdminSession(session);
      });

      return () => subscription.unsubscribe();
    }
  }, [admin]);

  if (admin) {
    if (!adminSession) {
      return <AdminLogin />;
    }
    return <AdminDashboard></AdminDashboard>;
  }
  return (
    <StudyController session={participantSession} hasTaken={hasTakenSurvey} />
  );
}
