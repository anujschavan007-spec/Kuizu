import { showFirstProblemSolverBadgeModal } from './firstProblemBadgeModal';
import { showFirstBattleParticipantBadgeModal } from './firstBattleBadgeModal';
import { showQuickThinkerBadgeModal } from './quickThinkerBadgeModal';
import { showFirstQuizLevelBadgeModal } from './firstQuizLevelBadgeModal';
import { showFirstDailyKuizuBadgeModal } from './firstDailyKuizuBadgeModal';

export interface BadgeDefinition {
  id: string;
  title: string;
  subtitle: string;
  defaultDate: string;
  glbModel: string;
  accentColor: string;
  glowColor: string;
  modal: 'firstProblem' | 'firstBattle' | 'quickThinker' | 'firstQuiz' | 'firstDaily';
  storageKey: string;
  condition: string;
}

export interface BadgeRecord extends BadgeDefinition {
  unlocked: boolean;
  unlockedDate: string;
}

/**
 * 5 Standard 3D GLB Badge Coins matching the reference achievements
 */
export const ALL_BADGE_DEFINITIONS: BadgeDefinition[] = [
  {
    id: 'first-problem-solver',
    title: 'First Problem Solver',
    subtitle: 'Solved 1st problem',
    defaultDate: '12 Apr 2025',
    glbModel: '/badges/kuizu_first_problem_solver_badge_fixed.glb',
    accentColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.35)',
    modal: 'firstProblem',
    storageKey: 'kuizu_first_problem_solved',
    condition: 'Solve any coding problem in QLibrary'
  },
  {
    id: 'first-looser',
    title: 'First Looser',
    subtitle: 'Competed in code battle',
    defaultDate: '15 Apr 2025',
    glbModel: '/badges/kuizu_first_battle_participant_red_badge_big_swords.glb',
    accentColor: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.35)',
    modal: 'firstBattle',
    storageKey: 'kuizu_first_battle_participated',
    condition: 'Complete your first 1v1 Battle Arena match'
  },
  {
    id: 'consistent-coder',
    title: 'Consistent Coder',
    subtitle: 'Solved in under 10 mins',
    defaultDate: '20 Apr 2025',
    glbModel: '/badges/kuizu_quick_thinker_gold_shield_badge.glb',
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.35)',
    modal: 'quickThinker',
    storageKey: 'kuizu_quick_thinker_earned',
    condition: 'Solve a Hard problem in under 10 mins (1st attempt)'
  },
  {
    id: 'speedster',
    title: 'Speedster',
    subtitle: 'Quiz level speed master',
    defaultDate: '28 Apr 2025',
    glbModel: '/badges/kuizu_first_quiz_level_solver_pink_badge.glb',
    accentColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.35)',
    modal: 'firstQuiz',
    storageKey: 'kuizu_first_quiz_level_solved',
    condition: 'Successfully solve a Quiz chapter level'
  },
  {
    id: 'contest-warrior',
    title: 'Contest Warrior',
    subtitle: 'Daily challenge conquered',
    defaultDate: '5 May 2025',
    glbModel: '/badges/kuizu_first_kuizu_solver_silver_badge.glb',
    accentColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.35)',
    modal: 'firstDaily',
    storageKey: 'kuizu_daily_kuizu_solved',
    condition: 'Complete the Daily Kuizu challenge'
  }
];

const INITIALIZED_KEY = 'kuizu_badges_initialized_v2';

/**
 * Format current date like "20 Oct 2026"
 */
