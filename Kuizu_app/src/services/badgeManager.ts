import { showFirstProblemSolverBadgeModal } from './firstProblemBadgeModal';
import { showFirstBattleParticipantBadgeModal } from './firstBattleBadgeModal';
import { showFirstLooserBadgeModal } from './firstLooserBadgeModal';
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
  modal: 'firstProblem' | 'firstDaily' | 'quickThinker' | 'firstQuiz' | 'firstBattle' | 'firstLooser';
  storageKey: string;
  condition: string;
  aliases?: string[];
}

export interface BadgeRecord extends BadgeDefinition {
  unlocked: boolean;
  unlockedDate: string;
}

/**
 * 6 Official Badges matching the user requirements:
 * 1. First Problem Solver
 * 2. Daily Kuizu Solver
 * 3. Quick Thinker
 * 4. First Quiz Level Solver
 * 5. First Battle Participant
 * 6. First Looser
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
    condition: 'Solve your first problem in Q-Library or Contests'
  },
  {
    id: 'daily-kuizu-solver',
    title: 'Daily Kuizu Solver',
    subtitle: 'Daily challenge conquered',
    defaultDate: '5 May 2025',
    glbModel: '/badges/kuizu_first_kuizu_solver_silver_badge.glb',
    accentColor: '#06b6d4',
    glowColor: 'rgba(6, 182, 212, 0.35)',
    modal: 'firstDaily',
    storageKey: 'kuizu_daily_kuizu_solved',
    condition: 'Complete and submit a Daily Kuizu challenge',
    aliases: ['contest-warrior']
  },
  {
    id: 'quick-thinker',
    title: 'Quick Thinker',
    subtitle: 'Hard problem in < 10 mins',
    defaultDate: '20 Apr 2025',
    glbModel: '/badges/kuizu_quick_thinker_gold_shield_badge.glb',
    accentColor: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.35)',
    modal: 'quickThinker',
    storageKey: 'kuizu_quick_thinker_earned',
    condition: 'Solve a Hard problem in under 10 mins on 1st attempt',
    aliases: ['consistent-coder']
  },
  {
    id: 'first-quiz-level-solver',
    title: 'First Quiz Level Solver',
    subtitle: 'Quiz level completed',
    defaultDate: '28 Apr 2025',
    glbModel: '/badges/kuizu_first_quiz_level_solver_pink_badge.glb',
    accentColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.35)',
    modal: 'firstQuiz',
    storageKey: 'kuizu_first_quiz_level_solved',
    condition: 'Successfully solve a Quiz chapter level',
    aliases: ['speedster']
  },
  {
    id: 'first-battle-participation',
    title: 'First Battle Participant',
    subtitle: 'Competed in code battle',
    defaultDate: '15 Apr 2025',
    glbModel: '/badges/kuizu_first_battle_participant_red_badge_big_swords.glb',
    accentColor: '#6366f1',
    glowColor: 'rgba(99, 102, 241, 0.35)',
    modal: 'firstBattle',
    storageKey: 'kuizu_first_battle_participated',
    condition: 'Complete your first 1v1 Battle Arena match'
  },
  {
    id: 'first-looser',
    title: 'First Looser',
    subtitle: 'Fought with warrior honor',
    defaultDate: '15 Apr 2025',
    glbModel: '/badges/kuizu_first_looser_devil_fixed.glb',
    accentColor: '#ef4444',
    glowColor: 'rgba(239, 68, 68, 0.35)',
    modal: 'firstLooser',
    storageKey: 'kuizu_first_looser_earned',
    condition: 'Attend an Admin Battle and finish within the last 3 ranks'
  }
];

const CLEAN_MIGRATION_V4_KEY = 'kuizu_badges_v4_strict_earn_clean';

/**
 * Format current date like "20 Oct 2026"
 */
