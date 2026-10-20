import { fetchProblems, fetchBadges } from './services/problemService';
import type { Problem, Badge, Difficulty } from './types';
import './services/adminAuthGuard';
import { showFirstProblemSolverBadgeModal } from './services/firstProblemBadgeModal';
import { showQuickThinkerBadgeModal } from './services/quickThinkerBadgeModal';

// State management
let allProblems: Problem[] = [];
let allBadges: Badge[] = [];
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
 * Render badges into the achieved badges banner
 */
function renderBadges(badges: Badge[]): void {
  if (!badgesContainer) return;

  badgesContainer.innerHTML = badges.map(b => {
    let emblemClass = 'emblem-green';
    let innerSvg = `<path d="M12 2l7 4v6c0 5.25-3.5 10-7 11-3.5-1-7-5.75-7-11V6l7-4z" fill="#10b981"/><path d="m9 12 2 2 4-4" stroke="#ffffff"/>`;

    if (b.type === 'streak' || b.iconColor === 'purple') {
      emblemClass = 'emblem-purple';
      innerSvg = `<path d="M12 2l7 4v6c0 5.25-3.5 10-7 11-3.5-1-7-5.75-7-11V6l7-4z" fill="#8b5cf6"/><path d="M12 7c-2 2.5-3 4-3 5.5a3 3 0 0 0 6 0c0-1.5-1-3-3-5.5z" fill="#ffffff" stroke="none"/>`;
    } else if (b.type === 'solver' || b.iconColor === 'blue') {
      emblemClass = 'emblem-blue';
      innerSvg = `<path d="M12 2l7 4v6c0 5.25-3.5 10-7 11-3.5-1-7-5.75-7-11V6l7-4z" fill="#3b82f6"/><polygon points="12 8 13.5 11.5 17 11.8 14.5 14 15.3 17.5 12 15.5 8.7 17.5 9.5 14 7 11.8 10.5 11.5 12 8" fill="#ffffff" stroke="none"/>`;
    } else if (b.type === 'quick' || b.iconColor === 'gold') {
      emblemClass = 'emblem-gold';
      innerSvg = `<path d="M12 2l7 4v6c0 5.25-3.5 10-7 11-3.5-1-7-5.75-7-11V6l7-4z" fill="#f59e0b"/><polygon points="13 7 8 13 12 13 11 18 16 12 12 12 13 7" fill="#ffffff" stroke="none"/>`;
    }

    const isFirstSolve = b.id === 'badge-1' || b.type === 'first-solve';
    const isQuickThinker = b.id === 'badge-4' || b.type === 'quick';
    const isClickable = isFirstSolve || isQuickThinker;

    return `
      <div class="badge-item ${isClickable ? 'clickable-badge' : ''}" data-badge-id="${b.id}" data-badge-type="${b.type}" style="${isClickable ? 'cursor: pointer;' : ''}" title="${isClickable ? 'Click to inspect 3D Badge' : b.title}">
        <div class="badge-emblem-wrap ${emblemClass}">
          <svg class="emblem-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            ${innerSvg}
          </svg>
        </div>
        <div class="badge-info">
          <span class="badge-name">${b.title}</span>
          <span class="badge-desc">${b.subtitle}</span>
        </div>
      </div>
    `;
  }).join('');

  // Attach click listener for 3D badges
  badgesContainer.querySelectorAll<HTMLDivElement>('.clickable-badge').forEach((el) => {
    el.addEventListener('click', () => {
      const badgeId = el.getAttribute('data-badge-id');
      const badgeType = el.getAttribute('data-badge-type');
      if (badgeId === 'badge-4' || badgeType === 'quick') {
        showQuickThinkerBadgeModal();
      } else {
        showFirstProblemSolverBadgeModal();
      }
    });
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

    return `
      <div class="problem-row" data-id="${p.id}" tabindex="0" role="button" aria-label="Open problem ${p.id} ${p.title}">
        <span class="row-id">${p.id}</span>
        <span class="row-title">${p.title}</span>
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
          <span class="star-gold">⭐</span>
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

  try {
    // Fetch initial data (from mock or future backend)
    const [problems, badges] = await Promise.all([
      fetchProblems(),
      fetchBadges()
    ]);

    allProblems = problems;
    allBadges = badges;

    renderBadges(allBadges);
    renderProblems();
  } catch (err) {
    console.error('Failed to load problems data:', err);
  }
}

// Expose helpers globally
(window as any).showFirstProblemSolverBadgeModal = showFirstProblemSolverBadgeModal;
(window as any).showQuickThinkerBadgeModal = showQuickThinkerBadgeModal;

// Start on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => init());
} else {
  init();
}