export function formatTodayBadgeDate(): string {
  const d = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Initialize storage with default state if needed
 */
export function initBadgeStorage(): void {
  try {
    const initialized = localStorage.getItem(INITIALIZED_KEY);
    if (!initialized) {
      // By default, initialize all 5 badges as achieved (matching the reference design),
      // with their preset achievement dates.
      ALL_BADGE_DEFINITIONS.forEach((b) => {
        localStorage.setItem(`kuizu_badge_${b.id}`, 'true');
        localStorage.setItem(`kuizu_badge_${b.id}_date`, b.defaultDate);
        localStorage.setItem(b.storageKey, 'true');
      });
      localStorage.setItem(INITIALIZED_KEY, 'true');
    }
  } catch (err) {
    console.warn('LocalStorage error while initializing badges:', err);
  }
}

/**
 * Check if a specific badge is unlocked
 */
export function isBadgeUnlocked(badgeId: string): boolean {
  try {
    const directKey = localStorage.getItem(`kuizu_badge_${badgeId}`);
    if (directKey === 'true') return true;

    const def = ALL_BADGE_DEFINITIONS.find((b) => b.id === badgeId);
    if (def) {
      return localStorage.getItem(def.storageKey) === 'true';
    }
  } catch (_) {}
  return false;
}

/**
 * Get all badges along with their unlocked status and achievement dates
 */
export function getBadges(): BadgeRecord[] {
  initBadgeStorage();

  return ALL_BADGE_DEFINITIONS.map((def) => {
    let unlocked = false;
    let unlockedDate = def.defaultDate;

    try {
      const direct = localStorage.getItem(`kuizu_badge_${def.id}`);
      const fallback = localStorage.getItem(def.storageKey);
      unlocked = direct === 'true' || fallback === 'true';

      const storedDate = localStorage.getItem(`kuizu_badge_${def.id}_date`);
      if (storedDate) {
        unlockedDate = storedDate;
      }
    } catch (_) {}

    return {
      ...def,
      unlocked,
      unlockedDate
    };
  });
}

/**
 * Unlock a badge and dispatch an event so all components update immediately
 */
export function unlockBadge(badgeId: string, customDate?: string): void {
  const dateToUse = customDate || formatTodayBadgeDate();
  try {
    localStorage.setItem(`kuizu_badge_${badgeId}`, 'true');
    localStorage.setItem(`kuizu_badge_${badgeId}_date`, dateToUse);

    const def = ALL_BADGE_DEFINITIONS.find((b) => b.id === badgeId);
    if (def) {
      localStorage.setItem(def.storageKey, 'true');
    }
  } catch (err) {
    console.warn('Failed to save badge unlock to localStorage:', err);
  }

  // Notify active pages
  window.dispatchEvent(
    new CustomEvent('kuizu:badges-updated', {
      detail: { badgeId, date: dateToUse }
    })
  );
}

/**
 * Lock a badge (for testing or reset)
 */
export function lockBadge(badgeId: string): void {
  try {
    localStorage.removeItem(`kuizu_badge_${badgeId}`);
    localStorage.removeItem(`kuizu_badge_${badgeId}_date`);

    const def = ALL_BADGE_DEFINITIONS.find((b) => b.id === badgeId);
    if (def) {
      localStorage.removeItem(def.storageKey);
    }
  } catch (_) {}

  window.dispatchEvent(
    new CustomEvent('kuizu:badges-updated', {
      detail: { badgeId, locked: true }
    })
  );
}

/**
 * Reset all badges to default achieved state
 */
export function resetAllBadges(): void {
  try {
    localStorage.removeItem(INITIALIZED_KEY);
  } catch (_) {}
  initBadgeStorage();
  window.dispatchEvent(new CustomEvent('kuizu:badges-updated', { detail: { reset: true } }));
}

/**
 * Open the interactive 3D inspection modal for a given badge
 */
export function openBadgeModal(badgeId: string): void {
  const def = ALL_BADGE_DEFINITIONS.find((b) => b.id === badgeId);
  if (!def) return;

  switch (def.modal) {
    case 'firstProblem':
      showFirstProblemSolverBadgeModal();
      break;
    case 'firstBattle':
      showFirstBattleParticipantBadgeModal();
      break;
    case 'quickThinker':
      showQuickThinkerBadgeModal();
      break;
    case 'firstQuiz':
      showFirstQuizLevelBadgeModal();
      break;
    case 'firstDaily':
      showFirstDailyKuizuBadgeModal();
      break;
  }
}

// Expose on window for easy developer inspection & testing in console
if (typeof window !== 'undefined') {
  (window as any).kuizuUnlockBadge = unlockBadge;
  (window as any).kuizuLockBadge = lockBadge;
  (window as any).kuizuResetBadges = resetAllBadges;
  (window as any).kuizuOpenBadgeModal = openBadgeModal;
  (window as any).kuizuGetBadges = getBadges;
}
