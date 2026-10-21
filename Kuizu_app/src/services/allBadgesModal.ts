import { getBadges, openBadgeModal, type BadgeRecord } from './badgeManager';
import { initBadge3DCoin, disposeAllBadge3DCoins } from './badge3dCoinRenderer';

let activeFilter: 'all' | 'earned' | 'locked' = 'all';

function getActionLinkForBadge(badgeId: string): { label: string; href: string } {
  switch (badgeId) {
    case 'daily-kuizu-solver':
      return { label: 'Take Daily Kuizu', href: '/dailyquiz' };
    case 'first-quiz-level-solver':
      return { label: 'Start Quiz Level', href: '/quiz' };
    case 'first-battle-participation':
    case 'first-looser':
      return { label: 'Go to Battle Arena', href: '/battle' };
    case 'first-problem-solver':
    case 'quick-thinker':
    default:
      return { label: 'Solve Problems', href: '/problems' };
  }
}

/**
 * Show the comprehensive All Badges & Milestones modal
 */
export function showAllBadgesModal(): void {
  // Prevent duplicate modals
  const existing = document.getElementById('all-badges-modal-overlay');
  if (existing) {
    existing.remove();
    disposeAllBadge3DCoins('modal');
  }

  const allBadges: BadgeRecord[] = getBadges();
  const earnedBadges = allBadges.filter((b) => b.unlocked);
  const lockedBadges = allBadges.filter((b) => !b.unlocked);
  const totalCount = allBadges.length;
  const earnedCount = earnedBadges.length;
  const lockedCount = lockedBadges.length;

  activeFilter = 'all';

  const overlay = document.createElement('div');
  overlay.id = 'all-badges-modal-overlay';
  overlay.className = 'all-badges-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'All Badges and Achievements');

  overlay.innerHTML = `
    <div class="all-badges-modal-card" id="all-badges-modal-card">
      
      <!-- Modal Header -->
      <div class="all-badges-modal-header">
        <div class="all-badges-header-title-wrap">
          <div class="all-badges-header-icon-circle">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"></path>
              <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"></path>
              <path d="M4 22h16"></path>
              <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"></path>
              <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"></path>
              <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"></path>
            </svg>
          </div>
          <div>
            <h2 class="all-badges-modal-title">All Badges & Achievements</h2>
            <p class="all-badges-modal-subtitle">Official 3D Kuizu coding trophies and milestones</p>
          </div>
        </div>

        <div class="all-badges-header-actions">
          <div class="all-badges-count-badge">
            <span class="all-badges-dot"></span>
            <span id="modal-all-badges-count-text">${earnedCount} / ${totalCount} Unlocked</span>
          </div>
          <button type="button" class="all-badges-close-btn" id="btn-close-all-badges-modal" aria-label="Close Badges Modal">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <!-- Filter Tabs Bar -->
      <div class="all-badges-filters-bar">
        <div class="all-badges-tab-group">
          <button type="button" class="all-badges-filter-tab active" data-filter="all">
            <span>All Badges</span>
            <span class="filter-count-badge">${totalCount}</span>
          </button>
          <button type="button" class="all-badges-filter-tab" data-filter="earned">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Earned</span>
            <span class="filter-count-badge earned">${earnedCount}</span>
          </button>
          <button type="button" class="all-badges-filter-tab" data-filter="locked">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>Locked</span>
            <span class="filter-count-badge locked">${lockedCount}</span>
          </button>
        </div>
      </div>

      <!-- Scrollable Badges Grid -->
      <div class="all-badges-grid-wrap">
        <div class="all-badges-cards-grid" id="all-badges-modal-grid">
          <!-- Rendered dynamically -->
        </div>
      </div>

    </div>
  `;

  document.body.appendChild(overlay);

  // Trigger reflow & open animation
  requestAnimationFrame(() => {
    overlay.classList.add('is-open');
  });

  const closeModal = () => {
    overlay.classList.remove('is-open');
    disposeAllBadge3DCoins('modal');
    setTimeout(() => {
      overlay.remove();
    }, 280);
  };

  // Close button listener
  document.getElementById('btn-close-all-badges-modal')?.addEventListener('click', closeModal);

  // Backdrop click listener
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      closeModal();
    }
  });

  // Escape key listener
  const keyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      window.removeEventListener('keydown', keyHandler);
      closeModal();
    }
  };
  window.addEventListener('keydown', keyHandler);

  // Render cards based on current active filter
  const renderCards = () => {
    const grid = document.getElementById('all-badges-modal-grid');
    if (!grid) return;

    disposeAllBadge3DCoins('modal');

    const filtered = allBadges.filter((b) => {
      if (activeFilter === 'earned') return b.unlocked;
      if (activeFilter === 'locked') return !b.unlocked;
      return true;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="all-badges-empty-state">
          <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <p>No ${activeFilter} badges found.</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = filtered
      .map((b, idx) => {
        const isEarned = b.unlocked;
        const actionLink = getActionLinkForBadge(b.id);

        return `
          <div class="all-badge-modal-card ${isEarned ? 'is-earned' : 'is-locked'}" data-badge-id="${b.id}" style="--badge-accent: ${b.accentColor}; --badge-glow: ${b.glowColor};">
            
            <!-- Top Status Pill -->
            <div class="all-badge-card-top-row">
              ${
                isEarned
                  ? `<div class="all-badge-status-pill earned">
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Earned • ${b.unlockedDate || 'Achieved'}</span>
                    </div>`
                  : `<div class="all-badge-status-pill locked">
                      <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                      <span>Locked</span>
                    </div>`
              }
            </div>

            <!-- 3D Coin Canvas Showcase -->
            <div class="all-badge-coin-stage ${!isEarned ? 'locked-coin-stage' : ''}">
              <div class="all-badge-ambient-glow" style="background: radial-gradient(circle, ${b.glowColor} 0%, transparent 70%);"></div>
              <div class="all-badge-canvas-wrap">
                <canvas class="all-badge-3d-canvas" width="110" height="110"></canvas>
                <div class="badge-coin-spinner">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                    <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
                    <path d="M12 2a10 10 0 0 1 10 10"></path>
                  </svg>
                </div>
              </div>
              ${
                !isEarned
                  ? `<div class="all-badge-locked-overlay-icon" title="Badge Locked">
                      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                      </svg>
                    </div>`
                  : ''
              }
            </div>

            <!-- Title & Subtitle -->
            <div class="all-badge-card-info">
              <h3 class="all-badge-card-title">${b.title}</h3>
              <p class="all-badge-card-sub">${b.subtitle}</p>
            </div>

            <!-- How to Earn / Condition Box -->
            <div class="all-badge-criteria-box ${isEarned ? 'earned' : 'locked'}">
              <div class="criteria-header">
                ${
                  isEarned
                    ? `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#059669" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>Completed Milestone</span>`
                    : `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#d97706" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                      </svg>
                      <span>How to Unlock</span>`
                }
              </div>
              <p class="criteria-desc">${b.condition}</p>
            </div>

            <!-- Card Actions -->
            <div class="all-badge-card-actions">
              <button type="button" class="btn-all-badge-inspect ${isEarned ? 'primary' : 'secondary'}" data-inspect-id="${b.id}">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                  <line x1="12" y1="22.08" x2="12" y2="12"></line>
                </svg>
                <span>${isEarned ? 'Inspect 3D Trophy' : 'Preview 3D'}</span>
              </button>

              ${
                !isEarned
                  ? `<a href="${actionLink.href}" class="btn-all-badge-action-link">
                      <span>${actionLink.label}</span>
                      <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                      </svg>
                    </a>`
                  : ''
              }
            </div>

          </div>
        `;
      })
      .join('');

    // Attach 3D renderer and click events to each card
    grid.querySelectorAll<HTMLDivElement>('.all-badge-modal-card').forEach((card, index) => {
      const badgeId = card.getAttribute('data-badge-id');
      const badge = allBadges.find((x) => x.id === badgeId);
      if (!badge) return;

      const canvas = card.querySelector<HTMLCanvasElement>('.all-badge-3d-canvas');
      if (canvas) {
        initBadge3DCoin(canvas, card, badge.glbModel, badge.id, index, 'modal');
      }

      // Inspect 3D button
      const inspectBtn = card.querySelector('.btn-all-badge-inspect');
      inspectBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        openBadgeModal(badge.id);
      });

      // Card click also inspects 3D
      card.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('.btn-all-badge-action-link')) return;
        openBadgeModal(badge.id);
      });
    });
  };

  // Wire Filter Tab Buttons
  overlay.querySelectorAll<HTMLButtonElement>('.all-badges-filter-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      overlay.querySelectorAll('.all-badges-filter-tab').forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      activeFilter = (tab.getAttribute('data-filter') as 'all' | 'earned' | 'locked') || 'all';
      renderCards();
    });
  });

  // Initial render of cards
  renderCards();
}

if (typeof window !== 'undefined') {
  (window as any).kuizuShowAllBadgesModal = showAllBadgesModal;
}
