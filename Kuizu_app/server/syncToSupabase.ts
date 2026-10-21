import { Database } from "bun:sqlite";
import { resolve } from "path";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

export async function syncLocalDbToSupabase(): Promise<{ success: boolean; synced: Record<string, number>; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      synced: {},
      error: "Supabase credentials not configured. Please set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY in .env"
    };
  }

  const dbPath = resolve(import.meta.dirname, "kuizu.db");
  const localDb = new Database(dbPath);
  const synced: Record<string, number> = {};

  const tables = [
    "users",
    "problems",
    "quizzes",
    "battles",
    "contests",
    "quests",
    "quiz_level_progress",
    "daily_quizzes",
    "app_settings",
    "user_problem_submissions",
    "contest_violations"
  ];

  try {
    for (const table of tables) {
      const rows = localDb.query(`SELECT * FROM ${table}`).all();
      if (rows.length === 0) {
        synced[table] = 0;
        continue;
      }

      // Upsert rows in batches of 100
      const batchSize = 100;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        const { error } = await supabase.from(table).upsert(batch);
        if (error) {
          console.error(`Failed to sync table ${table}:`, error.message);
          return { success: false, synced, error: `Error on table ${table}: ${error.message}` };
        }
      }

      synced[table] = rows.length;
      console.log(`✓ Synced ${rows.length} rows to public.${table}`);
    }

    return { success: true, synced };
  } catch (err: any) {
    console.error("Migration error:", err);
    return { success: false, synced, error: err.message || String(err) };
  }
}

// Allow direct execution: `bun run server/syncToSupabase.ts`
if (import.meta.main) {
  console.log("Starting copy/sync from Bun SQLite to Supabase...");
  syncLocalDbToSupabase().then(res => {
    if (res.success) {
      console.log("Successfully synced all tables to Supabase!", res.synced);
      process.exit(0);
    } else {
      console.error("Sync failed:", res.error);
      process.exit(1);
    }
  });
}
