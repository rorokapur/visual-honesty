import type { Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { AdminDashboard } from "./features/admin/AdminDashboard";
import { AdminLogin } from "./features/admin/AdminLogin";
import { getSupabaseAdmin } from "./lib/supabase";

/**
 *Main application component for the project.
 * * Renders the main UI
 * * Manages session and survey completion info
 * @component
 */
export default function Study() {
  const [adminSession, setAdminSession] = useState<Session | null>(null);
  // Initialize Supabase admin client session
  useEffect(() => {
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
  });

  if (!adminSession) {
    return <AdminLogin />;
  }
  return <AdminDashboard></AdminDashboard>;
}
