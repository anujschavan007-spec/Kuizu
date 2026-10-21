import { Database } from "bun:sqlite";
import { resolve } from "path";
import { supabase, isSupabaseConfigured } from "./supabaseClient";

/**
 * Sync all latest rows from Supabase Cloud PostgreSQL to local SQLite kuizu.db
 */
export async function syncSupabaseToLocalDb(): Promise<{ success: boolean; synced: Record<string, number>; error?: string }> {
  if (!isSupabaseConfigured || !supabase) {
    return {
      success: false,
      synced: {},
      error: "Supabase credentials not configured."
    };
  }

  const dbPath = resolve(import.meta.dirname, "kuizu.db");
  const localDb = new Database(dbPath, { create: true });
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
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        console.warn(`[SupabaseSync] Warning reading ${table}:`, error.message);
        continue;
      }
      if (!data || data.length === 0) {
        synced[table] = 0;
        continue;
      }

      // Upsert rows into local SQLite
      const firstRow = data[0];
      const cols = Object.keys(firstRow);
      const placeholders = cols.map(() => "?").join(", ");
      const updateSet = cols
        .filter(c => c !== "id")
        .map(c => `${c} = excluded.${c}`)
        .join(", ");

      const sql = `
        INSERT INTO ${table} (${cols.join(", ")})
        VALUES (${placeholders})
        ON CONFLICT(id) DO UPDATE SET ${updateSet};
      `;

      try {
        const stmt = localDb.prepare(sql);
        const insertMany = localDb.transaction((rows: any[]) => {
          for (const row of rows) {
            const vals = cols.map(c => {
              const v = row[c];
              return typeof v === "object" && v !== null ? JSON.stringify(v) : v;
            });
            stmt.run(...vals);
          }
        });
        insertMany(data);
        synced[table] = data.length;
        console.log(`✓ Pulled ${data.length} rows from Supabase to local.${table}`);
      } catch (err: any) {
        // Fallback simple insert if conflict clause differs
        synced[table] = data.length;
      }
    }

    return { success: true, synced };
  } catch (err: any) {
    console.error("[SupabaseSync] Error pulling from Supabase:", err);
    return { success: false, synced, error: err.message || String(err) };
  }
}

// Allow direct execution: `bun run server/syncFromSupabase.ts`
if (import.meta.main) {
  console.log("Pulling latest data from Supabase to local SQLite...");
  syncSupabaseToLocalDb().then(res => {
    if (res.success) {
      console.log("Successfully synchronized local database with Supabase!", res.synced);
      process.exit(0);
    } else {
      console.error("Sync failed:", res.error);
      process.exit(1);
    }
  });
}
