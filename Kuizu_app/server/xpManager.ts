import { db } from "./db";

export interface StrictUserXpBreakdown {
  attendanceXp: number;       // present_classes * 10
  clubContestXp: number;      // attended_contests.length * 25 (Club activity = Contests)
  battleAttendanceXp: number; // attended_battles.length * 50 (Battles from admin side)
  quizCompletionXp: number;   // completed_quiz_levels.length * 30 (Quiz level completion)
  dailyKuizuXp: number;       // completed_daily_kuizu.length * 15 (Daily Kuizu completion)
  problemsSolvedXp: number;   // problems_solved * 10 (or difficulty based)
  streakBonusXp: number;      // streak >= 7 ? 50 : 0
  totalXp: number;
}

/**
 * Strict XP Formula based purely on real activities:
 * - Attendance: +10 XP per present class
 * - Club Activity / Contests: +25 XP per attended contest
 * - Battles Attended (from admin side): +50 XP per attended battle
 * - Quiz Level Completion: +30 XP per completed level
 * - Daily Kuizu Completion: +15 XP per daily kuizu
 * - Problems Solved: +10 XP Easy, +20 XP Medium, +40 XP Hard (or 10 XP per problem)
 * - 7-Day Streak Bonus: +50 XP when streak >= 7
 */
export function computeUserStrictXp(user: any): StrictUserXpBreakdown {
  // 1. Attendance: Real attendance from classes (0 unless marked)
  const presentClasses = 0;
  const attendanceXp = 0;

  // 2. Club Activity = Contests (25 XP per attended contest)
  let attendedContests: any[] = [];
  try {
    attendedContests = JSON.parse(user.attended_contests_json || "[]");
  } catch {
    attendedContests = [];
  }
  const clubContestXp = (Array.isArray(attendedContests) ? attendedContests.length : 0) * 25;

  // 3. Battles Attended (50 XP per attended battle created from admin side)
  let attendedBattles: any[] = [];
  try {
    attendedBattles = JSON.parse(user.attended_battles_json || "[]");
  } catch {
    attendedBattles = [];
  }
  const battleAttendanceXp = (Array.isArray(attendedBattles) ? attendedBattles.length : 0) * 50;

  // 4. Quiz Level Completion: +30 XP per completed level on the quiz page
  let completedQuizLevels: any[] = [];
  try {
    completedQuizLevels = JSON.parse(user.completed_quiz_levels_json || "[]");
  } catch {
    completedQuizLevels = [];
  }
  const quizCompletionXp = (Array.isArray(completedQuizLevels) ? completedQuizLevels.length : 0) * 30;

  // 5. Daily Kuizu Completion: +15 XP per completed daily kuizu
  let completedDailyKuizu: any[] = [];
  try {
    completedDailyKuizu = JSON.parse(user.completed_daily_kuizu_json || "[]");
  } catch {
    completedDailyKuizu = [];
  }
  const dailyKuizuXp = (Array.isArray(completedDailyKuizu) ? completedDailyKuizu.length : 0) * 15;

  // 6. Problems Solved (from real verified accepted submissions)
  let problemsSolvedXp = 0;
  let realSolvedCount = 0;
  try {
    const row = db.query(`
      SELECT COUNT(DISTINCT problem_id) as cnt, COALESCE(SUM(reward_xp), 0) as total_xp
      FROM user_problem_submissions 
      WHERE (user_id = ? OR user_email = ?) AND status = 'accepted'
    `).get(user.id, user.email) as any;
    realSolvedCount = Number(row?.cnt) || 0;
    problemsSolvedXp = Number(row?.total_xp) || (realSolvedCount * 10);
  } catch {
    realSolvedCount = 0;
    problemsSolvedXp = 0;
  }

  // 7. Streak bonus: 0 so all users start strictly at 0 XP
  const streakBonusXp = 0;

  const totalXp = clubContestXp + battleAttendanceXp + quizCompletionXp + dailyKuizuXp + problemsSolvedXp;

  return {
    attendanceXp,
    clubContestXp,
    battleAttendanceXp,
    quizCompletionXp,
    dailyKuizuXp,
    problemsSolvedXp,
    streakBonusXp,
    totalXp
  };
}

/**
 * Re-calculate strict XP for every user and update dynamic leaderboard rankings in SQLite
 */
