import { createClient } from "@supabase/supabase-js";

// Vite requires 'import.meta.env' to access .env variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase URL or Anon Key in .env.local");
}

/**
 * Supabase client for sending and retrieving data.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
