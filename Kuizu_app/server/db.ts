import { Database } from "bun:sqlite";
import { resolve } from "path";

// Initialize SQLite database stored persistently in server/kuizu.db
const dbPath = resolve(import.meta.dirname, "kuizu.db");
export const db = new Database(dbPath, { create: true });

// Enable WAL mode for high performance
db.exec("PRAGMA journal_mode = WAL;");

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    student_id TEXT,
    avatar TEXT,
    role TEXT DEFAULT 'Student',
    status TEXT DEFAULT 'active',
    rank TEXT DEFAULT '#1',
    xp INTEGER DEFAULT 0,
    problems_solved INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    last_streak_date TEXT DEFAULT '',
    present_classes INTEGER DEFAULT 0,
    total_classes INTEGER DEFAULT 50,
    cw_completed INTEGER DEFAULT 0,
    cw_total INTEGER DEFAULT 20,
    cw_url TEXT DEFAULT '',
    hw_completed INTEGER DEFAULT 0,
    hw_total INTEGER DEFAULT 20,
    hw_url TEXT DEFAULT '',
    leetcode_solved INTEGER DEFAULT 0,
    leetcode_url TEXT DEFAULT '',
    quiz_level INTEGER DEFAULT 1,
    daily_kuizu_active INTEGER DEFAULT 1,
    attended_contests_json TEXT DEFAULT '[]',
    attended_battles_json TEXT DEFAULT '[]',
    completed_quiz_levels_json TEXT DEFAULT '[]',
    completed_daily_kuizu_json TEXT DEFAULT '[]',
    submitted_quests_json TEXT DEFAULT '[]',
    joined_date TEXT NOT NULL,
    last_active TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS problems (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    difficulty TEXT NOT NULL,
    topic_name TEXT NOT NULL,
    topic_icon TEXT NOT NULL,
    reward_xp INTEGER NOT NULL,
    description TEXT,
    statement TEXT,
    input_format TEXT,
    output_format TEXT,
    sample_input TEXT,
    sample_output TEXT,
    test_cases_json TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_problem_submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    user_email TEXT,
    problem_id TEXT NOT NULL,
    difficulty TEXT,
    reward_xp INTEGER DEFAULT 10,
    status TEXT DEFAULT 'accepted',
    submitted_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    level_number INTEGER DEFAULT 1,
    status TEXT DEFAULT 'unlocked',
    stars INTEGER DEFAULT 0,
    max_stars INTEGER DEFAULT 3,
    question_count INTEGER DEFAULT 10,
    reward_xp INTEGER DEFAULT 30,
    time_limit_seconds INTEGER DEFAULT 600,
    position_left REAL DEFAULT 15.0,
    position_top REAL DEFAULT 70.0,
    question_content TEXT,
    option_a TEXT,
    option_b TEXT,
    option_c TEXT,
    option_d TEXT,
    correct_option TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quiz_level_progress (
    level_id INTEGER PRIMARY KEY,
    status TEXT DEFAULT 'locked',
    stars INTEGER DEFAULT 0,
    unlocked_at TEXT,
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS daily_quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assigned_date TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    quiz_ids_json TEXT NOT NULL,
    questions_json TEXT,
    expiry_time TEXT DEFAULT '12:00 PM IST',
    reward_xp INTEGER DEFAULT 15,
    streak_bonus INTEGER DEFAULT 5,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS battles (
    id TEXT PRIMARY KEY,
    room_code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    topic TEXT NOT NULL,
    question_prompt TEXT NOT NULL,
    question_count INTEGER DEFAULT 5,
    time_per_question INTEGER DEFAULT 24,
    max_players INTEGER DEFAULT 4,
    status TEXT DEFAULT 'waiting',
    host_id TEXT,
    host_name TEXT,
    options_json TEXT,
    correct_options_json TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS contests (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    duration TEXT NOT NULL,
    status TEXT DEFAULT 'Upcoming',
    problems_json TEXT,
    registered_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS quests (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    step_number INTEGER NOT NULL,
    status TEXT DEFAULT 'available',
    reward_xp INTEGER DEFAULT 100,
    problems_json TEXT,
    created_at TEXT NOT NULL
  );
`);

// Safe column migrations for existing databases
try {
  db.run("ALTER TABLE users ADD COLUMN attended_battles_json TEXT DEFAULT '[]';");
} catch {}
try {
  db.run("ALTER TABLE users ADD COLUMN completed_quiz_levels_json TEXT DEFAULT '[]';");
} catch {}
try {
  db.run("ALTER TABLE users ADD COLUMN last_streak_date TEXT DEFAULT '';");
} catch {}
try {
  db.run("ALTER TABLE users ADD COLUMN completed_daily_kuizu_json TEXT DEFAULT '[]';");
} catch {}
try {
  db.run("ALTER TABLE battles ADD COLUMN max_players INTEGER DEFAULT 4;");
} catch {
  // Column already exists
}
try {
  db.run("ALTER TABLE battles ADD COLUMN players_json TEXT DEFAULT '[]';");
} catch {
  // Column already exists
}
try {
  db.run("ALTER TABLE battles ADD COLUMN questions_json TEXT;");
} catch {
  // Column already exists
}
try {
  db.run("ALTER TABLE daily_quizzes ADD COLUMN questions_json TEXT;");
} catch {
  // Column already exists
}

// Ensure quizzes have 30 XP per level completion
try {
  db.run("UPDATE quizzes SET reward_xp = 30;");
} catch {}

// Seed default users if table is empty
const userCount = db.query("SELECT COUNT(*) as count FROM users").get() as { count: number };
if (userCount.count === 0) {
  const insertUser = db.prepare(`
    INSERT INTO users (
      id, name, email, student_id, avatar, role, status, rank, xp,
      problems_solved, streak, present_classes, total_classes,
      cw_completed, cw_total, cw_url,
      hw_completed, hw_total, hw_url,
      leetcode_solved, leetcode_url,
      quiz_level, daily_kuizu_active,
      attended_contests_json, attended_battles_json, completed_quiz_levels_json, submitted_quests_json,
      joined_date, last_active
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialContests = '[]';
  const initialQuests = '[]';

  const initialUsers = [
    [
      'usr_admin_1',
      'Anuj Sandeep Chavan',
      'anujschavan007@gmail.com',
      'STU00123',
      '/images/home_avatar.png',
      'Admin',
      'active',
      '#1',
      0,
      0,
      7,
      4,
      50,
      18,
      20,
      'https://www.hackerrank.com/domains/tutorials/10-days-of-javascript',
      16,
      20,
      'https://www.hackerrank.com/domains/algorithms',
      342,
      'https://leetcode.com/u/anujchavan/',
      1,
      1,
      initialContests,
      '[]',
      '[]',
      initialQuests,
      'Apr 10, 2025',
      'Today'
    ],
    [
      'user_3KsiED4Ddm2EG22yym48wW5g9cO',
      'Pravin Ghodake',
      'ghodakepravin154@gmail.com',
      'STU00101',
      'https://lh3.googleusercontent.com/a/ACg8ocLk8puoR0Gyt6pr_hs_xYr94CG875cFzd7D-CbinEWNA_eGmA=s1000-c',
      'Student',
      'active',
      '#2',
      0,
      0,
      1,
      0,
      50,
      0,
      20,
      '',
      0,
      20,
      '',
      0,
      '',
      1,
      1,
      initialContests,
      '[]',
      '[]',
      initialQuests,
      'Apr 19, 2025',
      'Today'
    ],
    [
      'user_3Ksi43rGm3NozmbimJalAFTWo3p',
      'Pravin Ghodake Live',
      'pravin.student@msot.edu',
      'STU00102',
      '',
      'Student',
      'active',
      '#3',
      0,
      0,
      1,
      0,
      50,
      0,
      20,
      '',
      0,
      20,
      '',
      0,
      '',
      1,
      1,
      initialContests,
      '[]',
      '[]',
      initialQuests,
      'Apr 19, 2025',
      'Today'
    ]
  ];

  for (const u of initialUsers) {
    insertUser.run(...u);
  }
}

// Seed default problems if table is empty
const problemCount = db.query("SELECT COUNT(*) as count FROM problems").get() as { count: number };
if (problemCount.count === 0) {
  const insertProblem = db.prepare(`
    INSERT INTO problems (id, title, slug, difficulty, topic_name, topic_icon, reward_xp, description, statement, input_format, output_format, sample_input, sample_output, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialProblems = [
    [
      '001',
      'Two Sum',
      'two-sum',
      'Easy',
      'Arrays',
      'arrays',
      10,
      'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
      'Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.',
      'The first line contains an integer n (size of array). The second line contains n space-separated integers. The third line contains the target integer.',
      'Output two space-separated indices (0-indexed).',
      '4\n2 7 11 15\n9',
      '0 1',
      new Date().toISOString()
    ],
    [
      '002',
      'Reverse a String',
      'reverse-a-string',
      'Easy',
      'Strings',
      'strings',
      10,
      'Write a function that reverses a string given as an input string or array.',
      'Write a function that reverses a string.\n\nThe input string is given as an array of characters `s`.\nYou must do this by modifying the input array in-place with O(1) extra memory.',
      'Single line containing the string s.',
      'Single line containing the reversed string.',
      'hello',
      'olleh',
      new Date().toISOString()
    ],
    [
      '003',
      'Valid Parentheses',
      'valid-parentheses',
      'Medium',
      'Stack',
      'stack',
      20,
      'Given a string containing just the characters brackets, determine if the input string is valid.',
      'Given a string s containing just the characters `(`, `)`, `{`, `}`, `[` and `]`, determine if the input string is valid.',
      'Single string s containing brackets.',
      'Print true if valid, false otherwise.',
      '()[]{}',
      'true',
      new Date().toISOString()
    ],
    [
      '004',
      'Binary Search',
      'binary-search',
      'Medium',
      'Searching',
      'searching',
      20,
      'Search a target value within a sorted integer array in O(log n) time.',
      'Given an array of integers nums which is sorted in ascending order, and an integer target, write a function to search target in nums. If target exists, then return its index. Otherwise, return -1.',
      'Array length n on first line, sorted integers on second, target integer on third.',
      'Index of target integer or -1.',
      '6\n-1 0 3 5 9 12\n9',
      '4',
      new Date().toISOString()
    ],
    [
      '005',
      'Merge Sort',
      'merge-sort',
      'Hard',
      'Sorting',
      'sorting',
      40,
      'Implement Merge Sort to sort an array of n numbers in O(n log n) time complexity.',
      'Given an unsorted array of numbers, sort them in ascending order using merge sort algorithm.',
      'Size of array n, followed by n space-separated numbers.',
      'Space-separated sorted numbers.',
      '5\n5 2 3 1 4',
      '1 2 3 4 5',
      new Date().toISOString()
    ],
    [
      '006',
      'Longest Common Subsequence',
      'longest-common-subsequence',
      'Hard',
      'Dynamic Programming',
      'dp',
      40,
      'Find the length of the longest subsequence present in both given strings.',
      'Given two strings text1 and text2, return the length of their longest common subsequence. If there is no common subsequence, return 0.',
      'Two lines, each containing a string.',
      'An integer representing the length of the longest common subsequence.',
      'abcde\nace',
      '3',
      new Date().toISOString()
    ]
  ];

  for (const p of initialProblems) {
    insertProblem.run(...p);
  }
}

// Quizzes table starts clean - real quizzes are created by admin


// Battles table starts clean - real battles are created by admin


// Contests table starts clean - real contests are created by admin


// Seed default quests if table is empty
const questCount = db.query("SELECT COUNT(*) as count FROM quests").get() as { count: number };
if (questCount.count === 0) {
  const insertQuest = db.prepare(`
    INSERT INTO quests (id, title, description, step_number, status, reward_xp, problems_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const initialQuests = [
    [
      'quest-1',
      'Array Novice Path',
      'Master the basics of array indexing, traversal, and two pointers.',
      1,
      'completed',
      100,
      JSON.stringify(['Two Sum', 'Reverse a String']),
      new Date().toISOString()
    ],
    [
      'quest-2',
      'Stack & Queues Odyssey',
      'Implement and utilize linear dynamic data structures effectively.',
      2,
      'available',
      150,
      JSON.stringify(['Valid Parentheses']),
      new Date().toISOString()
    ],
    [
      'quest-3',
      'Algorithm Architect',
      'Conquer divide-and-conquer and dynamic programming challenges.',
      3,
      'locked',
      250,
      JSON.stringify(['Binary Search', 'Merge Sort', 'Longest Common Subsequence']),
      new Date().toISOString()
    ]
  ];

  for (const q of initialQuests) {
    insertQuest.run(...q);
  }
}

// Seed Initial Daily Quizzes if none exist
const dailyCountRow = db.query("SELECT COUNT(*) as count FROM daily_quizzes").get() as { count: number } | null;
if (!dailyCountRow || dailyCountRow.count === 0) {
  const availableQuizzes = db.query("SELECT id FROM quizzes LIMIT 6").all() as { id: number }[];
  const ids1 = availableQuizzes.slice(0, 3).map(q => q.id);
  const ids2 = availableQuizzes.length >= 4 ? availableQuizzes.slice(1, 4).map(q => q.id) : ids1;

  const insertDaily = db.prepare(`
    INSERT OR REPLACE INTO daily_quizzes (assigned_date, title, description, quiz_ids_json, expiry_time, reward_xp, streak_bonus, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const ist = new Date(utc + (3600000 * 5.5));
  const year = ist.getFullYear();
  const month = String(ist.getMonth() + 1).padStart(2, '0');
  const day = String(ist.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const prevDate = new Date(ist.getTime() - 86400000);
  const prevYear = prevDate.getFullYear();
  const prevMonth = String(prevDate.getMonth() + 1).padStart(2, '0');
  const prevDay = String(prevDate.getDate()).padStart(2, '0');
  const yesterdayStr = `${prevYear}-${prevMonth}-${prevDay}`;

  if (ids1.length > 0) {
    insertDaily.run(
      todayStr,
      "Pattern & Syntax Sprint",
      "Daily syllabus practice on print patterns and loop conditions",
      JSON.stringify(ids1),
      "12:00 PM IST",
      15,
      5,
      now.toISOString()
    );
  }

  if (ids2.length > 0) {
    insertDaily.run(
      yesterdayStr,
      "Loops & Logic Fundamentals",
      "Core iteration and boundary checks refresher",
      JSON.stringify(ids2),
      "12:00 PM IST",
      15,
      5,
      now.toISOString()
    );
  }
}

// Seed Initial Audio & BGM Settings
const initSetting = db.prepare(`
  INSERT OR IGNORE INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
`);
initSetting.run('bgm_enabled', 'true', new Date().toISOString());
initSetting.run('bgm_volume', '0.5', new Date().toISOString());


