import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Vite requires 'import.meta.env' to access .env variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase URL or Anon Key in .env.local");
}

/**
 * Supabase client for sending and retrieving participant data.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin singleton
let adminClient: SupabaseClient | null = null;

/**
 * Supabase client for sending and retrieving admin data.
 */
export const getSupabaseAdmin = () => {
  if (adminClient) return adminClient;

  adminClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: "sb-admin",
      persistSession: true,
      detectSessionInUrl: true,
    },
  });

  return adminClient;
};
