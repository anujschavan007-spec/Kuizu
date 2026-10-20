import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || "https://pjahxopllhifjmnonfdp.supabase.co";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYWh4b3BsbGhpZmptbm9uZmRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNTAwMjEsImV4cCI6MjEwNzYyNjAyMX0.-EmSuBw27d3mJmCZQCzPKqwEuOrd8zUVtAQTZG8wyGI";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;
