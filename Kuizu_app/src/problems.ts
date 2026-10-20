import { fetchProblems } from './services/problemService';
import type { Problem, Difficulty } from './types';
import './services/adminAuthGuard';
import { showFirstProblemSolverBadgeModal } from './services/firstProblemBadgeModal';
import { showQuickThinkerBadgeModal } from './services/quickThinkerBadgeModal';
import { showFirstBattleParticipantBadgeModal } from './services/firstBattleBadgeModal';
import { showFirstQuizLevelBadgeModal } from './services/firstQuizLevelBadgeModal';
import { showFirstDailyKuizuBadgeModal } from './services/firstDailyKuizuBadgeModal';
import { showFirstLooserBadgeModal } from './services/firstLooserBadgeModal';
import { getBadges, openBadgeModal, type BadgeRecord } from './services/badgeManager';
import { initBadge3DCoin, disposeAllBadge3DCoins } from './services/badge3dCoinRenderer';

// State management
let allProblems: Problem[] = [];
let currentFilter: {
  searchQuery: string;
  difficulty: Difficulty | 'All';
} = {
  searchQuery: '',
  difficulty: 'All'
};

// DOM Elements
const problemsContainer = document.getElementById('problems-list-container') as HTMLDivElement | null;
const badgesContainer = document.getElementById('badges-container') as HTMLDivElement | null;
const searchInput = document.getElementById('problem-search-input') as HTMLInputElement | null;
const filterToggleBtn = document.getElementById('btn-filter-toggle') as HTMLButtonElement | null;
const filterPopover = document.getElementById('filter-popover') as HTMLDivElement | null;
const filterTagButtons = document.querySelectorAll<HTMLButtonElement>('.filter-tag-btn');
const userAvatarBtn = document.getElementById('btn-user-avatar') as HTMLButtonElement | null;
const userDropdown = document.getElementById('user-dropdown') as HTMLDivElement | null;
const viewAllBadgesBtn = document.getElementById('btn-view-all-badges') as HTMLButtonElement | null;

/**
 * Topic SVG icons map for crisp rendering
 */
