import './supabaseApiBridge';
import type { QuizLevel, QuizQuestion, QuizResult } from '../types';

/**
 * Quiz Backend Service Adapter
 * 
 * Set USE_MOCK to false when connecting to your real backend API.
 * The endpoints expected are:
 *  - GET /api/quiz/levels -> QuizLevel[]
 *  - GET /api/quiz/levels/:id/questions -> QuizQuestion[]
 *  - POST /api/quiz/levels/:id/submit -> QuizResult
 */
export const API_BASE_URL = '/api';
export const USE_MOCK = false;

// Mock Levels state (persists in localStorage if available so user progress saves)
const STORAGE_KEY_LEVELS = 'kuizu_quiz_levels_v1';

const DEFAULT_MOCK_LEVELS: QuizLevel[] = [
  {
    id: 1,
    name: 'Syntax & Variables',
    description: 'Learn variables, primitives, operators, and basic programming fundamentals.',
    status: 'unlocked',
    stars: 0,
    maxStars: 3,
    questionCount: 3,
    rewardXp: 30,
    timeLimitSeconds: 600,
    position: {
      leftPercent: 12.8,
      topPercent: 74.0
    }
  },
  {
    id: 2,
    name: 'Conditionals & Loops',
    description: 'Master if-else logic, for/while iteration loops, and break/continue statements.',
    status: 'locked',
    stars: 0,
    maxStars: 3,
    questionCount: 10,
    rewardXp: 30,
    timeLimitSeconds: 600,
    position: {
      leftPercent: 35.0,
      topPercent: 68.5
    }
  },
  {
    id: 3,
    name: 'Functions & Scope',
    description: 'Understand function declarations, closures, arrow functions, and variable scope.',
    status: 'locked',
    stars: 0,
    maxStars: 3,
    questionCount: 10,
    rewardXp: 30,
    timeLimitSeconds: 600,
    position: {
      leftPercent: 59.2,
      topPercent: 59.0
    }
  },
  {
    id: 4,
    name: 'Data Structures Mastery',
    description: 'Conquer arrays, linked lists, stacks, queues, hash maps, and algorithmic thinking.',
    status: 'locked',
    stars: 0,
    maxStars: 3,
    questionCount: 10,
    rewardXp: 30,
    timeLimitSeconds: 600,
    position: {
      leftPercent: 80.5,
      topPercent: 47.0
    }
  }
];

