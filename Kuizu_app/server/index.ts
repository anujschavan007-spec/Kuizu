import { db } from "./db";
import {
  syncAllUsersXpAndRanks,
  recordBattleAttendance,
  recordQuizLevelCompletion,
  recordDailyKuizuCompletion,
  recordStreakActivity,
  recordContestAttendance,
  recordProblemSolved,
  computeUserStrictXp,
  findUserInDb
} from "./xpManager";

import { syncSupabaseToLocalDb } from "./syncFromSupabase";
import nodemailer from "nodemailer";

const PORT = 3001;

// Initial sync with Supabase Cloud Database on startup
try {
  syncSupabaseToLocalDb().then(() => {
    syncAllUsersXpAndRanks();
  });
} catch (e) {
  console.warn("Initial Supabase sync error:", e);
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

function corsOptionsResponse() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const method = req.method;

    if (method === "OPTIONS") {
      return corsOptionsResponse();
    }

    try {
      // ----------------------------------------------------
      // USERS API
      // ----------------------------------------------------
      if (pathname === "/api/users" && method === "GET") {
        // Sync real authenticated users from Clerk Backend API
        const clerkSecret = process.env.CLERK_SECRET_KEY || "sk_test_RthiGGeHG0h6LeiJUkNtIqtG7kuguHQ00DMcJpDOGL";
        try {
          const clerkRes = await fetch("https://api.clerk.com/v1/users", {
            headers: {
              "Authorization": `Bearer ${clerkSecret}`
            }
          });
          if (clerkRes.ok) {
            const clerkUsers = await clerkRes.json() as any[];
            const insertOrUpdate = db.prepare(`
              INSERT INTO users (
                id, name, email, student_id, avatar, role, status, rank, xp,
                problems_solved, streak, present_classes, total_classes,
                cw_completed, cw_total, cw_url,
                hw_completed, hw_total, hw_url,
                leetcode_solved, leetcode_url,
                quiz_level, daily_kuizu_active,
                attended_contests_json, submitted_quests_json,
                joined_date, last_active
              )
              VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, 50, 0, 20, '', 0, 20, '', 0, '', 1, 1, '[]', '[]', ?, 'Today')
              ON CONFLICT(email) DO UPDATE SET
                name = excluded.name,
                avatar = excluded.avatar,
                last_active = 'Today'
            `);

            for (const cu of clerkUsers) {
              const email = cu.email_addresses?.[0]?.email_address || "";
              if (!email) continue;
              const fullName = `${cu.first_name || ""} ${cu.last_name || ""}`.trim() || email.split("@")[0];
              const avatar = cu.image_url || cu.profile_image_url || "";
              const isAdmin = email.toLowerCase() === "anujschavan007@gmail.com";
              const role = isAdmin ? "Admin" : "Student";
              const joinedDate = cu.created_at
                ? new Date(cu.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                : "Recent";

              // Check if user already has an existing row in DB to preserve their custom progress
              const existing = db.query("SELECT * FROM users WHERE email = ?").get(email) as any;
              if (existing) {
                db.prepare(`
                  UPDATE users 
                  SET name = ?, avatar = ?, role = ?, last_active = 'Today'
                  WHERE email = ?
                `).run(fullName, avatar, role, email);
              } else {
                insertOrUpdate.run(
                  cu.id,
                  fullName,
                  email,
                  `STU${Math.floor(1000 + Math.random() * 9000)}`,
                  avatar,
                  role,
                  "#1",
                  0,
                  0,
                  1,
                  0,
                  joinedDate
                );
              }
            }
          }
        } catch (clerkErr) {
          console.warn("Could not sync with Clerk API:", clerkErr);
        }

        // Re-calculate strict XP and sync ranks
        syncAllUsersXpAndRanks();

        const users = db.query(`
          SELECT * FROM users 
          ORDER BY xp DESC, problems_solved DESC, present_classes DESC, name ASC
        `).all();
        return jsonResponse({ success: true, count: users.length, users });
      }

      // Sync/Register user on Clerk login
      if (pathname === "/api/users/sync" && method === "POST") {
        const body = await req.json();
        const { id, name, email, avatar, googleAvatar, isCustomAvatar, role = "Student" } = body;

        if (!email) {
          return jsonResponse({ success: false, error: "Email is required" }, 400);
        }

        const existing = db.query("SELECT * FROM users WHERE email = ?").get(email) as any;
        const nowStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

        function isAddedAvatarUrl(url: string | null | undefined): boolean {
          if (!url) return false;
          const t = url.trim();
          if (!t || t === "/images/home_avatar.png" || t === "/images/admin_avatar.png") return false;
          if (t.startsWith("/avatars/") || t.startsWith("data:image/") || t.startsWith("blob:")) return true;
          const isOauth = t.includes("img.clerk.com") || t.includes("images.clerk.dev") || t.includes("googleusercontent.com") || t.includes("avatars.githubusercontent.com");
          return !isOauth;
        }

        if (existing) {
          let avatarToSave: string;
          if (isCustomAvatar && avatar) {
            avatarToSave = avatar;
          } else if (isAddedAvatarUrl(existing.avatar)) {
            avatarToSave = existing.avatar;
          } else {
            avatarToSave = googleAvatar || avatar || existing.avatar || "/images/home_avatar.png";
          }

          db.prepare(`
            UPDATE users 
            SET name = COALESCE(?, name),
                avatar = ?,
                last_active = ?
            WHERE LOWER(email) = LOWER(?)
          `).run(name || existing.name, avatarToSave, "Today", email);

          const updated = db.query("SELECT * FROM users WHERE LOWER(email) = LOWER(?)").get(email);
          return jsonResponse({ success: true, user: updated, isNew: false });
        } else {
          const userId = id || `usr_${Date.now()}`;
          const avatarToSave = avatar || googleAvatar || "/images/home_avatar.png";
          db.prepare(`
            INSERT INTO users (id, name, email, avatar, role, status, xp, problems_solved, streak, joined_date, last_active)
            VALUES (?, ?, ?, ?, ?, 'active', 0, 0, 1, ?, 'Today')
          `).run(userId, name || "Kuizu Learner", email, avatarToSave, role, nowStr);

          syncAllUsersXpAndRanks();
          const created = db.query("SELECT * FROM users WHERE id = ?").get(userId);
          return jsonResponse({ success: true, user: created, isNew: true }, 201);
        }
      }

      if (pathname.startsWith("/api/users/") && method === "GET") {
        const rawParam = pathname.replace("/api/users/", "");
        const idOrEmail = decodeURIComponent(rawParam);
        const user = db.query(`
          SELECT * FROM users 
          WHERE id = ? 
             OR LOWER(id) = LOWER(?)
             OR email = ? 
             OR LOWER(email) = LOWER(?)
             OR LOWER(name) = LOWER(?)
             OR LOWER(name) LIKE ?
          LIMIT 1
        `).get(
          idOrEmail,
          idOrEmail,
          idOrEmail,
          idOrEmail,
          idOrEmail,
          `%${idOrEmail.toLowerCase()}%`
        ) as any;

        if (!user) {
          return jsonResponse({ success: false, error: "User not found" }, 404);
        }

        return jsonResponse({ success: true, user });
      }

      // Detailed strict XP breakdown endpoint
      if (pathname.includes("/xp-breakdown") && method === "GET") {
        const parts = pathname.split("/");
        const idOrEmail = decodeURIComponent(parts[parts.length - 2]);
        const user = findUserInDb({ id: idOrEmail, email: idOrEmail });
        if (!user) {
          return jsonResponse({ success: false, error: "User not found" }, 404);
        }
        const breakdown = computeUserStrictXp(user);
        return jsonResponse({ success: true, user, breakdown });
      }

      // Trigger XP & Rank re-calculation across all users
      if (pathname === "/api/users/recalculate-xp" && method === "POST") {
        const ranked = syncAllUsersXpAndRanks();
        return jsonResponse({ success: true, count: ranked.length, users: ranked });
      }

      // Update Attendance manually by admin
      if (pathname.endsWith("/attendance") && method === "PUT") {
        const parts = pathname.split("/");
        const userId = parts[parts.length - 2];
        const body = await req.json();
        const { presentClasses, totalClasses } = body;

        db.prepare(`
          UPDATE users
          SET present_classes = ?, total_classes = ?
          WHERE id = ? OR email = ?
        `).run(Number(presentClasses), Number(totalClasses), userId, userId);

        syncAllUsersXpAndRanks();
        const updated = db.query("SELECT * FROM users WHERE id = ? OR email = ?").get(userId, userId);
        return jsonResponse({ success: true, user: updated });
      }

      // Update external links (HackerRank Classwork, Homework, LeetCode Profile) and metrics
      if (pathname.endsWith("/links") && method === "PUT") {
        const parts = pathname.split("/");
        const userId = parts[parts.length - 2];
        const body = await req.json();
        const {
          cwUrl,
          cwCompleted,
          cwTotal,
          hwUrl,
          hwCompleted,
          hwTotal,
          leetcodeUrl,
          leetcodeSolved
        } = body;

        db.prepare(`
          UPDATE users
          SET cw_url = COALESCE(?, cw_url),
              cw_completed = COALESCE(?, cw_completed),
              cw_total = COALESCE(?, cw_total),
              hw_url = COALESCE(?, hw_url),
              hw_completed = COALESCE(?, hw_completed),
              hw_total = COALESCE(?, hw_total),
              leetcode_url = COALESCE(?, leetcode_url),
              leetcode_solved = COALESCE(?, leetcode_solved)
          WHERE id = ? OR email = ?
        `).run(
          cwUrl !== undefined ? cwUrl : null,
          cwCompleted !== undefined ? Number(cwCompleted) : null,
          cwTotal !== undefined ? Number(cwTotal) : null,
          hwUrl !== undefined ? hwUrl : null,
          hwCompleted !== undefined ? Number(hwCompleted) : null,
          hwTotal !== undefined ? Number(hwTotal) : null,
          leetcodeUrl !== undefined ? leetcodeUrl : null,
          leetcodeSolved !== undefined ? Number(leetcodeSolved) : null,
          userId,
          userId
        );

        const updated = db.query("SELECT * FROM users WHERE id = ? OR email = ?").get(userId, userId);
        return jsonResponse({ success: true, user: updated });
      }

      // Update student profile details (Admin only)
      if (pathname.startsWith("/api/users/") && method === "PUT") {
        const userId = pathname.replace("/api/users/", "");
        const body = await req.json();
        const { name, email, studentId, rank, xp, streak } = body;

        db.prepare(`
          UPDATE users
          SET name = COALESCE(?, name),
              email = COALESCE(?, email),
              student_id = COALESCE(?, student_id),
              rank = COALESCE(?, rank),
              xp = COALESCE(?, xp),
              streak = COALESCE(?, streak)
          WHERE id = ? OR email = ?
        `).run(
          name !== undefined ? name : null,
          email !== undefined ? email : null,
          studentId !== undefined ? studentId : null,
          rank !== undefined ? rank : null,
          xp !== undefined ? Number(xp) : null,
          streak !== undefined ? Number(streak) : null,
          userId,
          userId
        );

        const updated = db.query("SELECT * FROM users WHERE id = ? OR email = ?").get(userId, userId);
        return jsonResponse({ success: true, user: updated });
      }
      if (pathname === "/api/problems" && method === "GET") {
        const difficulty = url.searchParams.get("difficulty");
        const topic = url.searchParams.get("topic");
        const search = url.searchParams.get("search")?.toLowerCase();
        const userEmail = url.searchParams.get("email") || "";
        const userName = url.searchParams.get("name") || "";

        // Collect set of problem IDs solved by this user
        const solvedProblemIds = new Set<string>();
        if (userEmail || userName) {
          const solvedRows = db.query(`
            SELECT DISTINCT s.problem_id
            FROM user_problem_submissions s
            LEFT JOIN users u ON u.id = s.user_id
            WHERE (
              (? != '' AND LOWER(s.user_email) = LOWER(?))
              OR (? != '' AND (LOWER(u.email) = LOWER(?) OR LOWER(u.name) = LOWER(?)))
            )
            AND s.status = 'accepted'
          `).all(userEmail, userEmail, userName, userName, userName) as any[];
          solvedRows.forEach(r => solvedProblemIds.add(String(r.problem_id)));
        }

        let query = "SELECT * FROM problems WHERE 1=1";
        const params: any[] = [];

        if (difficulty && difficulty !== "all") {
          query += " AND LOWER(difficulty) = ?";
          params.push(difficulty.toLowerCase());
        }

        if (topic && topic !== "all") {
          query += " AND LOWER(topic_name) = ?";
          params.push(topic.toLowerCase());
        }

        let problems = db.query(query).all(...params) as any[];

        if (search) {
          problems = problems.filter(p => 
            p.title.toLowerCase().includes(search) || 
            (p.description && p.description.toLowerCase().includes(search))
          );
        }

        // Format to match frontend Problem type
        const formatted = problems.map(p => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          difficulty: p.difficulty,
          topic: {
            name: p.topic_name,
            icon: p.topic_icon || p.topic_name.toLowerCase()
          },
          rewardXp: p.reward_xp,
          solved: solvedProblemIds.has(String(p.id)) || solvedProblemIds.has(String(p.slug)),
          description: p.description,
          statement: p.statement,
          inputFormat: p.input_format,
          outputFormat: p.output_format,
          sampleInput: p.sample_input,
          sampleOutput: p.sample_output,
          createdAt: p.created_at,
          testCaseCount: p.test_cases_json ? (JSON.parse(p.test_cases_json)?.length || 0) : 0,
          testCases: p.test_cases_json ? JSON.parse(p.test_cases_json) : []
        }));

        return jsonResponse({ success: true, count: formatted.length, problems: formatted });
      }

      // GET /api/problems/submissions - return user submissions history
      if (pathname === "/api/problems/submissions" && method === "GET") {
        const userEmail = url.searchParams.get("email") || "";
        const userName = url.searchParams.get("name") || "";
        const problemId = url.searchParams.get("problemId") || "";
        const source = url.searchParams.get("source") || "all";

        let sql = `
          SELECT s.*, p.title as problem_title, p.difficulty as problem_difficulty, p.topic_name
          FROM user_problem_submissions s
          LEFT JOIN problems p ON (
            p.id = s.problem_id 
            OR p.slug = s.problem_id
            OR CAST(p.id AS INTEGER) = CAST(s.problem_id AS INTEGER)
          )
          LEFT JOIN users u ON u.id = s.user_id
          WHERE 1=1
        `;
        const params: any[] = [];

        if (source && source !== "all") {
          sql += " AND LOWER(s.source) = LOWER(?)";
          params.push(source);
        }

        if (problemId) {
          const padded = String(problemId).padStart(3, "0");
          const unpadded = String(problemId).replace(/^0+/, "") || "0";
          sql += " AND (s.problem_id = ? OR s.problem_id = ? OR s.problem_id = ? OR p.slug = ? OR p.id = ? OR p.id = ?)";
          params.push(problemId, padded, unpadded, problemId, padded, unpadded);
        }

        if (userEmail || userName) {
          sql += " AND (";
          const subClauses: string[] = [];
          if (userEmail) {
            subClauses.push("LOWER(s.user_email) = LOWER(?)");
            params.push(userEmail);
          }
          if (userName) {
            subClauses.push("(LOWER(u.email) = LOWER(?) OR LOWER(u.name) = LOWER(?))");
            params.push(userName, userName);
          }
          sql += subClauses.join(" OR ") + ")";
        }

        sql += " ORDER BY s.id DESC";

        const rows = db.query(sql).all(...params) as any[];
        return jsonResponse({
          success: true,
          submissions: rows.map(r => ({
            id: r.id,
            problemId: r.problem_id,
            problemTitle: r.problem_title || `Problem ${r.problem_id}`,
            difficulty: r.problem_difficulty || r.difficulty || "Easy",
            topicName: r.topic_name || "General",
            rewardXp: typeof r.reward_xp === 'number' ? r.reward_xp : 0,
            status: r.status || "accepted",
            code: r.code || "",
            language: r.language || "cpp",
            passedCount: r.passed_count || 0,
            totalCount: r.total_count || 0,
            source: r.source || "practice",
            contestId: r.contest_id || "",
            submittedAt: r.submitted_at
          }))
        });
      }

      if (pathname.startsWith("/api/problems/") && method === "GET") {
        const idOrSlug = pathname.replace("/api/problems/", "");
        const paddedId = idOrSlug.padStart(3, "0");
        const unpaddedId = idOrSlug.replace(/^0+/, "") || "0";
        const problem = db.query("SELECT * FROM problems WHERE id = ? OR id = ? OR id = ? OR slug = ? OR title = ? COLLATE NOCASE").get(idOrSlug, paddedId, unpaddedId, idOrSlug, decodeURIComponent(idOrSlug)) as any;
        if (!problem) {
          return jsonResponse({ success: false, error: "Problem not found" }, 404);
        }
        return jsonResponse({
          success: true,
          problem: {
            id: problem.id,
            title: problem.title,
            slug: problem.slug,
            difficulty: problem.difficulty,
            topic: { name: problem.topic_name, icon: problem.topic_icon },
            rewardXp: problem.reward_xp,
            description: problem.description,
            statement: problem.statement,
            inputFormat: problem.input_format,
            outputFormat: problem.output_format,
            sampleInput: problem.sample_input,
            sampleOutput: problem.sample_output,
            testCases: problem.test_cases_json ? JSON.parse(problem.test_cases_json) : []
          }
        });
      }

      if (pathname.startsWith("/api/problems/") && pathname.endsWith("/submit") && method === "POST") {
        const problemId = pathname.replace("/api/problems/", "").replace("/submit", "");
        const body = await req.json().catch(() => ({}));
        const p = db.query("SELECT * FROM problems WHERE id = ? OR slug = ?").get(problemId, problemId) as any;
        const diff = p?.difficulty || body.difficulty || "Easy";
        const result = recordProblemSolved(
          p?.id || problemId,
          diff,
          {
            id: body.id,
            email: body.email,
            name: body.name
          },
          {
            code: body.code,
            language: body.language,
            passedCount: body.passedCount,
            totalCount: body.totalCount,
            status: body.status || 'accepted',
            source: body.source || 'practice',
            contestId: body.contestId || ''
          }
        );
        const rewardXp = result?.rewardXp ?? 0;
        const isFirstSolve = result?.isFirstSolve ?? false;
        return jsonResponse({
          success: true,
          isFirstSolve,
          rewardXp,
          message: isFirstSolve
            ? `Problem solved successfully! (+${rewardXp} XP)`
            : `Solution accepted! (Already solved previously • +0 XP)`,
          user: result?.user
        });
      }

      if (pathname === "/api/problems" && method === "POST") {
        const body = await req.json();
        const {
          title,
          difficulty = "Easy",
          topic = "General",
          rewardXp = 10,
          description = "",
          statement = "",
          inputFormat = "",
          outputFormat = "",
          sampleInput = "",
          sampleOutput = "",
          testCases = []
        } = body;

        if (!title) {
          return jsonResponse({ success: false, error: "Title is required" }, 400);
        }

        const countRow = db.query("SELECT COUNT(*) as count FROM problems").get() as { count: number };
        const id = String(countRow.count + 1).padStart(3, "0");
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") + `-${Date.now().toString().slice(-4)}`;
        const testCasesJson = JSON.stringify(testCases || []);

        db.prepare(`
          INSERT INTO problems (id, title, slug, difficulty, topic_name, topic_icon, reward_xp, description, statement, input_format, output_format, sample_input, sample_output, test_cases_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          title,
          slug,
          difficulty,
          topic,
          topic.toLowerCase().replace(/\s+/g, "-"),
          Number(rewardXp) || 10,
          description,
          statement,
          inputFormat,
          outputFormat,
          sampleInput,
          sampleOutput,
          testCasesJson,
          new Date().toISOString()
        );

        const newProblem = db.query("SELECT * FROM problems WHERE id = ?").get(id);
        return jsonResponse({ success: true, problem: newProblem }, 201);
      }

      if (pathname.startsWith("/api/problems/") && method === "DELETE") {
        const id = pathname.replace("/api/problems/", "");
        db.prepare("DELETE FROM problems WHERE id = ? OR slug = ?").run(id, id);
        return jsonResponse({ success: true, message: "Problem deleted" });
      }

      // ----------------------------------------------------
      // QUIZZES & LEVELS API
      // ----------------------------------------------------
      // Returns high-level level list for the Adventure Map (/quiz page)
      if (pathname === "/api/quizzes/levels" && method === "GET") {
        // Query distinct level numbers present or progress
        const allQuizzes = db.query("SELECT * FROM quizzes ORDER BY level_number ASC, id ASC").all() as any[];
        
        // Group by level_number
        const levelsMap: Record<number, any[]> = {};
        for (const q of allQuizzes) {
          const lvlNum = q.level_number || 1;
          if (!levelsMap[lvlNum]) levelsMap[lvlNum] = [];
          levelsMap[lvlNum].push(q);
        }

        // Distinct level numbers from quizzes, minimum level 1
        const levelNumbers = Object.keys(levelsMap).map(Number);
        if (levelNumbers.length === 0) levelNumbers.push(1);

        // Fetch saved progress
        const progressRows = db.query("SELECT * FROM quiz_level_progress").all() as any[];
        const progressMap: Record<number, any> = {};
        for (const p of progressRows) {
          progressMap[p.level_id] = p;
        }

        // Standard map coordinates for levels 1 to 4+
        const defaultPositions: Record<number, { leftPercent: number; topPercent: number }> = {
          1: { leftPercent: 14.0, topPercent: 72.0 },
          2: { leftPercent: 36.0, topPercent: 66.0 },
          3: { leftPercent: 58.0, topPercent: 58.0 },
          4: { leftPercent: 78.0, topPercent: 46.0 }
        };

        const sortedLevelNums = Array.from(new Set([...levelNumbers, 1, 2, 3, 4])).sort((a, b) => a - b);
        let previousLevelCompleted = true; // Level 1 is always unlocked by default

        const levelsResult = sortedLevelNums.map((lvlNum, index) => {
          const qList = levelsMap[lvlNum] || [];
          const progress = progressMap[lvlNum];

          // Determine status: Level 1 is unlocked by default; Level N unlocks only when Level N-1 has >= 1 star
          let status: "unlocked" | "locked" | "completed" = "locked";
          let stars = 0;

          if (progress) {
            stars = progress.stars || 0;
            status = progress.status || (stars >= 1 ? "completed" : "unlocked");
          } else {
            if (lvlNum === 1 || previousLevelCompleted) {
              status = "unlocked";
            } else {
              status = "locked";
            }
          }

          // Level 1 is NEVER locked!
          if (lvlNum === 1) {
            status = (stars >= 1 || progress?.status === "completed") ? "completed" : "unlocked";
          }

          // Check if this level is completed for the next level
          previousLevelCompleted = status === "completed" || stars >= 1;

          // Main name from first quiz in level or Level N
          const firstName = qList[0]?.name || `Level ${lvlNum}`;
          const description = qList[0]?.description || `Master Level ${lvlNum} problems and challenges.`;

          const pos = defaultPositions[lvlNum] || {
            leftPercent: 14 + ((index * 22) % 70),
            topPercent: 72 - ((index * 10) % 40)
          };

          return {
            id: lvlNum,
            name: firstName,
            description,
            status,
            stars,
            maxStars: 3,
            questionCount: Math.min(3, qList.length || 3),
            rewardXp: 30,
            timeLimitSeconds: 600,
            position: pos
          };
        });

        return jsonResponse({ success: true, count: levelsResult.length, levels: levelsResult, quizzes: levelsResult });
      }

      // Questions for a specific level (limits to 3 problems)
      if (pathname.startsWith("/api/quizzes/levels/") && pathname.endsWith("/questions") && method === "GET") {
        const parts = pathname.split("/");
        const lvlId = Number(parts[4]);

        // Find quizzes assigned to this level
        const quizzes = db.query("SELECT * FROM quizzes WHERE level_number = ? ORDER BY id ASC LIMIT 3").all(lvlId) as any[];

        if (quizzes.length === 0) {
          // If no custom quizzes in DB yet for this level, fallback to general quizzes
          const fallback = db.query("SELECT * FROM quizzes ORDER BY id ASC LIMIT 3").all() as any[];
          quizzes.push(...fallback);
        }

        const questions = quizzes.slice(0, 3).map((q, idx) => ({
          id: q.id,
          question: q.question_content || q.name,
          options: [
            { id: "A", text: q.option_a || "Option A" },
            { id: "B", text: q.option_b || "Option B" },
            { id: "C", text: q.option_c || "Option C" },
            { id: "D", text: q.option_d || "Option D" }
          ],
          correctOption: (q.correct_option || "A").toUpperCase(),
          rewardXp: 10,
          explanation: `Correct answer is ${q.correct_option || "A"}`
        }));

        return jsonResponse({ success: true, levelId: lvlId, count: questions.length, questions });
      }

      // Submit level answers, earn 1 star per correct answer (up to 3 stars), unlock next level
      // Each level completion earns exactly 30 XP!
      if (pathname.startsWith("/api/quizzes/levels/") && pathname.endsWith("/submit") && method === "POST") {
        const parts = pathname.split("/");
        const lvlId = Number(parts[4]);
        const body = await req.json();
        const answers = body.answers || {};

        // Fetch level problems (up to 3)
        const quizzes = db.query("SELECT * FROM quizzes WHERE level_number = ? ORDER BY id ASC LIMIT 3").all(lvlId) as any[];
        const problems = quizzes.length > 0 ? quizzes : (db.query("SELECT * FROM quizzes ORDER BY id ASC LIMIT 3").all() as any[]);

        let correctCount = 0;
        problems.forEach((p) => {
          const userAns = answers[p.id];
          const correct = (p.correct_option || "A").toUpperCase();
          if (userAns && userAns.toUpperCase() === correct) {
            correctCount++;
          }
        });

        // Exactly 1 star per correct answer, maximum 3 stars!
        const starsEarned = Math.min(3, correctCount);
        const totalQuestions = Math.min(3, problems.length || 3);
        const isCompleted = starsEarned >= 1;
        // Each completed level earns strictly 30 XP
        const xpEarned = isCompleted ? 30 : 0;

        // Persist level progress
        const currentProgress = db.query("SELECT * FROM quiz_level_progress WHERE level_id = ?").get(lvlId) as any;
        const newStars = Math.max(currentProgress?.stars || 0, starsEarned);
        const newStatus = isCompleted ? "completed" : "unlocked";

        db.prepare(`
          INSERT INTO quiz_level_progress (level_id, status, stars, completed_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(level_id) DO UPDATE SET
            status = excluded.status,
            stars = MAX(stars, excluded.stars),
            completed_at = excluded.completed_at
        `).run(lvlId, newStatus, newStars, new Date().toISOString());

        // Award strict 30 XP to user and update dynamic ranks
        if (isCompleted) {
          recordQuizLevelCompletion(lvlId, {
            id: body.id || body.userId,
            email: body.email || body.userEmail,
            name: body.name || body.userName
          });
        }

        // If at least 1 star earned, unlock the next level!
        let nextLevelUnlocked = false;
        if (starsEarned >= 1) {
          nextLevelUnlocked = true;
          const nextLvlId = lvlId + 1;
          const nextProg = db.query("SELECT * FROM quiz_level_progress WHERE level_id = ?").get(nextLvlId) as any;
          if (!nextProg || nextProg.status === "locked") {
            db.prepare(`
              INSERT INTO quiz_level_progress (level_id, status, stars, unlocked_at)
              VALUES (?, 'unlocked', 0, ?)
              ON CONFLICT(level_id) DO UPDATE SET
                status = 'unlocked',
                unlocked_at = excluded.unlocked_at
            `).run(nextLvlId, new Date().toISOString());
          }
        }

        return jsonResponse({
          success: true,
          levelId: lvlId,
          score: correctCount,
          totalQuestions,
          starsEarned,
          xpEarned,
          nextLevelUnlocked
        });
      }

      // Existing /api/quizzes GET (For Admin panel list)
      if (pathname === "/api/quizzes" && method === "GET") {
        const quizzes = db.query("SELECT * FROM quizzes ORDER BY level_number ASC, id ASC").all() as any[];
        const formatted = quizzes.map(q => ({
          id: q.id,
          name: q.name,
          description: q.description,
          levelNumber: q.level_number || 1,
          status: q.status,
          stars: q.stars,
          maxStars: q.max_stars,
          questionCount: q.question_count,
          rewardXp: q.reward_xp,
          timeLimitSeconds: q.time_limit_seconds,
          position: {
            leftPercent: q.position_left,
            topPercent: q.position_top
          },
          questionContent: q.question_content,
          options: {
            a: q.option_a,
            b: q.option_b,
            c: q.option_c,
            d: q.option_d
          },
          correctOption: q.correct_option,
          createdAt: q.created_at
        }));
        return jsonResponse({ success: true, count: formatted.length, quizzes: formatted });
      }

      if (pathname === "/api/quizzes" && method === "POST") {
        const body = await req.json();
        const {
          name,
          description = "",
          levelNumber = 1,
          questionCount = 1,
          rewardXp = 30,
          questionContent = "",
          optionA = "",
          optionB = "",
          optionC = "",
          optionD = "",
          correctOption = "A"
        } = body;

        if (!name) {
          return jsonResponse({ success: false, error: "Quiz name/title is required" }, 400);
        }

        // Prevent duplicate creation if same quiz submitted within 5 seconds
        const recentSame = db.query(`
          SELECT id, created_at FROM quizzes 
          WHERE LOWER(name) = LOWER(?) 
          ORDER BY id DESC LIMIT 1
        `).get(name) as any;

        if (recentSame && recentSame.created_at) {
          const diff = Date.now() - new Date(recentSame.created_at).getTime();
          if (diff < 5000) {
            return jsonResponse({ success: true, id: recentSame.id, message: "Existing quiz preserved" }, 200);
          }
        }

        const countRow = db.query("SELECT COUNT(*) as count FROM quizzes").get() as { count: number };
        const nextId = countRow.count + 1;
        const leftP = 15 + ((nextId * 22) % 70);
        const topP = 70 - ((nextId * 8) % 40);

        const result = db.prepare(`
          INSERT INTO quizzes (name, description, level_number, status, stars, max_stars, question_count, reward_xp, time_limit_seconds, position_left, position_top, question_content, option_a, option_b, option_c, option_d, correct_option, created_at)
          VALUES (?, ?, ?, 'unlocked', 0, 3, ?, ?, 600, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          name,
          description,
          Number(levelNumber) || 1,
          Number(questionCount) || 1,
          Number(rewardXp) || 30,
          leftP,
          topP,
          questionContent,
          optionA,
          optionB,
          optionC,
          optionD,
          correctOption,
          new Date().toISOString()
        );

        const realId = Number(result.lastInsertRowid);
        return jsonResponse({ success: true, id: realId }, 201);
      }

      if (pathname.startsWith("/api/quizzes/") && method === "GET") {
        const id = pathname.replace("/api/quizzes/", "");
        const numId = Number(id);
        const q = db.query("SELECT * FROM quizzes WHERE id = ?").get(numId) as any;
        if (!q) {
          return jsonResponse({ success: false, error: "Quiz not found" }, 404);
        }
        return jsonResponse({
          success: true,
          quiz: {
            id: q.id,
            name: q.name,
            description: q.description || "",
            levelNumber: q.level_number || 1,
            status: q.status,
            stars: q.stars,
            maxStars: q.max_stars,
            questionCount: q.question_count,
            rewardXp: q.reward_xp,
            timeLimitSeconds: q.time_limit_seconds,
            questionContent: q.question_content || "",
            options: {
              a: q.option_a || "",
              b: q.option_b || "",
              c: q.option_c || "",
              d: q.option_d || ""
            },
            correctOption: q.correct_option || "A",
            createdAt: q.created_at
          }
        });
      }

      if (pathname.startsWith("/api/quizzes/") && method === "PUT") {
        const id = pathname.replace("/api/quizzes/", "");
        const numId = Number(id);
        const body = await req.json();
        const {
          name,
          description = "",
          levelNumber = 1,
          questionCount = 1,
          rewardXp = 30,
          questionContent = "",
          optionA = "",
          optionB = "",
          optionC = "",
          optionD = "",
          correctOption = "A"
        } = body;

        if (!name) {
          return jsonResponse({ success: false, error: "Quiz title is required" }, 400);
        }

        db.prepare(`
          UPDATE quizzes 
          SET name = ?, description = ?, level_number = ?, question_count = ?, reward_xp = ?, question_content = ?, option_a = ?, option_b = ?, option_c = ?, option_d = ?, correct_option = ?
          WHERE id = ?
        `).run(
          name,
          description,
          Number(levelNumber) || 1,
          Number(questionCount) || 1,
          Number(rewardXp) || 30,
          questionContent,
          optionA,
          optionB,
          optionC,
          optionD,
          correctOption,
          numId
        );

        return jsonResponse({ success: true, message: "Quiz updated successfully" });
      }

      if (pathname.startsWith("/api/quizzes/") && method === "DELETE") {
        const id = pathname.replace("/api/quizzes/", "");
        const numId = Number(id);
        db.prepare("DELETE FROM quizzes WHERE id = ?").run(numId);
        return jsonResponse({ success: true, message: "Quiz deleted successfully" });
      }

      // ----------------------------------------------------
      // DAILY KUIZU API
      // ----------------------------------------------------
      if (pathname === "/api/daily-quiz/today" && method === "GET") {
        // Calculate current IST info (UTC + 5:30)
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const ist = new Date(utc + (3600000 * 5.5));
        const year = ist.getFullYear();
        const month = String(ist.getMonth() + 1).padStart(2, '0');
        const day = String(ist.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        const hours = ist.getHours();
        const minutes = ist.getMinutes();
        const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} IST`;
        const isPast12PM = hours >= 12;

        // 1. Try to find daily quiz assigned for today
        let dailyQuiz = db.query("SELECT * FROM daily_quizzes WHERE assigned_date = ?").get(todayStr) as any;
        let isFallback = false;
        let isExpired = false;

        if (dailyQuiz) {
          // If assigned for today, check expiry (12:00 PM IST)
          if (isPast12PM) {
            isExpired = true;
          }
        } else {
          // No daily quiz added for today: find most recent previous date quiz
          dailyQuiz = db.query("SELECT * FROM daily_quizzes WHERE assigned_date < ? ORDER BY assigned_date DESC LIMIT 1").get(todayStr) as any;
          if (dailyQuiz) {
            isFallback = true;
          } else {
            // If no previous date quiz either, find any latest quiz in table
            dailyQuiz = db.query("SELECT * FROM daily_quizzes ORDER BY assigned_date DESC LIMIT 1").get() as any;
            if (dailyQuiz) isFallback = true;
          }
        }

        let questions: any[] = [];
        let title = "Daily Syllabus KUIZU";
        let description = "Core concept check and pattern challenges";
        let assignedDate = todayStr;
        let rewardXp = 15;
        let streakBonus = 5;
        let expiryTime = "12:00 PM IST";
        let dailyId = 0;

        if (dailyQuiz) {
          dailyId = dailyQuiz.id;
          title = dailyQuiz.title || title;
          description = dailyQuiz.description || description;
          assignedDate = dailyQuiz.assigned_date;
          rewardXp = dailyQuiz.reward_xp || 15;
          streakBonus = dailyQuiz.streak_bonus || 5;
          expiryTime = dailyQuiz.expiry_time || "12:00 PM IST";

          // 1. First check questions_json (contains questions from Quiz, Problem, or Manual)
          if (dailyQuiz.questions_json) {
            try {
              const parsed = JSON.parse(dailyQuiz.questions_json);
              if (Array.isArray(parsed) && parsed.length > 0) {
                questions = parsed.map((q: any, idx: number) => ({
                  id: q.id || `q_${idx + 1}`,
                  num: idx + 1,
                  name: q.name || `Question ${idx + 1}`,
                  sourceType: q.sourceType || 'manual',
                  sourceId: q.sourceId || null,
                  questionContent: q.questionContent || '',
                  optionA: q.optionA || '',
                  optionB: q.optionB || '',
                  optionC: q.optionC || '',
                  optionD: q.optionD || '',
                  correctOption: q.correctOption || 'A',
                  rewardXp: q.rewardXp || 10
                }));
              }
            } catch (err) {
              console.warn("Could not parse daily questions_json:", err);
            }
          }

          // 2. Fallback to quiz_ids_json if questions array is still empty
          if (questions.length === 0) {
            let quizIds: number[] = [];
            try {
              quizIds = JSON.parse(dailyQuiz.quiz_ids_json || "[]");
            } catch {
              quizIds = [];
            }

            if (quizIds.length > 0) {
              const placeholders = quizIds.map(() => "?").join(",");
              const rows = db.query(`SELECT * FROM quizzes WHERE id IN (${placeholders})`).all(...quizIds) as any[];
              const rowMap = new Map<number, any>(rows.map(r => [r.id, r]));
              questions = quizIds.map(qid => rowMap.get(qid)).filter(Boolean).map((q, idx) => ({
                id: q.id,
                num: idx + 1,
                name: q.name,
                sourceType: 'quiz',
                sourceId: q.id,
                questionContent: q.question_content,
                optionA: q.option_a,
                optionB: q.option_b,
                optionC: q.option_c,
                optionD: q.option_d,
                correctOption: q.correct_option,
                rewardXp: q.reward_xp
              }));
            }
          }
        }

        // Fallback to top quizzes if questions array is empty
        if (questions.length === 0) {
          const fallbackRows = db.query("SELECT * FROM quizzes LIMIT 3").all() as any[];
          questions = fallbackRows.map((q, idx) => ({
            id: q.id,
            num: idx + 1,
            name: q.name,
            sourceType: 'quiz',
            sourceId: q.id,
            questionContent: q.question_content,
            optionA: q.option_a,
            optionB: q.option_b,
            optionC: q.option_c,
            optionD: q.option_d,
            correctOption: q.correct_option,
            rewardXp: q.reward_xp
          }));
        }

        return jsonResponse({
          success: true,
          dailyQuiz: {
            id: dailyId,
            assignedDate,
            title,
            description,
            rewardXp,
            streakBonus,
            expiryTime,
            isFallback,
            isExpired,
            currentIstDate: todayStr,
            currentIstTime: timeStr,
            questionCount: questions.length,
            questions
          }
        });
      }

      if (pathname === "/api/daily-quizzes" && method === "GET") {
        const rows = db.query("SELECT * FROM daily_quizzes ORDER BY assigned_date DESC").all() as any[];
        const now = new Date();
        const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
        const ist = new Date(utc + (3600000 * 5.5));
        const year = ist.getFullYear();
        const month = String(ist.getMonth() + 1).padStart(2, '0');
        const day = String(ist.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        const hours = ist.getHours();
        const isPast12PM = hours >= 12;

        const allQuizzes = db.query("SELECT id, name, level_number, question_content FROM quizzes").all() as any[];
        const qMap = new Map<number, any>(allQuizzes.map(q => [q.id, q]));

        const list = rows.map(r => {
          let questions: any[] = [];
          if (r.questions_json) {
            try {
              const parsed = JSON.parse(r.questions_json);
              if (Array.isArray(parsed)) questions = parsed;
            } catch {}
          }

          let quizIds: number[] = [];
          try {
            quizIds = JSON.parse(r.quiz_ids_json || "[]");
          } catch {
            quizIds = [];
          }

          const quizzes = quizIds.map(id => qMap.get(id)).filter(Boolean);

          let status = 'Upcoming';
          if (r.assigned_date === todayStr) {
            status = isPast12PM ? 'Expired (12 PM IST passed)' : 'Active Today';
          } else if (r.assigned_date < todayStr) {
            status = 'Previous Date';
          }

          return {
            id: r.id,
            assignedDate: r.assigned_date,
            title: r.title,
            description: r.description,
            expiryTime: r.expiry_time || '12:00 PM IST',
            rewardXp: r.reward_xp,
            streakBonus: r.streak_bonus,
            quizIds,
            quizzes,
            questions,
            questionCount: questions.length > 0 ? questions.length : quizIds.length,
            status,
            createdAt: r.created_at
          };
        });

        return jsonResponse({ success: true, count: list.length, dailyQuizzes: list, currentIstDate: todayStr });
      }

      if (pathname === "/api/daily-quiz" && method === "POST") {
        const body = await req.json();
        const {
          assignedDate,
          title = "Today's KUIZU",
          description = "",
          questions = [],
          quizIds = [],
          expiryTime = "12:00 PM IST",
          rewardXp = 15,
          streakBonus = 5
        } = body;

        if (!assignedDate) {
          return errorResponse("Assigned date is required (YYYY-MM-DD)", 400);
        }

        // Validate 3 to 5 questions
        let finalQuestions = Array.isArray(questions) ? questions : [];
        let finalQuizIds = Array.isArray(quizIds) ? quizIds : [];

        if (finalQuestions.length === 0 && finalQuizIds.length > 0) {
          // Construct questions from quizIds if legacy
          const placeholders = finalQuizIds.map(() => "?").join(",");
          const rows = db.query(`SELECT * FROM quizzes WHERE id IN (${placeholders})`).all(...finalQuizIds) as any[];
          const rMap = new Map<number, any>(rows.map(r => [r.id, r]));
          finalQuestions = finalQuizIds.map(qid => rMap.get(qid)).filter(Boolean).map((q, idx) => ({
            id: q.id,
            num: idx + 1,
            name: q.name,
            sourceType: 'quiz',
            sourceId: q.id,
            questionContent: q.question_content,
            optionA: q.option_a,
            optionB: q.option_b,
            optionC: q.option_c,
            optionD: q.option_d,
            correctOption: q.correct_option,
            rewardXp: q.reward_xp || 10
          }));
        }

        if (finalQuestions.length < 3 || finalQuestions.length > 5) {
          return errorResponse(`Please select between 3 and 5 questions (currently ${finalQuestions.length}).`, 400);
        }

        // Extract any referenced quizIds
        const derivedQuizIds = finalQuestions
          .filter(q => q.sourceType === 'quiz' && q.sourceId)
          .map(q => Number(q.sourceId));

        const insertOrReplace = db.prepare(`
          INSERT INTO daily_quizzes (assigned_date, title, description, quiz_ids_json, questions_json, expiry_time, reward_xp, streak_bonus, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(assigned_date) DO UPDATE SET
            title = excluded.title,
            description = excluded.description,
            quiz_ids_json = excluded.quiz_ids_json,
            questions_json = excluded.questions_json,
            expiry_time = excluded.expiry_time,
            reward_xp = excluded.reward_xp,
            streak_bonus = excluded.streak_bonus
        `);

        insertOrReplace.run(
          assignedDate,
          title,
          description,
          JSON.stringify(derivedQuizIds),
          JSON.stringify(finalQuestions),
          expiryTime,
          Number(rewardXp) || 15,
          Number(streakBonus) || 5,
          new Date().toISOString()
        );

        return jsonResponse({
          success: true,
          message: `Daily Kuizu for ${assignedDate} saved successfully with ${finalQuestions.length} questions!`
        });
      }

      if (pathname.startsWith("/api/daily-quiz/") && method === "DELETE") {
        const id = pathname.replace("/api/daily-quiz/", "");
        db.prepare("DELETE FROM daily_quizzes WHERE id = ?").run(Number(id));
        return jsonResponse({ success: true, message: "Daily quiz removed successfully" });
      }

      if (pathname === "/api/daily-quiz/submit" && method === "POST") {
        const body = await req.json();
        const { answers = {}, dailyQuizId } = body;

        const answerKeys = Object.keys(answers);
        let correctCount = 0;
        let totalCount = answerKeys.length;
        const results: any[] = [];

        // Try to get active daily quiz questions to compare correct answers
        let activeDq: any = null;
        if (dailyQuizId) {
          activeDq = db.query("SELECT * FROM daily_quizzes WHERE id = ?").get(dailyQuizId);
        }
        if (!activeDq) {
          const now = new Date();
          const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
          const ist = new Date(utc + (3600000 * 5.5));
          const todayStr = `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, '0')}-${String(ist.getDate()).padStart(2, '0')}`;
          activeDq = db.query("SELECT * FROM daily_quizzes WHERE assigned_date = ?").get(todayStr);
          if (!activeDq) {
            activeDq = db.query("SELECT * FROM daily_quizzes WHERE assigned_date < ? ORDER BY assigned_date DESC LIMIT 1").get(todayStr);
          }
          if (!activeDq) {
            activeDq = db.query("SELECT * FROM daily_quizzes ORDER BY assigned_date DESC LIMIT 1").get();
          }
        }

        const answerKeyMap = new Map<string, string>(); // qid -> correctOption
        if (activeDq && activeDq.questions_json) {
          try {
            const parsed = JSON.parse(activeDq.questions_json);
            if (Array.isArray(parsed)) {
              parsed.forEach((q: any) => {
                if (q.id && q.correctOption) {
                  answerKeyMap.set(String(q.id), String(q.correctOption).toUpperCase());
                }
              });
            }
          } catch {}
        }

        // Also check quizzes table for any numeric IDs not yet in answerKeyMap
        const missingIds = answerKeys.filter(k => !answerKeyMap.has(k)).map(Number).filter(Boolean);
        if (missingIds.length > 0) {
          const placeholders = missingIds.map(() => "?").join(",");
          const rows = db.query(`SELECT id, correct_option FROM quizzes WHERE id IN (${placeholders})`).all(...missingIds) as any[];
          rows.forEach(r => {
            answerKeyMap.set(String(r.id), String(r.correct_option).toUpperCase());
          });
        }

        for (const qid of answerKeys) {
          const userChoice = (answers[qid] || '').toUpperCase();
          const correctChoice = answerKeyMap.get(String(qid)) || '';
          const isCorrect = userChoice.length > 0 && userChoice === correctChoice;
          if (isCorrect) correctCount++;
          results.push({
            questionId: qid,
            userChoice,
            correctChoice,
            isCorrect
          });
        }

        const rewardXp = activeDq?.reward_xp || 15;
        const streakBonus = activeDq?.streak_bonus || 5;

        try {
          recordDailyKuizuCompletion(
            activeDq?.id || new Date().toISOString().slice(0, 10),
            {
              id: body.id || body.userId,
              email: body.email || body.userEmail,
              name: body.name || body.userName
            },
            rewardXp
          );
        } catch (e) {
          console.warn("Could not update user stats for daily quiz:", e);
        }

        return jsonResponse({
          success: true,
          score: correctCount,
          totalQuestions: totalCount,
          rewardXp,
          streakBonus,
          results,
          message: `Daily KUIZU complete! +${rewardXp} XP and +${streakBonus} Streak awarded!`
        });
      }

      // ----------------------------------------------------
      // BATTLES API
      // ----------------------------------------------------
      if (pathname === "/api/battles" && method === "GET") {
        const battles = db.query("SELECT * FROM battles ORDER BY created_at DESC").all() as any[];
        const formatted = battles.map(b => {
          let players: any[] = [];
          try {
            players = b.players_json ? JSON.parse(b.players_json) : [];
          } catch {
            players = [];
          }
          if (!Array.isArray(players) || players.length === 0) {
            players = [
              { id: b.host_id || 'usr_host', name: b.host_name || 'Host', avatar: '/images/home_avatar.png', isHost: true, score: 0, ready: true }
            ];
          }
          return {
            id: b.id,
            roomCode: b.room_code,
            title: b.title,
            topic: b.topic,
            questionPrompt: b.question_prompt,
            questionCount: b.question_count,
            timePerQuestion: b.time_per_question,
            maxPlayers: b.max_players || 4,
            status: b.status,
            hostId: b.host_id,
            hostName: b.host_name,
            isAdminBattle: Boolean(b.host_name === 'Admin' || b.host_id === 'usr_admin' || (b.title && b.title.toLowerCase().includes('admin'))),
            players,
            options: b.options_json ? JSON.parse(b.options_json) : [],
            correctOptions: b.correct_options_json ? JSON.parse(b.correct_options_json) : [],
            createdAt: b.created_at
          };
        });
        return jsonResponse({ success: true, count: formatted.length, battles: formatted });
      }

      if (pathname.endsWith("/join") && pathname.startsWith("/api/battles/") && method === "POST") {
        const codeOrId = pathname.replace("/api/battles/", "").replace("/join", "");
        const body = await req.json().catch(() => ({}));
        const playerName = body.name || "Student " + Math.floor(100 + Math.random() * 900);
        const playerAvatar = body.avatar || "/images/home_avatar.png";
        const playerId = body.id || `usr_${Date.now()}`;

        const b = db.query("SELECT * FROM battles WHERE id = ? OR UPPER(room_code) = UPPER(?)").get(codeOrId, codeOrId) as any;
        if (!b) {
          return jsonResponse({ success: false, error: "Battle room not found" }, 404);
        }

        let players: any[] = [];
        try {
          players = b.players_json ? JSON.parse(b.players_json) : [];
        } catch {
          players = [];
        }

        if (!Array.isArray(players) || players.length === 0) {
          players = [
            { id: b.host_id || 'usr_host', name: b.host_name || 'Host', avatar: '/images/home_avatar.png', isHost: true, score: 0, ready: true }
          ];
        }

        const maxLimit = b.max_players || 4;
        const existingPlayer = players.find((p: any) => p.id === playerId || p.name === playerName);

        if (!existingPlayer) {
          if (players.length >= maxLimit) {
            return jsonResponse({ success: false, error: `Room is full (${players.length}/${maxLimit})` }, 400);
          }
          players.push({
            id: playerId,
            name: playerName,
            avatar: playerAvatar,
            isHost: false,
            score: 0,
            ready: true
          });

          db.prepare("UPDATE battles SET players_json = ? WHERE id = ?").run(JSON.stringify(players), b.id);
        }

        // Award +50 XP for attending battle created from admin side
        recordBattleAttendance(b.id, {
          id: playerId,
          email: body.email || body.userEmail,
          name: playerName
        });

        return jsonResponse({
          success: true,
          battle: {
            id: b.id,
            roomCode: b.room_code,
            title: b.title,
            topic: b.topic,
            questionPrompt: b.question_prompt,
            questionCount: b.question_count,
            timePerQuestion: b.time_per_question,
            maxPlayers: maxLimit,
            status: b.status,
            hostId: b.host_id,
            hostName: b.host_name,
            players,
            options: b.options_json ? JSON.parse(b.options_json) : [],
            correctOptions: b.correct_options_json ? JSON.parse(b.correct_options_json) : [],
            createdAt: b.created_at
          }
        });
      }

      if (pathname.startsWith("/api/battles/") && method === "GET") {
        const codeOrId = pathname.replace("/api/battles/", "");
        const b = db.query("SELECT * FROM battles WHERE id = ? OR UPPER(room_code) = UPPER(?)").get(codeOrId, codeOrId) as any;
        if (!b) {
          return jsonResponse({ success: false, error: "Battle not found" }, 404);
        }

        let players: any[] = [];
        try {
          players = b.players_json ? JSON.parse(b.players_json) : [];
        } catch {
          players = [];
        }

        if (!Array.isArray(players) || players.length === 0) {
          players = [
            { id: b.host_id || 'usr_host', name: b.host_name || 'Host', avatar: '/images/home_avatar.png', isHost: true, score: 0, ready: true }
          ];
        }

        return jsonResponse({
          success: true,
          battle: {
            id: b.id,
            roomCode: b.room_code,
            title: b.title,
            topic: b.topic,
            questionPrompt: b.question_prompt,
            questionCount: b.question_count,
            timePerQuestion: b.time_per_question,
            maxPlayers: b.max_players || 4,
            status: b.status,
            hostId: b.host_id,
            hostName: b.host_name,
            isAdminBattle: Boolean(b.host_name === 'Admin' || b.host_id === 'usr_admin' || (b.title && b.title.toLowerCase().includes('admin'))),
            players,
            options: b.options_json ? JSON.parse(b.options_json) : [],
            correctOptions: b.correct_options_json ? JSON.parse(b.correct_options_json) : [],
            questions: b.questions_json ? JSON.parse(b.questions_json) : [],
            createdAt: b.created_at
          }
        });
      }

      if (pathname.endsWith("/attend") && pathname.startsWith("/api/battles/") && method === "POST") {
        const codeOrId = pathname.replace("/api/battles/", "").replace("/attend", "");
        const body = await req.json().catch(() => ({}));
        const b = db.query("SELECT * FROM battles WHERE id = ? OR UPPER(room_code) = UPPER(?)").get(codeOrId, codeOrId) as any;
        if (!b) {
          return jsonResponse({ success: false, error: "Battle not found" }, 404);
        }
        const updatedUser = recordBattleAttendance(b.id, {
          id: body.id,
          email: body.email,
          name: body.name
        });
        return jsonResponse({
          success: true,
          message: "Battle attendance recorded (+50 XP)",
          rewardXp: 50,
          user: updatedUser
        });
      }

      if (pathname.startsWith("/api/battles/") && method === "DELETE") {
        const id = pathname.replace("/api/battles/", "");
        db.prepare("DELETE FROM battles WHERE id = ? OR room_code = ?").run(id, id);
        return jsonResponse({ success: true, message: "Battle deleted" });
      }

      if (pathname.startsWith("/api/battles/") && (method === "PUT" || method === "POST")) {
        const id = pathname.replace("/api/battles/", "");
        const body = await req.json();
        const {
          title,
          topic = "General Coding",
          questionPrompt = "Identify the correct solution",
          questionCount = 5,
          timePerQuestion = 24,
          maxPlayers = 4,
          hostName = "Admin",
          options = [],
          correctOptions = [],
          questions = []
        } = body;

        db.prepare(`
          UPDATE battles 
          SET title = ?, topic = ?, question_prompt = ?, question_count = ?, time_per_question = ?, max_players = ?, host_name = ?, options_json = ?, correct_options_json = ?, questions_json = ?
          WHERE id = ? OR room_code = ?
        `).run(
          title,
          topic,
          questionPrompt,
          Number(questionCount) || 5,
          Number(timePerQuestion) || 24,
          Number(maxPlayers) || 4,
          hostName,
          JSON.stringify(options),
          JSON.stringify(correctOptions),
          JSON.stringify(questions),
          id,
          id
        );

        return jsonResponse({ success: true, message: "Battle updated successfully" });
      }

      if (pathname === "/api/battles" && method === "POST") {
        const body = await req.json();
        const {
          title,
          topic = "General Coding",
          questionPrompt = "Identify the correct solution",
          questionCount = 5,
          timePerQuestion = 24,
          maxPlayers = 4,
          hostName = "Admin",
          options = [],
          correctOptions = [],
          questions = []
        } = body;

        if (!title) {
          return jsonResponse({ success: false, error: "Title is required" }, 400);
        }

        const id = `battle-${Date.now()}`;
        const roomCode = `KZ-${Math.floor(1000 + Math.random() * 9000)}`;
        const initialPlayers = [
          { id: 'usr_host', name: hostName || 'Admin', avatar: '/images/home_avatar.png', isHost: true, score: 0, ready: true }
        ];

        db.prepare(`
          INSERT INTO battles (id, room_code, title, topic, question_prompt, question_count, time_per_question, max_players, status, host_id, host_name, players_json, options_json, correct_options_json, questions_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'waiting', 'usr_admin', ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          roomCode,
          title,
          topic,
          questionPrompt,
          Number(questionCount) || 5,
          Number(timePerQuestion) || 24,
          Number(maxPlayers) || 4,
          hostName,
          JSON.stringify(initialPlayers),
          JSON.stringify(options),
          JSON.stringify(correctOptions),
          JSON.stringify(questions),
          new Date().toISOString()
        );

        return jsonResponse({ success: true, id, roomCode, maxPlayers: Number(maxPlayers) || 4 }, 201);
      }

      // ----------------------------------------------------
      // CONTESTS API
      // ----------------------------------------------------
      if (pathname === "/api/contests" && method === "GET") {
        const contests = db.query("SELECT * FROM contests ORDER BY created_at DESC").all() as any[];
        const formatted = contests.map(c => ({
          id: c.id,
          title: c.title,
          type: c.type,
          startDate: c.start_date,
          endDate: c.end_date,
          duration: c.duration,
          status: c.status,
          problems: c.problems_json ? JSON.parse(c.problems_json) : [],
          registeredCount: c.registered_count,
          createdAt: c.created_at
        }));
        return jsonResponse({ success: true, count: formatted.length, contests: formatted });
      }

      if (pathname.startsWith("/api/contests/") && method === "GET") {
        const id = pathname.replace("/api/contests/", "");
        const c = db.query("SELECT * FROM contests WHERE id = ?").get(id) as any;
        if (!c) {
          return jsonResponse({ success: false, error: "Contest not found" }, 404);
        }
        return jsonResponse({
          success: true,
          contest: {
            id: c.id,
            title: c.title,
            type: c.type,
            startDate: c.start_date,
            endDate: c.end_date,
            duration: c.duration,
            status: c.status,
            problems: c.problems_json ? JSON.parse(c.problems_json) : [],
            registeredCount: c.registered_count,
            createdAt: c.created_at
          }
        });
      }

      // Attend or Register for Contest (Club Activity -> +25 XP)
      if ((pathname.endsWith("/register") || pathname.endsWith("/attend")) && pathname.startsWith("/api/contests/") && method === "POST") {
        const id = pathname.replace("/api/contests/", "").replace("/register", "").replace("/attend", "");
        const body = await req.json().catch(() => ({}));
        const c = db.query("SELECT * FROM contests WHERE id = ?").get(id) as any;
        if (!c) {
          return jsonResponse({ success: false, error: "Contest not found" }, 404);
        }
        db.prepare("UPDATE contests SET registered_count = registered_count + 1 WHERE id = ?").run(c.id);
        const updatedUser = recordContestAttendance(c.title || c.id, {
          id: body.id,
          email: body.email,
          name: body.name
        });
        return jsonResponse({
          success: true,
          message: "Club Activity / Contest registered (+25 XP)",
          rewardXp: 25,
          user: updatedUser
        });
      }

      // Submit Contest Completion
      if (pathname.endsWith("/submit") && pathname.startsWith("/api/contests/") && method === "POST") {
        const id = pathname.replace("/api/contests/", "").replace("/submit", "");
        const body = await req.json().catch(() => ({}));
        const c = db.query("SELECT * FROM contests WHERE id = ?").get(id) as any;
        const contestTitle = c ? (c.title || c.id) : id;
        const updatedUser = recordContestAttendance(contestTitle, {
          id: body.id,
          email: body.email,
          name: body.name
        });
        return jsonResponse({
          success: true,
          message: "Contest submitted successfully! (+25 XP)",
          rewardXp: 25,
          user: updatedUser
        });
      }

      if (pathname.startsWith("/api/contests/") && method === "DELETE") {
        const id = pathname.replace("/api/contests/", "");
        db.prepare("DELETE FROM contests WHERE id = ?").run(id);
        return jsonResponse({ success: true, message: "Contest deleted" });
      }

      if (pathname === "/api/contests" && method === "POST") {
        const body = await req.json();
        const {
          title,
          type = "weekly",
          startDate = new Date().toISOString(),
          endDate = new Date().toISOString(),
          duration = "1h 30m",
          problems = []
        } = body;

        if (!title) {
          return jsonResponse({ success: false, error: "Title is required" }, 400);
        }

        const id = `contest-${Date.now()}`;

        db.prepare(`
          INSERT INTO contests (id, title, type, start_date, end_date, duration, status, problems_json, registered_count, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 'Upcoming', ?, 0, ?)
        `).run(
          id,
          title,
          type,
          startDate,
          endDate,
          duration,
          JSON.stringify(problems),
          new Date().toISOString()
        );

        return jsonResponse({ success: true, id }, 201);
      }

      // ----------------------------------------------------
      // CONTEST CHEATING & VIOLATION LOGS API
      // ----------------------------------------------------
      if (pathname === "/api/contests/violations" && method === "GET") {
        const filterContestId = url.searchParams.get("contestId");
        const filterSeverity = url.searchParams.get("severity");
        const filterType = url.searchParams.get("type");
        const filterSearch = url.searchParams.get("search")?.toLowerCase();

        let query = "SELECT * FROM contest_violations WHERE 1=1";
        const params: any[] = [];

        if (filterContestId && filterContestId !== "all") {
          query += " AND contest_id = ?";
          params.push(filterContestId);
        }
        if (filterSeverity && filterSeverity !== "all") {
          query += " AND LOWER(severity) = LOWER(?)";
          params.push(filterSeverity);
        }
        if (filterType && filterType !== "all") {
          query += " AND LOWER(violation_type) = LOWER(?)";
          params.push(filterType);
        }

        query += " ORDER BY timestamp DESC LIMIT 200";
        let rows = db.query(query).all(...params) as any[];

        let formatted = rows.map(r => ({
          id: r.id,
          contestId: r.contest_id,
          contestTitle: r.contest_title,
          username: r.username,
          userEmail: r.user_email,
          userAvatar: r.user_avatar,
          violationType: r.violation_type,
          details: r.details,
          severity: r.severity,
          timestamp: r.timestamp,
          status: r.status
        }));

        if (filterSearch) {
          formatted = formatted.filter(item =>
            item.username.toLowerCase().includes(filterSearch) ||
            item.userEmail.toLowerCase().includes(filterSearch) ||
            item.contestTitle.toLowerCase().includes(filterSearch) ||
            item.details.toLowerCase().includes(filterSearch) ||
            item.violationType.toLowerCase().includes(filterSearch)
          );
        }

        return jsonResponse({ success: true, count: formatted.length, violations: formatted });
      }

      if (pathname === "/api/contests/violations" && method === "POST") {
        const body = await req.json();
        const {
          id = `viol_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          contestId = "active-contest",
          contestTitle = "Live Coding Contest",
          username = "Candidate",
          userEmail = "",
          userAvatar = "",
          violationType = "TAB_SWITCH",
          details = "Anti-cheat violation detected during contest session.",
          severity = "warning",
          timestamp = new Date().toISOString(),
          status = "flagged"
        } = body;

        db.prepare(`
          INSERT INTO contest_violations (id, contest_id, contest_title, username, user_email, user_avatar, violation_type, details, severity, timestamp, status)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, contestId, contestTitle, username, userEmail, userAvatar, violationType, details, severity, timestamp, status);

        return jsonResponse({ success: true, id }, 201);
      }

      if (pathname === "/api/contests/violations/action" && method === "POST") {
        const body = await req.json();
        const { id, status = "warned" } = body;
        db.prepare("UPDATE contest_violations SET status = ? WHERE id = ?").run(status, id);
        return jsonResponse({ success: true, id, status });
      }

      if (pathname === "/api/contests/violations/clear" && method === "POST") {
        db.prepare("DELETE FROM contest_violations").run();
        return jsonResponse({ success: true, message: "Cheating logs cleared successfully" });
      }

      // ----------------------------------------------------
      // QUESTS API
      // ----------------------------------------------------
      if (pathname === "/api/quests" && method === "GET") {
        const quests = db.query("SELECT * FROM quests ORDER BY step_number ASC").all() as any[];
        const formatted = quests.map(q => ({
          id: q.id,
          title: q.title,
          description: q.description,
          stepNumber: q.step_number,
          status: q.status,
          rewardXp: q.reward_xp,
          problems: q.problems_json ? JSON.parse(q.problems_json) : [],
          createdAt: q.created_at
        }));
        return jsonResponse({ success: true, count: formatted.length, quests: formatted });
      }

      if (pathname === "/api/quests" && method === "POST") {
        const body = await req.json();
        const {
          title,
          description = "",
          rewardXp = 100,
          problems = []
        } = body;

        if (!title) {
          return jsonResponse({ success: false, error: "Quest title is required" }, 400);
        }

        const countRow = db.query("SELECT COUNT(*) as count FROM quests").get() as { count: number };
        const stepNumber = countRow.count + 1;
        const id = `quest-${Date.now()}`;

        db.prepare(`
          INSERT INTO quests (id, title, description, step_number, status, reward_xp, problems_json, created_at)
          VALUES (?, ?, ?, ?, 'available', ?, ?, ?)
        `).run(
          id,
          title,
          description,
          stepNumber,
          Number(rewardXp) || 100,
          JSON.stringify(problems),
          new Date().toISOString()
        );

        return jsonResponse({ success: true, id, stepNumber }, 201);
      }

      if (pathname.startsWith("/api/quests/") && method === "DELETE") {
        const id = pathname.replace("/api/quests/", "").trim();
        db.prepare("DELETE FROM quests WHERE id = ?").run(id);
        return jsonResponse({ success: true, message: `Quest ${id} deleted` });
      }

      // ----------------------------------------------------
      // CODE EXECUTION / COMPILER ENGINE API
      // ----------------------------------------------------
      if (pathname === "/api/execute" && method === "POST") {
        const body = await req.json();
        const {
          language = "python",
          code = "",
          testCases = [],
          isSubmission = false
        } = body;

        if (!code || typeof code !== "string") {
          return jsonResponse({ success: false, error: "Code content is required" }, 400);
        }

        // Normalize language key
        const langKey = language.toLowerCase().trim();

        // Helper to normalize outputs for comparison (strips trailing whitespace & carriage returns)
        const normalizeOutput = (str: any) => {
          return String(str || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
        };

        const results: any[] = [];
        let anyFailed = false;
        let compilerStdout = "";

        // Execute sequentially per testcase
        for (let i = 0; i < testCases.length; i++) {
          const tc = testCases[i];
          const stdinInput = String(tc.input || "");
          const expectedOut = normalizeOutput(tc.output || tc.summaryExpected || "");
          const isSample = tc.visibility === "Sample";

          let actualOut = "";
          let tcError = "";
          let tcExitCode = 0;
          let execDurationMs = 0;

          const startTs = Date.now();

          try {
            if (langKey === "python" || langKey === "python3") {
              // Local Python 3 execution
              const proc = Bun.spawn(["python3", "-c", code], {
                stdin: new Response(stdinInput).body,
                stdout: "pipe",
                stderr: "pipe"
              });
              const [stdoutBuf, stderrBuf] = await Promise.all([
                new Response(proc.stdout).text(),
                new Response(proc.stderr).text()
              ]);
              await proc.exited;
              tcExitCode = proc.exitCode || 0;
              actualOut = stdoutBuf;
              tcError = stderrBuf;
            } else if (langKey === "javascript" || langKey === "js" || langKey === "typescript" || langKey === "ts") {
              // Local Bun execution (instant native execution for JS & TS)
              const isTs = langKey === "typescript" || langKey === "ts" || langKey.includes("type");
              const ext = isTs ? "ts" : "js";
              const tmpFile = `/tmp/kuizu_run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
              await Bun.write(tmpFile, code);

              const proc = Bun.spawn(["/Users/anujchavan/.bun/bin/bun", "run", tmpFile], {
                stdin: new Response(stdinInput).body,
                stdout: "pipe",
                stderr: "pipe"
              });
              const [stdoutBuf, stderrBuf] = await Promise.all([
                new Response(proc.stdout).text(),
                new Response(proc.stderr).text()
              ]);
              await proc.exited;
              tcExitCode = proc.exitCode || 0;
              actualOut = stdoutBuf;
              tcError = stderrBuf;

              try {
                await Bun.spawn(["rm", "-f", tmpFile]).exited;
              } catch {}
            } else if (langKey === "cpp" || langKey === "c++") {
              // Local Clang++ compilation & execution
              const tmpDir = `/tmp/kuizu_run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
              await Bun.write(`${tmpDir}.cpp`, code);

              const compileProc = Bun.spawn(["clang++", "-O2", "-std=c++17", `${tmpDir}.cpp`, "-o", tmpDir], {
                stdout: "pipe",
                stderr: "pipe"
              });
              const compileErr = await new Response(compileProc.stderr).text();
              await compileProc.exited;

              if (compileProc.exitCode !== 0) {
                tcExitCode = compileProc.exitCode || 1;
                tcError = compileErr || "Compilation failed";
              } else {
                const runProc = Bun.spawn([tmpDir], {
                  stdin: new Response(stdinInput).body,
                  stdout: "pipe",
                  stderr: "pipe"
                });
                const [runOut, runErr] = await Promise.all([
                  new Response(runProc.stdout).text(),
                  new Response(runProc.stderr).text()
                ]);
                await runProc.exited;
                tcExitCode = runProc.exitCode || 0;
                actualOut = runOut;
                tcError = runErr;
              }

              // Cleanup binaries
              try {
                await Bun.spawn(["rm", "-f", `${tmpDir}.cpp`, tmpDir]).exited;
              } catch {}
            } else if (langKey === "java") {
              // Godbolt Cloud Execution for Java (strip 'public class' so it compiles as unnamed compilation unit)
              const javaSource = code.replace(/\bpublic\s+class\b/g, 'class');
              const gbRes = await fetch("https://godbolt.org/api/compiler/java2100/compile", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify({
                  source: javaSource,
                  options: {
                    userArguments: "",
                    executeParameters: { args: [], stdin: stdinInput },
                    compilerOptions: { executorRequest: true }
                  }
                })
              });
              if (gbRes.ok) {
                const gbData = (await gbRes.json()) as any;
                const stdoutLines = (gbData.stdout || []).map((s: any) => s.text || "").join("\n");
                const stderrLines = (gbData.stderr || []).map((s: any) => s.text || "").join("\n");
                actualOut = stdoutLines;
                tcError = stderrLines;
                tcExitCode = gbData.code || 0;
              } else {
                tcError = `Java execution service error (${gbRes.status})`;
                tcExitCode = 1;
              }
            } else if (langKey === "go" || langKey === "golang") {
              // Godbolt Cloud Execution for Go
              const gbRes = await fetch("https://godbolt.org/api/compiler/gl1238/compile", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify({
                  source: code,
                  options: {
                    userArguments: "",
                    executeParameters: { args: [], stdin: stdinInput },
                    compilerOptions: { executorRequest: true }
                  }
                })
              });
              if (gbRes.ok) {
                const gbData = (await gbRes.json()) as any;
                const stdoutLines = (gbData.stdout || []).map((s: any) => s.text || "").join("\n");
                const stderrLines = (gbData.stderr || []).map((s: any) => s.text || "").join("\n");
                actualOut = stdoutLines;
                tcError = stderrLines;
                tcExitCode = gbData.code || 0;
              } else {
                tcError = `Go execution service error (${gbRes.status})`;
                tcExitCode = 1;
              }
            } else if (langKey === "csharp" || langKey === "cs" || langKey === "c#") {
              // Godbolt Cloud Execution for C# (.NET 9)
              const gbRes = await fetch("https://godbolt.org/api/compiler/dotnet90csharpcoreclr/compile", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Accept": "application/json" },
                body: JSON.stringify({
                  source: code,
                  options: {
                    userArguments: "",
                    executeParameters: { args: [], stdin: stdinInput },
                    compilerOptions: { executorRequest: true }
                  }
                })
              });
              if (gbRes.ok) {
                const gbData = (await gbRes.json()) as any;
                const stdoutLines = (gbData.stdout || []).map((s: any) => s.text || "").join("\n");
                const stderrLines = (gbData.stderr || []).map((s: any) => s.text || "").join("\n");
                actualOut = stdoutLines;
                tcError = stderrLines;
                tcExitCode = gbData.code || 0;
              } else {
                tcError = `C# execution service error (${gbRes.status})`;
                tcExitCode = 1;
              }
            } else {
              tcError = `Language "${language}" not supported.`;
              tcExitCode = 1;
            }
          } catch (e: any) {
            tcError = e.message || "Runtime exception occurred";
            tcExitCode = 1;
          }

          execDurationMs = Date.now() - startTs;

          const trimmedActual = normalizeOutput(actualOut);
          const isPassed = tcExitCode === 0 && !tcError && (expectedOut ? trimmedActual === expectedOut : true);

          if (!isPassed) {
            anyFailed = true;
          }

          if (i === 0) {
            compilerStdout = tcError ? tcError : (actualOut ? actualOut : "[Executed cleanly with no stdout]");
          }

          results.push({
            num: tc.num || i + 1,
            name: tc.name || `Test Case ${i + 1}`,
            passed: isPassed,
            status: isPassed ? "Passed" : (tcExitCode !== 0 || tcError ? "Runtime Error" : "Wrong Answer"),
            visibility: isSample ? "Sample" : "Hidden",
            input: isSample || !isSubmission ? stdinInput : "[Hidden Test Case]",
            expectedOutput: expectedOut,
            actualOutput: isSample || !isSubmission ? trimmedActual : (isPassed ? "[Hidden Output Passed]" : "[Hidden Output Differed]"),
            error: tcError,
            durationMs: execDurationMs
          });

          // In submission mode, fail early after first failing test case
          if (isSubmission && !isPassed) {
            break;
          }
        }

        return jsonResponse({
          success: true,
          allPassed: !anyFailed,
          compilerStdout,
          passedCount: results.filter(r => r.passed).length,
          totalCount: testCases.length,
          results
        });
      }

      // ----------------------------------------------------
      // APP SETTINGS API (Game Audio & BGM)
      // ----------------------------------------------------
      if (pathname === "/api/settings/audio" && method === "GET") {
        const enabledRow = db.query("SELECT value FROM app_settings WHERE key = 'bgm_enabled'").get() as { value: string } | null;
        const volumeRow = db.query("SELECT value FROM app_settings WHERE key = 'bgm_volume'").get() as { value: string } | null;
        
        const bgmEnabled = enabledRow ? enabledRow.value === 'true' : true;
        const bgmVolume = volumeRow ? parseFloat(volumeRow.value) || 0.5 : 0.5;

        return jsonResponse({
          success: true,
          bgmEnabled,
          bgmVolume
        });
      }

      if (pathname === "/api/settings/audio" && method === "POST") {
        const body = await req.json();
        const { bgmEnabled = true, bgmVolume = 0.5 } = body;

        const setStmt = db.prepare(`
          INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
        `);

        setStmt.run('bgm_enabled', String(Boolean(bgmEnabled)), new Date().toISOString());
        setStmt.run('bgm_volume', String(Math.max(0, Math.min(1, Number(bgmVolume) || 0.5))), new Date().toISOString());

        return jsonResponse({
          success: true,
          message: "Game BGM settings saved successfully!",
          bgmEnabled: Boolean(bgmEnabled),
          bgmVolume: Number(bgmVolume)
        });
      }

      // ----------------------------------------------------
      // EMAIL DISPATCH (GMAIL SMTP + RESEND FALLBACK)
      // ----------------------------------------------------
      if (pathname === "/api/email/send" && method === "POST") {
        const body = await req.json();
        const gmailUser = process.env.GMAIL_USER || "xyz577616@gmail.com";
        const gmailPass = (process.env.GMAIL_PASS || "ezxsvfmmuazjecvz").replace(/\s+/g, "");
        const { to, subject, html, text, from = `"KUIZU" <${gmailUser}>`, attachments } = body;
        const resendApiKey = process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY || "";

        if (!to || !subject) {
          return jsonResponse({ success: false, error: 'Recipient "to" and "subject" are required' }, 400);
        }

        // Primary: Gmail SMTP
        if (gmailUser && gmailPass) {
          try {
            const transporter = nodemailer.createTransport({
              service: "gmail",
              auth: {
                user: gmailUser,
                pass: gmailPass
              }
            });

            const mailOptions: any = {
              from: from.includes("<") ? from : `"KUIZU" <${gmailUser}>`,
              to: Array.isArray(to) ? to.join(", ") : to,
              subject,
              html,
              text: text || (html ? html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "")
            };

            if (attachments && Array.isArray(attachments) && attachments.length > 0) {
              mailOptions.attachments = attachments;
            }

            const info = await transporter.sendMail(mailOptions);
            console.log("✅ [Email Bun Server] Sent via Gmail SMTP:", info.messageId, "to:", to);
            return jsonResponse({
              success: true,
              service: "gmail",
              messageId: info.messageId,
              response: info.response,
              to
            });
          } catch (gmailErr: any) {
            console.warn("⚠️ [Email Bun Server] Gmail failed, trying Resend fallback:", gmailErr.message);
          }
        }

        if (!resendApiKey) {
          console.log(`ℹ️ [Email Bun Backend] Email simulated for: ${to} - "${subject}"`);
          return jsonResponse({
            success: true,
            simulated: true,
            message: "Email simulated (no live credentials succeeded)",
            to,
            subject
          });
        }

        try {
          const payload: any = {
            from: "KUIZU <onboarding@resend.dev>",
            to: Array.isArray(to) ? to : [to],
            subject,
            html,
            text
          };
          if (attachments && Array.isArray(attachments) && attachments.length > 0) {
            payload.attachments = attachments;
          }

          const resendRes = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${resendApiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
          });

          const resendData = await resendRes.json();
          if (!resendRes.ok) {
            console.warn("⚠️ [Resend Backend] Error:", resendData);
            return jsonResponse({ success: false, error: resendData }, resendRes.status);
          }

          console.log("✅ [Resend Backend] Email sent successfully:", resendData);
          return jsonResponse({ success: true, service: "resend", data: resendData });
        } catch (sendErr: any) {
          console.warn("⚠️ [Resend Backend] Network error:", sendErr);
          return jsonResponse({ success: false, error: sendErr.message }, 500);
        }
      }

      return jsonResponse({ error: "Endpoint not found" }, 404);
    } catch (err: any) {
      console.error("[Backend Error]", err);
      return jsonResponse({ success: false, error: err.message || "Internal Server Error" }, 500);
    }
  }
});

console.log(`🚀 Kuizu Bun Backend running at http://localhost:${PORT}`);