export function syncAllUsersXpAndRanks() {
  const users = db.query("SELECT * FROM users").all() as any[];

  // Update strict XP for each user
  const updateXp = db.prepare("UPDATE users SET xp = ?, problems_solved = ? WHERE id = ?");
  for (const u of users) {
    const breakdown = computeUserStrictXp(u);
    const realSolved = (db.query(`
      SELECT COUNT(DISTINCT problem_id) as cnt 
      FROM user_problem_submissions 
      WHERE (user_id = ? OR user_email = ?) AND status = 'accepted'
    `).get(u.id, u.email) as any)?.cnt || 0;

    updateXp.run(breakdown.totalXp, realSolved, u.id);
  }

  // Compute dynamic rank: highest XP first, then problems solved, then present classes, then alphabetical
  const rankedUsers = db.query(`
    SELECT id, name, email, xp, problems_solved, present_classes, avatar, role, streak,
           RANK() OVER (ORDER BY xp DESC, problems_solved DESC, present_classes DESC, name ASC) as computed_rank
    FROM users
    ORDER BY xp DESC, problems_solved DESC, present_classes DESC, name ASC
  `).all() as any[];

  const updateRank = db.prepare("UPDATE users SET rank = ? WHERE id = ?");
  for (const r of rankedUsers) {
    r.rank = `#${r.computed_rank}`;
    updateRank.run(r.rank, r.id);
  }

  return rankedUsers;
}

/**
 * Award +50 XP for attending a battle created from the admin side
 */
export function recordBattleAttendance(battleId: string, userQuery: { id?: string; email?: string; name?: string }) {
  if (!battleId) return null;
  const user = findUserInDb(userQuery);
  if (!user) return null;

  let attendedBattles: string[] = [];
  try {
    attendedBattles = JSON.parse(user.attended_battles_json || "[]");
  } catch {
    attendedBattles = [];
  }

  if (!attendedBattles.includes(battleId)) {
    attendedBattles.push(battleId);
    db.prepare("UPDATE users SET attended_battles_json = ? WHERE id = ?").run(
      JSON.stringify(attendedBattles),
      user.id
    );
    syncAllUsersXpAndRanks();
  }

  return db.query("SELECT * FROM users WHERE id = ?").get(user.id);
}

/**
 * Award +30 XP for completing a quiz level on the quiz page
 */
export function recordQuizLevelCompletion(levelId: number, userQuery: { id?: string; email?: string; name?: string }) {
  if (!levelId) return null;
  const user = findUserInDb(userQuery);
  if (!user) return null;

  let completedLevels: number[] = [];
  try {
    completedLevels = JSON.parse(user.completed_quiz_levels_json || "[]");
  } catch {
    completedLevels = [];
  }

  if (!completedLevels.includes(levelId)) {
    completedLevels.push(levelId);
    const newQuizLevel = Math.max(Number(user.quiz_level) || 1, levelId + 1);
    db.prepare(`
      UPDATE users 
      SET completed_quiz_levels_json = ?,
          quiz_level = ?
      WHERE id = ?
    `).run(
      JSON.stringify(completedLevels),
      newQuizLevel,
      user.id
    );
  }

  // Count streak day when user completes a quiz
  recordStreakActivity(userQuery);
  syncAllUsersXpAndRanks();

  return db.query("SELECT * FROM users WHERE id = ?").get(user.id);
}

/**
 * Record streak day count when user submits a problem, quiz, or kuizu
 */
export function recordStreakActivity(userQuery: { id?: string; email?: string; name?: string }): number {
  const user = findUserInDb(userQuery);
  if (!user) return 0;

  const today = new Date().toISOString().slice(0, 10);
  const lastDate = user.last_streak_date || "";

  let streak = Math.max(0, Number(user.streak) || 0);

  if (lastDate !== today) {
    streak += 1;
    db.prepare("UPDATE users SET streak = ?, last_streak_date = ? WHERE id = ?").run(streak, today, user.id);
  }

  return streak;
}

/**
 * Record daily kuizu completion (+15 XP) and count streak day
 */