// Mock Questions for Level 1 (matching img4_level_page.png)
const MOCK_LEVEL_QUESTIONS: Record<number, QuizQuestion[]> = {
  1: [
    {
      id: 1,
      question: 'Which keyword is used to declare a block-scoped variable in modern JavaScript?',
      options: [
        { id: 'A', text: 'var keyword' },
        { id: 'B', text: 'let or const' },
        { id: 'C', text: 'def keyword' },
        { id: 'D', text: 'val keyword' }
      ],
      correctOption: 'B',
      rewardXp: 15,
      explanation: 'let and const provide block scoping, unlike var which is function-scoped.'
    },
    {
      id: 2,
      question: 'What does the strict equality operator (===) compare in JavaScript?',
      options: [
        { id: 'A', text: 'Values only with implicit type coercion' },
        { id: 'B', text: 'Memory address references only' },
        { id: 'C', text: 'Both value and data type without coercion' },
        { id: 'D', text: 'Object prototypes only' }
      ],
      correctOption: 'C',
      rewardXp: 15,
      explanation: '=== checks both the value and the type strictly without type conversion.'
    },
    {
      id: 3,
      question: 'Which of the following is NOT a JavaScript primitive data type?',
      options: [
        { id: 'A', text: 'String' },
        { id: 'B', text: 'Boolean' },
        { id: 'C', text: 'Symbol' },
        { id: 'D', text: 'Array' }
      ],
      correctOption: 'D',
      rewardXp: 15,
      explanation: 'Arrays are objects (reference types), not primitives.'
    },
    {
      id: 4,
      question: 'What is the output of `typeof null` in standard JavaScript?',
      options: [
        { id: 'A', text: '"null"' },
        { id: 'B', text: '"object"' },
        { id: 'C', text: '"undefined"' },
        { id: 'D', text: '"number"' }
      ],
      correctOption: 'B',
      rewardXp: 15,
      explanation: 'Due to a historical bug in JavaScript, typeof null returns "object".'
    },
    {
      id: 5,
      question: 'Which method adds one or more elements to the end of an array?',
      options: [
        { id: 'A', text: 'push()' },
        { id: 'B', text: 'unshift()' },
        { id: 'C', text: 'pop()' },
        { id: 'D', text: 'concat()' }
      ],
      correctOption: 'A',
      rewardXp: 15,
      explanation: 'push() adds elements to the end and returns the new length.'
    },
    {
      id: 6,
      question: 'What is the time complexity of looking up a key in a Hash Map on average?',
      options: [
        { id: 'A', text: 'O(log n)' },
        { id: 'B', text: 'O(1)' },
        { id: 'C', text: 'O(n)' },
        { id: 'D', text: 'O(n²)' }
      ],
      correctOption: 'B',
      rewardXp: 15,
      explanation: 'Hash maps provide O(1) constant average lookup time.'
    },
    {
      id: 7,
      question: 'Which array method creates a new array with all elements that pass a test?',
      options: [
        { id: 'A', text: 'map()' },
        { id: 'B', text: 'forEach()' },
        { id: 'C', text: 'filter()' },
        { id: 'D', text: 'reduce()' }
      ],
      correctOption: 'C',
      rewardXp: 15,
      explanation: 'filter() returns a new array with elements satisfying the predicate.'
    },
    {
      id: 8,
      question: 'What value does a function return by default if no return statement is specified?',
      options: [
        { id: 'A', text: 'null' },
        { id: 'B', text: '0' },
        { id: 'C', text: 'false' },
        { id: 'D', text: 'undefined' }
      ],
      correctOption: 'D',
      rewardXp: 15,
      explanation: 'Functions return undefined by default in JavaScript.'
    },
    {
      id: 9,
      question: 'What is the purpose of the `JSON.stringify()` method?',
      options: [
        { id: 'A', text: 'Parses a JSON string into an object' },
        { id: 'B', text: 'Converts a JavaScript value or object to a JSON string' },
        { id: 'C', text: 'Encrypts JSON payloads' },
        { id: 'D', text: 'Validates JSON schema' }
      ],
      correctOption: 'B',
      rewardXp: 15,
      explanation: 'JSON.stringify() serializes a JS object or primitive into JSON text.'
    },
    {
      id: 10,
      question: 'Which data structure follows the First-In, First-Out (FIFO) principle?',
      options: [
        { id: 'A', text: 'Stack' },
        { id: 'B', text: 'Queue' },
        { id: 'C', text: 'Binary Search Tree' },
        { id: 'D', text: 'Max Heap' }
      ],
      correctOption: 'B',
      rewardXp: 15,
      explanation: 'A Queue processes items in the exact order they arrive (FIFO).'
    }
  ]
};

function getSavedLevels(): QuizLevel[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LEVELS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not read levels from storage', e);
  }
  return DEFAULT_MOCK_LEVELS;
}

function saveLevels(levels: QuizLevel[]): void {
  try {
    localStorage.setItem(STORAGE_KEY_LEVELS, JSON.stringify(levels));
  } catch (e) {
    console.warn('Could not save levels to storage', e);
  }
}

/**
 * Fetch all quiz levels with progress and star ratings
 */