export function formatTodayBadgeDate(): string {
  const d = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Resolve any legacy badge ID alias to its canonical definition
 */
export function resolveBadgeDefinition(badgeId: string): BadgeDefinition | undefined {
  return ALL_BADGE_DEFINITIONS.find(
    (b) => b.id === badgeId || (b.aliases && b.aliases.includes(badgeId))
  );
}

/**
 * Initialize badge storage:
 * Wipes out legacy pre-unlocked mock badges so users start strictly with 0 badges
 * until they legitimately achieve them.
 */
export function initBadgeStorage(): void {
  try {
    const isClean = localStorage.getItem(CLEAN_MIGRATION_V4_KEY);
    if (!isClean) {
      // Clear legacy initializers
      localStorage.removeItem('kuizu_badges_initialized');
      localStorage.removeItem('kuizu_badges_initialized_v1');
      localStorage.removeItem('kuizu_badges_initialized_v2');

      // Remove mock unlocked flags so users start clean with 0 badges
      const mockKeys = [
        'kuizu_badge_first-problem-solver',
        'kuizu_badge_first-problem-solver_date',
        'kuizu_first_problem_solved',
        'kuizu_badge_first-looser',
        'kuizu_badge_first-looser_date',
        'kuizu_first_looser_earned',
        'kuizu_badge_consistent-coder',
        'kuizu_badge_consistent-coder_date',
        'kuizu_badge_quick-thinker',
        'kuizu_badge_quick-thinker_date',
        'kuizu_quick_thinker_earned',
        'kuizu_badge_speedster',
        'kuizu_badge_speedster_date',
        'kuizu_badge_first-quiz-level-solver',
        'kuizu_badge_first-quiz-level-solver_date',
        'kuizu_first_quiz_level_solved',
        'kuizu_badge_contest-warrior',
        'kuizu_badge_contest-warrior_date',
        'kuizu_badge_daily-kuizu-solver',
        'kuizu_badge_daily-kuizu-solver_date',
        'kuizu_daily_kuizu_solved',
        'kuizu_badge_first-battle-participation',
        'kuizu_badge_first-battle-participation_date',
        'kuizu_first_battle_participated'
      ];
      mockKeys.forEach((k) => localStorage.removeItem(k));

      localStorage.setItem(CLEAN_MIGRATION_V4_KEY, 'true');
    }
  } catch (err) {
    console.warn('LocalStorage error while initializing badges:', err);
  }
}

/**
 * Check if a specific badge is unlocked
 */
export function isBadgeUnlocked(badgeId: string): boolean {
  initBadgeStorage();
  try {
    const def = resolveBadgeDefinition(badgeId);
    if (!def) return false;

    if (localStorage.getItem(`kuizu_badge_${def.id}`) === 'true') return true;
    if (localStorage.getItem(def.storageKey) === 'true') return true;

    if (def.aliases) {
      for (const alias of def.aliases) {
        if (localStorage.getItem(`kuizu_badge_${alias}`) === 'true') return true;
      }
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
    let unlockedDate = '';

    try {
      const direct = localStorage.getItem(`kuizu_badge_${def.id}`);
      const fallback = localStorage.getItem(def.storageKey);
      unlocked = direct === 'true' || fallback === 'true';

      if (!unlocked && def.aliases) {
        for (const alias of def.aliases) {
          if (localStorage.getItem(`kuizu_badge_${alias}`) === 'true') {
            unlocked = true;
            break;
          }
        }
      }

      const storedDate = localStorage.getItem(`kuizu_badge_${def.id}_date`);
      if (storedDate) {
        unlockedDate = storedDate;
      } else if (unlocked) {
        unlockedDate = formatTodayBadgeDate();
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
 * Unlock a badge and dispatch an event so all components update immediately.
 * Returns true if the badge was newly unlocked.
 */
export function unlockBadge(badgeId: string, customDate?: string): boolean {
  initBadgeStorage();
  const def = resolveBadgeDefinition(badgeId);
  if (!def) return false;

  const wasUnlocked = isBadgeUnlocked(def.id);
  const dateToUse = customDate || formatTodayBadgeDate();

  try {
    localStorage.setItem(`kuizu_badge_${def.id}`, 'true');
    localStorage.setItem(`kuizu_badge_${def.id}_date`, dateToUse);
    localStorage.setItem(def.storageKey, 'true');

    if (def.aliases) {
      def.aliases.forEach((alias) => {
        localStorage.setItem(`kuizu_badge_${alias}`, 'true');
        localStorage.setItem(`kuizu_badge_${alias}_date`, dateToUse);
      });
    }
  } catch (err) {
    console.warn('Failed to save badge unlock to localStorage:', err);
  }

  // Notify active pages
  window.dispatchEvent(
    new CustomEvent('kuizu:badges-updated', {
      detail: { badgeId: def.id, date: dateToUse, newlyUnlocked: !wasUnlocked }
    })
  );

  return !wasUnlocked;
}

/**
 * Lock a badge (for testing or reset)
 */
export function lockBadge(badgeId: string): void {
  const def = resolveBadgeDefinition(badgeId);
  if (!def) return;

  try {
    localStorage.removeItem(`kuizu_badge_${def.id}`);
    localStorage.removeItem(`kuizu_badge_${def.id}_date`);
    localStorage.removeItem(def.storageKey);

    if (def.aliases) {
      def.aliases.forEach((alias) => {
        localStorage.removeItem(`kuizu_badge_${alias}`);
        localStorage.removeItem(`kuizu_badge_${alias}_date`);
      });
    }
  } catch (_) {}

  window.dispatchEvent(
    new CustomEvent('kuizu:badges-updated', {
      detail: { badgeId: def.id, locked: true }
    })
  );
}

/**
 * Reset all badges to 0 achieved state
 */
export function resetAllBadges(): void {
  try {
    localStorage.removeItem(CLEAN_MIGRATION_V4_KEY);
    initBadgeStorage();
  } catch (_) {}
  window.dispatchEvent(new CustomEvent('kuizu:badges-updated', { detail: { reset: true } }));
}

/**
 * Open the interactive 3D inspection modal for a given badge
 */
export function openBadgeModal(badgeId: string): void {
  const def = resolveBadgeDefinition(badgeId);
  if (!def) return;

  switch (def.modal) {
    case 'firstProblem':
      showFirstProblemSolverBadgeModal();
      break;
    case 'firstDaily':
      showFirstDailyKuizuBadgeModal();
      break;
    case 'quickThinker':
      showQuickThinkerBadgeModal();
      break;
    case 'firstQuiz':
      showFirstQuizLevelBadgeModal();
      break;
    case 'firstBattle':
      showFirstBattleParticipantBadgeModal();
      break;
    case 'firstLooser':
      showFirstLooserBadgeModal();
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