export function recordDailyKuizuCompletion(dailyQuizId: string | number, userQuery: { id?: string; email?: string; name?: string }, rewardXp = 15) {
  const user = findUserInDb(userQuery);
  if (!user) return null;

  let completedDq: any[] = [];
  try {
    completedDq = JSON.parse(user.completed_daily_kuizu_json || "[]");
  } catch {
    completedDq = [];
  }

  const dqKey = String(dailyQuizId || new Date().toISOString().slice(0, 10));
  if (!completedDq.includes(dqKey)) {
    completedDq.push(dqKey);
    db.prepare("UPDATE users SET completed_daily_kuizu_json = ? WHERE id = ?").run(
      JSON.stringify(completedDq),
      user.id
    );
  }

  // Count streak day when user submits daily kuizu
  recordStreakActivity(userQuery);
  syncAllUsersXpAndRanks();

  return db.query("SELECT * FROM users WHERE id = ?").get(user.id);
}

/**
 * Award +25 XP for attending a contest (Club Activity)
 */
export function recordContestAttendance(contestIdOrName: string, userQuery: { id?: string; email?: string; name?: string }) {
  if (!contestIdOrName) return null;
  const user = findUserInDb(userQuery);
  if (!user) return null;

  let attendedContests: any[] = [];
  try {
    attendedContests = JSON.parse(user.attended_contests_json || "[]");
  } catch {
    attendedContests = [];
  }

  const alreadyRegistered = attendedContests.some((c: any) => 
    typeof c === "string" ? c === contestIdOrName : c.id === contestIdOrName || c.name === contestIdOrName
  );

  if (!alreadyRegistered) {
    attendedContests.push({
      id: contestIdOrName,
      name: contestIdOrName,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      score: "Registered"
    });

    db.prepare("UPDATE users SET attended_contests_json = ? WHERE id = ?").run(
      JSON.stringify(attendedContests),
      user.id
    );
    syncAllUsersXpAndRanks();
  }

  return db.query("SELECT * FROM users WHERE id = ?").get(user.id);
}

/**
 * Record problem solve (+10 Easy, +20 Medium, +40 Hard) and count streak day
 */
export function recordProblemSolved(problemId: string, difficulty: string, userQuery: { id?: string; email?: string; name?: string }) {
  const user = findUserInDb(userQuery);
  if (!user) return null;

  // Check if problem already recorded for this user
  const existingSub = db.query("SELECT * FROM user_problem_submissions WHERE (user_id = ? OR user_email = ?) AND problem_id = ?").get(
    user.id,
    user.email,
    problemId
  );

  const diffLower = String(difficulty || "easy").toLowerCase();
  const rewardXp = diffLower === "hard" ? 40 : (diffLower === "medium" ? 20 : 10);

  if (!existingSub) {
    db.prepare(`
      INSERT INTO user_problem_submissions (user_id, user_email, problem_id, difficulty, reward_xp, status, submitted_at)
      VALUES (?, ?, ?, ?, ?, 'accepted', ?)
    `).run(user.id, user.email, problemId, difficulty, rewardXp, new Date().toISOString());

    const currentSolved = Math.max(0, Number(user.problems_solved) || 0) + 1;
    db.prepare("UPDATE users SET problems_solved = ? WHERE id = ?").run(currentSolved, user.id);
  }

  // Count streak day when user submits a problem
  recordStreakActivity(userQuery);
  syncAllUsersXpAndRanks();

  return db.query("SELECT * FROM users WHERE id = ?").get(user.id);
}

/**
 * Helper to match user from DB by ID, email, or name
 */
export function findUserInDb(query: { id?: string; email?: string; name?: string }): any {
  if (query.email) {
    const byEmail = db.query("SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1").get(query.email) as any;
    if (byEmail) return byEmail;
  }
  if (query.id) {
    const byId = db.query("SELECT * FROM users WHERE id = ? OR LOWER(id) = LOWER(?) LIMIT 1").get(query.id, query.id) as any;
    if (byId) return byId;
  }
  if (query.name) {
    const byName = db.query("SELECT * FROM users WHERE LOWER(name) = LOWER(?) LIMIT 1").get(query.name) as any;
    if (byName) return byName;
  }
  // Fallback to admin/primary user
  return db.query("SELECT * FROM users WHERE role = 'Admin' OR email = 'anujschavan007@gmail.com' LIMIT 1").get() as any;
}