export async function fetchQuizLevels(): Promise<QuizLevel[]> {
  try {
    const res = await fetch('/api/quizzes/levels');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.levels) && data.levels.length > 0) {
        const normalized: QuizLevel[] = data.levels.map((lvl: any, index: number) => {
          const id = Number(lvl.id ?? lvl.levelNumber ?? (index + 1));
          let status: 'unlocked' | 'locked' | 'completed' = lvl.status || (id === 1 ? 'unlocked' : 'locked');
          if (id === 1 && status === 'locked') {
            status = (lvl.stars && lvl.stars >= 1) ? 'completed' : 'unlocked';
          }
          return {
            ...lvl,
            id,
            levelNumber: id,
            status,
            stars: Number(lvl.stars) || 0,
            maxStars: 3,
            questionCount: Number(lvl.questionCount) || 3,
            rewardXp: Number(lvl.rewardXp) || 30,
            timeLimitSeconds: Number(lvl.timeLimitSeconds) || 600,
            position: lvl.position || {
              leftPercent: Number(lvl.positionLeft ?? (14 + ((id - 1) * 22) % 70)),
              topPercent: Number(lvl.positionTop ?? (72 - ((id - 1) * 8) % 40))
            }
          };
        });
        saveLevels(normalized);
        return normalized;
      }
    }
  } catch (err) {
    console.warn('Backend /api/quizzes/levels unavailable, using local levels:', err);
  }

  const saved = getSavedLevels();
  if (saved && saved.length > 0) {
    if (saved[0].id === 1 && saved[0].status === 'locked') {
      saved[0].status = 'unlocked';
    }
  }
  return saved;
}

/**
 * Fetch questions for a specific quiz level (maximum 3 questions per level)
 */
export async function fetchLevelQuestions(levelId: number): Promise<QuizQuestion[]> {
  try {
    const res = await fetch(`/api/quizzes/levels/${levelId}/questions`);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.questions) && data.questions.length > 0) {
        return data.questions.slice(0, 3);
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch level ${levelId} questions from backend:`, err);
  }

  // Fallback to mock questions if backend fails (capped at 3 questions for 3 stars)
  const mockQ = MOCK_LEVEL_QUESTIONS[levelId] || MOCK_LEVEL_QUESTIONS[1];
  return mockQ.slice(0, 3);
}

/**
 * Submit quiz answers, earn 1 star per correct answer (up to 3 stars), and unlock next level
 */
export async function submitQuizLevelAnswers(
  levelId: number,
  answers: Record<number, 'A' | 'B' | 'C' | 'D'>
): Promise<QuizResult> {
  const userEmail = localStorage.getItem('kuizu_user_email') || '';
  const userName = localStorage.getItem('kuizu_user_name') || '';

  try {
    const res = await fetch(`/api/quizzes/levels/${levelId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers, email: userEmail, name: userName })
    });
    if (res.ok) {
      const result: QuizResult = await res.json();
      return result;
    }
  } catch (err) {
    console.warn(`Backend submit failed for level ${levelId}, using offline calculation:`, err);
  }

  const questions = await fetchLevelQuestions(levelId);
  let correctCount = 0;

  questions.forEach(q => {
    if (answers[q.id] === q.correctOption) {
      correctCount++;
    }
  });

  // Exactly 1 star for each correct answer (up to 3 questions = 3 stars)
  const totalQuestions = Math.min(3, questions.length || 3);
  const starsEarned = Math.min(3, correctCount);
  // Level completion strictly earns 30 XP
  const xpEarned = starsEarned >= 1 ? 30 : 0;

  const currentLevels = await fetchQuizLevels();
  let nextLevelUnlocked = false;

  const updatedLevels = currentLevels.map((lvl, index) => {
    if (lvl.id === levelId) {
      return {
        ...lvl,
        stars: Math.max(lvl.stars, starsEarned),
        status: (starsEarned >= 1 ? 'completed' : lvl.status) as any
      };
    }
    const curIdx = currentLevels.findIndex(l => l.id === levelId);
    if (index === curIdx + 1 && starsEarned >= 1) {
      nextLevelUnlocked = true;
      return {
        ...lvl,
        status: 'unlocked' as const
      };
    }
    return lvl;
  });

  saveLevels(updatedLevels);

  return {
    levelId,
    score: correctCount,
    totalQuestions,
    starsEarned,
    xpEarned,
    nextLevelUnlocked
  };
}

/**
 * Reset quiz progress for testing
 */
export function resetQuizProgress(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_LEVELS);
  } catch (e) {
    console.warn(e);
  }
}
