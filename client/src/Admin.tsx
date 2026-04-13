import { useEffect, useState } from "react";
import { AdminDashboard } from "./features/admin/AdminDashboard";
import { AdminLogin } from "./features/admin/AdminLogin";
import { fetchAdminSession } from "./lib/admin";
/**
 * Main application component for the project.
 * * Renders the main UI
 * * Manages session and survey completion info
 * @component
 */
export default function Study() {
  const [adminSession, setAdminSession] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchAdminSession()
      .then((isValid) => setAdminSession(isValid))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  if (!adminSession) {
    return <AdminLogin />;
  }
  return <AdminDashboard></AdminDashboard>;
}