function getTopicIcon(topic: string): string {
  switch (topic.toLowerCase()) {
    case 'arrays':
      return `<svg viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
      </svg>`;
    case 'strings':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M7 4a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2"></path>
        <path d="M17 4a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2"></path>
      </svg>`;
    case 'stack':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
      </svg>`;
    case 'searching':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>`;
    case 'sorting':
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="17" y1="4" x2="7" y2="4"></line>
        <polyline points="7 8 3 4 7 0"></polyline>
        <line x1="7" y1="20" x2="17" y2="20"></line>
        <polyline points="17 16 21 20 17 24"></polyline>
      </svg>`;
    case 'dynamic programming':
    default:
      return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="16 18 22 12 16 6"></polyline>
        <polyline points="8 6 2 12 8 18"></polyline>
      </svg>`;
  }
}

/**
 * Render real achieved 3D GLB badge coins into the showcase
 */
function renderBadges(): void {
  if (!badgesContainer) return;

  const allBadges: BadgeRecord[] = getBadges();
  const earnedBadges = allBadges.filter((b) => b.unlocked);
  const unlockedCount = earnedBadges.length;

  // Update header counter pill
  const countText = document.getElementById('badges-count-text');
  const countPill = document.getElementById('badges-count-pill');
  if (countText) {
    countText.textContent = `${unlockedCount} / ${allBadges.length} Unlocked`;
  }
  if (countPill) {
    if (unlockedCount === 0) {
      countPill.classList.add('is-empty');
      countPill.style.background = '#f1f5f9';
      countPill.style.color = '#64748b';
      countPill.style.borderColor = '#e2e8f0';
    } else {
      countPill.classList.remove('is-empty');
      countPill.style.background = '#ecfdf5';
      countPill.style.color = '#059669';
      countPill.style.borderColor = 'rgba(16, 185, 129, 0.25)';
    }
  }

  // Clear any existing active 3D coin instances
  disposeAllBadge3DCoins();

  // If user has not earned any badges yet, show zero badge empty state
  if (unlockedCount === 0) {
    badgesContainer.innerHTML = `
      <div class="badges-zero-empty-state">
        <div class="badges-zero-icon-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" width="28" height="28">
            <circle cx="12" cy="8" r="7"></circle>
            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
          </svg>
        </div>
        <div class="badges-zero-info">
          <h3 class="badges-zero-title">No Badges Earned Yet (0 Unlocked)</h3>
          <p class="badges-zero-desc">Solve your first coding problem, complete a daily challenge, pass a quiz level, or compete in 1v1 battle to unlock your 3D trophy badges here!</p>
        </div>
      </div>
    `;
    return;
  }

  // Render cards markup ONLY for earned badges
  badgesContainer.innerHTML = earnedBadges
    .map((b) => {
      return `
        <div class="badge-coin-card is-unlocked" data-badge-id="${b.id}" tabindex="0" role="button" aria-label="${b.title} Badge">
          
          <!-- 3D Coin Stage -->
          <div class="badge-coin-stage">
            <div class="badge-coin-ambient-glow" style="background: radial-gradient(circle, ${b.glowColor} 0%, transparent 72%);"></div>
            <div class="badge-coin-canvas-wrap">
              <canvas class="badge-3d-coin-canvas" width="110" height="110"></canvas>
              <div class="badge-coin-spinner">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
                  <path d="M12 2a10 10 0 0 1 10 10"></path>
                </svg>
              </div>
            </div>
          </div>

          <!-- Badge Info -->
          <div class="badge-card-content">
            <h3 class="badge-coin-title">${b.title}</h3>
            <p class="badge-coin-date">${b.unlockedDate || 'Unlocked'}</p>
          </div>

          <!-- Inspect Pill -->
          <div class="badge-inspect-pill">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>Inspect 3D</span>
          </div>

        </div>
      `;
    })
    .join('');

  // Attach click listener & start 3D GLB coin rendering for each earned card
  badgesContainer.querySelectorAll<HTMLDivElement>('.badge-coin-card').forEach((card, index) => {
    const badgeId = card.getAttribute('data-badge-id');
    const badge = earnedBadges.find((x) => x.id === badgeId);
    if (!badge) return;

    const openModal = () => {
      openBadgeModal(badge.id);
    };

    card.addEventListener('click', openModal);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openModal();
      }
    });

    // Initialize 3D GLB canvas
    const canvas = card.querySelector<HTMLCanvasElement>('.badge-3d-coin-canvas');
    if (canvas) {
      initBadge3DCoin(canvas, card, badge.glbModel, badge.id, index);
    }
  });
}

/**
 * Filter problems based on current active criteria
 */
function getFilteredProblems(): Problem[] {
  return allProblems.filter(p => {
    // Difficulty filter
    if (currentFilter.difficulty !== 'All' && p.difficulty !== currentFilter.difficulty) {
      return false;
    }

    // Search query filter (title, topic, id)
    if (currentFilter.searchQuery.trim() !== '') {
      const q = currentFilter.searchQuery.toLowerCase().trim();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchTopic = p.topic.name.toLowerCase().includes(q);
      const matchId = p.id.toLowerCase().includes(q);
      if (!matchTitle && !matchTopic && !matchId) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Render the problems list into the table
 */
function renderProblems(): void {
  if (!problemsContainer) return;

  const filtered = getFilteredProblems();

  if (filtered.length === 0) {
    problemsContainer.innerHTML = `
      <div class="problem-empty-state">
        <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <h4 class="empty-state-title">No problems found</h4>
        <p class="empty-state-desc">Try clearing your search query or changing the difficulty filter.</p>
      </div>
    `;
    return;
  }

  problemsContainer.innerHTML = filtered.map(p => {
    const diffClass = p.difficulty === 'Easy' ? 'diff-easy' : p.difficulty === 'Medium' ? 'diff-medium' : 'diff-hard';
    const topicIcon = getTopicIcon(p.topic.name);
    const isSolved = Boolean(p.solved);

    return `
      <div class="problem-row ${isSolved ? 'row-is-solved' : ''}" data-id="${p.id}" tabindex="0" role="button" aria-label="Open problem ${p.id} ${p.title}">
        <span class="row-id">
          ${isSolved ? `
            <span class="solved-check-badge" title="Solved">
              <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#16a34a" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </span>
          ` : p.id}
        </span>
        <span class="row-title">
          <span class="title-text">${p.title}</span>
          ${isSolved ? `<span class="solved-pill">Solved</span>` : ''}
        </span>
        <span class="row-diff">
          <span class="pill-difficulty ${diffClass}">${p.difficulty}</span>
        </span>
        <span class="row-topic">
          <span class="topic-icon-wrap">
            ${topicIcon}
          </span>
          <span class="topic-label">${p.topic.name}</span>
        </span>
        <span class="row-reward">
          <svg class="star-svg" viewBox="0 0 24 24" width="14" height="14" fill="#f59e0b" stroke="#f59e0b" stroke-width="1.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <span class="reward-val">+${p.rewardXp} XP</span>
        </span>
        <span class="row-arrow">›</span>
      </div>
    `;
  }).join('');

  // Attach click listeners to problem rows
  attachRowClickListeners();
}

/**
 * Toast notification helper
 */
let toastTimeout: number | undefined;
function showToast(message: string): void {
  let toast = document.getElementById('kuizu-toast') as HTMLDivElement | null;
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'kuizu-toast';
    toast.className = 'toast-banner';
    document.body.appendChild(toast);
  }

  toast.innerHTML = `
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#60a5fa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <polyline points="12 6 12 12 16 14"></polyline>
    </svg>
    <span>${message}</span>
  `;

  toast.classList.add('show');
  if (toastTimeout) window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    toast?.classList.remove('show');
  }, 2500);
}

/**
 * Problem row click interaction
 */
function attachRowClickListeners(): void {
  const rows = document.querySelectorAll<HTMLDivElement>('.problem-row');
  rows.forEach(row => {
    const handleClick = () => {
      const id = row.getAttribute('data-id') || '001';
      window.location.href = `/problem/qlibrary/compiler?id=${id}`;
    };

    row.addEventListener('click', handleClick);
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    });
  });
}

/**
 * Setup search and filter listeners
 */
function setupControls(): void {
  // Live search input
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentFilter.searchQuery = searchInput.value;
      renderProblems();
    });
  }

  // Filter toggle button & popover
  if (filterToggleBtn && filterPopover) {
    filterToggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = filterPopover.classList.toggle('show');
      filterToggleBtn.setAttribute('aria-expanded', String(isExpanded));
    });

    // Close popover when clicking outside
    document.addEventListener('click', (e) => {
      if (!filterPopover.contains(e.target as Node) && !filterToggleBtn.contains(e.target as Node)) {
        filterPopover.classList.remove('show');
        filterToggleBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Filter tag buttons (All, Easy, Medium, Hard)
  filterTagButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const difficulty = btn.getAttribute('data-difficulty') as Difficulty | 'All';
      currentFilter.difficulty = difficulty;

      filterTagButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      renderProblems();
    });
  });

  // User Profile Dropdown Popup
  if (userAvatarBtn && userDropdown) {
    userAvatarBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isShown = userDropdown.classList.toggle('show');
      userAvatarBtn.setAttribute('aria-expanded', String(isShown));
    });

    document.addEventListener('click', (e) => {
      if (!userDropdown.contains(e.target as Node) && !userAvatarBtn.contains(e.target as Node)) {
        userDropdown.classList.remove('show');
        userAvatarBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Profile popup item listeners
  const popupUserHeader = document.querySelector('.popup-user-header');
  popupUserHeader?.addEventListener('click', () => {
    window.location.href = '/profile';
  });

  const leaderboardBtn = document.getElementById('btn-menu-leaderboard');
  const themeBtn = document.getElementById('btn-menu-theme');
  const settingsBtn = document.getElementById('btn-menu-settings');

  leaderboardBtn?.addEventListener('click', () => {
    showToast('Leaderboard ranking: #42 in Global League');
    userDropdown?.classList.remove('show');
  });

  themeBtn?.addEventListener('click', () => {
    showToast('Theme switcher coming soon');
    userDropdown?.classList.remove('show');
  });

  settingsBtn?.addEventListener('click', () => {
    window.location.href = '/settings';
  });

  // Sidebar item listeners
  const sideQuests = document.getElementById('side-tab-quests');
  sideQuests?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/problem/quest';
  });

  const sideContests = document.getElementById('side-tab-contests');
  sideContests?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/problem/contest';
  });

  const sideLeaderboard = document.getElementById('side-tab-leaderboard');
  sideLeaderboard?.addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = '/problem/leaderboard';
  });
}

/**
 * Initialize page data from service layer
 */
async function init(): Promise<void> {
  setupControls();

  // Wire View All Badges button
  viewAllBadgesBtn?.addEventListener('click', () => {
    openBadgeModal('first-problem-solver');
  });

  // Listen for real-time badge updates from problem compiler, battles, quizzes
  window.addEventListener('kuizu:badges-updated', () => {
    renderBadges();
  });

  window.addEventListener('storage', (e) => {
    if (
      e.key &&
      (e.key.startsWith('kuizu_badge') ||
        e.key.startsWith('kuizu_first') ||
        e.key.startsWith('kuizu_quick') ||
        e.key.startsWith('kuizu_daily'))
    ) {
      renderBadges();
    }
  });

  // Initial render of 3D badges
  renderBadges();

  try {
    const problems = await fetchProblems();
    allProblems = problems;
    renderProblems();
  } catch (err) {
    console.error('Failed to load problems data:', err);
  }
}

// Expose helpers globally
(window as any).renderBadges = renderBadges;
(window as any).showFirstProblemSolverBadgeModal = showFirstProblemSolverBadgeModal;
(window as any).showQuickThinkerBadgeModal = showQuickThinkerBadgeModal;
(window as any).showFirstBattleParticipantBadgeModal = showFirstBattleParticipantBadgeModal;
(window as any).showFirstLooserBadgeModal = showFirstLooserBadgeModal;
(window as any).showFirstQuizLevelBadgeModal = showFirstQuizLevelBadgeModal;
(window as any).showFirstDailyKuizuBadgeModal = showFirstDailyKuizuBadgeModal;

// Start on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => init());
} else {
  init();
}
