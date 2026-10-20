export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export interface Problem {
  id: string; // e.g., '001'
  title: string;
  slug: string;
  difficulty: Difficulty;
  topic: {
    name: string;
    icon: 'arrays' | 'strings' | 'stack' | 'searching' | 'sorting' | 'dp';
  };
  rewardXp: number;
  solved?: boolean;
}

export interface Badge {
  id: string;
  title: string;
  subtitle: string;
  type?: string;
  iconColor?: string;
  glbModel?: string;
  unlocked?: boolean;
  unlockedDate?: string;
  accentColor?: string;
  glowColor?: string;
  condition?: string;
}

export interface FilterOptions {
  searchQuery?: string;
  difficulty?: 'All' | Difficulty;
  topic?: string;
}

export type LevelStatus = 'unlocked' | 'locked' | 'completed';

export interface QuizLevel {
  id: number; // 1, 2, 3, 4
  name: string;
  description: string;
  status: LevelStatus;
  stars: number; // 0 to 3
  maxStars: number; // 3
  questionCount: number;
  rewardXp: number;
  timeLimitSeconds: number;
  position: {
    leftPercent: number;
    topPercent: number;
  };
}

export interface QuizOption {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: QuizOption[];
  correctOption: 'A' | 'B' | 'C' | 'D';
  rewardXp: number;
  explanation?: string;
}

export interface QuizResult {
  levelId: number;
  score: number;
  totalQuestions: number;
  starsEarned: number;
  xpEarned: number;
  nextLevelUnlocked: boolean;
}

export type BattleStatus = 'waiting' | 'in_progress' | 'completed';

export interface BattlePlayer {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  score: number;
  ready: boolean;
  streak?: number;
}

export interface BattleRoom {
  id: string;
  roomCode: string;
  title: string;
  topic: string;
  questionCount: number;
  timePerQuestion: number;
  status: BattleStatus;
  hostId: string;
  hostName?: string;
  isAdminBattle?: boolean;
  maxPlayers: number;
  players: BattlePlayer[];
  createdAt: string;
}

export interface CreateBattlePayload {
  title: string;
  topic: string;
  questionCount: number;
  timePerQuestion: number;
  maxPlayers: number;
}

export interface BattleQuestionItem {
  id: number | string;
  value: number | string;
  label?: string;
  isPrime?: boolean;
}

export interface BattleQuestion {
  id: number | string;
  tag: string;
  prompt: string;
  timeLimitSeconds: number;
  items: BattleQuestionItem[];
  targetPrimeIds: Array<number | string>;
}
