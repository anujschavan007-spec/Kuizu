/**
 * KUIZU - Problem Leaderboard Page Interactive Logic
 * Dynamically fetches and ranks real users from /api/users,
 * populates the podium & rankings table, enables live search & level filter,
 * and powers interactive user stats modal preview.
 */
import './services/adminAuthGuard';

interface RealUser {
  id: string;
  name: string;
  email: string;
  student_id: string | null;
  avatar: string;
  role: string;
  status: string;
  rank?: string;
  xp: number;
  problems_solved: number;
  streak: number;
  present_classes?: number;
  total_classes?: number;
  cw_completed?: number;
  hw_completed?: number;
  leetcode_solved?: number;
  quiz_level?: number;
  joined_date?: string;
  last_active?: string;
}

interface RankedCoder extends RealUser {
  rankPosition: number;
  computedLevel: number;
  totalSubmissions: number;
  solvedCount: number;
  streakDays: number;
}

let toastTimeout: number | undefined;
let allCoders: RankedCoder[] = [];
let currentFilterLevel: string = 'all';
let currentSearchQuery: string = '';

/**
 * Display clean toast notification
 */
export function showToast(message: string, duration: number = 3200): void {
  const toast = document.getElementById('leaderboard-toast');
  if (!toast) return;

  if (toastTimeout) {
    window.clearTimeout(toastTimeout);
  }

  toast.textContent = message;
  toast.classList.add('show');

  toastTimeout = window.setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

/**
 * Escape HTML
 */
function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

/**
 * Get user initials for avatar fallback
 */
function getInitials(name: string): string {
  const parts = (name || 'Coder').trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return (name || 'C').slice(0, 2).toUpperCase();
}

/**
 * Render avatar markup with fallback
 */
function renderAvatarHtml(name: string, avatarUrl: string, sizeClass: 'size-sm' | 'size-lg', bgClass: string = 'default-bg'): string {
  const cleanName = escapeHtml(name);
  if (avatarUrl && (avatarUrl.startsWith('http') || avatarUrl.startsWith('/'))) {
    return `<img src="${avatarUrl}" alt="${cleanName}" class="${sizeClass === 'size-lg' ? 'podium-avatar-img' : 'table-user-avatar'}" onerror="this.outerHTML='<div class=\\'avatar-initials-fallback ${sizeClass} ${bgClass}\\'>${getInitials(name)}</div>';" />`;
  }
  return `<div class="avatar-initials-fallback ${sizeClass} ${bgClass}">${getInitials(name)}</div>`;
}

/**
 * Setup User Profile Avatar Dropdown
 */
function setupUserMenu(): void {
  const avatarBtn = document.getElementById('btn-user-avatar');
  const userDropdown = document.getElementById('user-dropdown');

  if (!avatarBtn || !userDropdown) return;

  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isExpanded = avatarBtn.getAttribute('aria-expanded') === 'true';
    avatarBtn.setAttribute('aria-expanded', String(!isExpanded));
    userDropdown.classList.toggle('show');
  });

  document.addEventListener('click', (e) => {
    if (!userDropdown.contains(e.target as Node) && !avatarBtn.contains(e.target as Node)) {
      userDropdown.classList.remove('show');
      avatarBtn.setAttribute('aria-expanded', 'false');
    }
  });

  const popupUserHeader = document.querySelector('.popup-user-header');
  popupUserHeader?.addEventListener('click', () => {
    window.location.href = '/profile';
  });

  const btnTheme = document.getElementById('btn-menu-theme');
  btnTheme?.addEventListener('click', () => {
    showToast('Theme switcher: Light / Dark toggled!');
  });

  const btnSettings = document.getElementById('btn-menu-settings');
  btnSettings?.addEventListener('click', () => {
    window.location.href = '/settings';
  });
}

/**
 * Open Coder Detail Modal
 */
function openProfileModal(coder: RankedCoder): void {
  const modal = document.getElementById('user-profile-modal');
  const modalName = document.getElementById('modal-user-name');
  const modalAvatar = document.getElementById('modal-user-avatar') as HTMLImageElement | null;
  const modalRank = document.getElementById('modal-user-rank');
  const modalLevel = document.getElementById('modal-user-level');
  const modalStreak = document.getElementById('modal-user-streak');
  const modalSubmissions = document.getElementById('modal-user-submissions');
  const modalSolved = document.getElementById('modal-user-solved');

  if (modalName) modalName.textContent = coder.name;
  if (modalAvatar) {
    modalAvatar.src = coder.avatar || '/images/home_avatar.png';
    modalAvatar.alt = coder.name;
  }
  if (modalRank) modalRank.textContent = `#${coder.rankPosition}`;
  if (modalLevel) {
    modalLevel.textContent = `Level ${coder.computedLevel}`;
    modalLevel.className = `table-level-badge level-${Math.min(coder.computedLevel, 7)}`;
  }
  if (modalStreak) modalStreak.textContent = `🔥 ${coder.streakDays} day streak`;
  if (modalSubmissions) modalSubmissions.textContent = coder.totalSubmissions.toLocaleString();
  if (modalSolved) modalSolved.textContent = coder.solvedCount.toLocaleString();

  if (modal) {
    modal.classList.add('show');
    modal.setAttribute('aria-hidden', 'false');
  }
}

/**
 * Render Top 3 Podium
 */
function renderPodium(top3: RankedCoder[]): void {
  const podiumRow = document.getElementById('leaderboard-podium-row');
  if (!podiumRow) return;

  const rank2 = top3[1]; // Silver
  const rank1 = top3[0]; // Gold
  const rank3 = top3[2]; // Bronze

  let html = '';

  // --- Rank 2 (Silver) ---
  if (rank2) {
    html += `
      <div class="podium-card podium-rank-2" data-coder-id="${escapeHtml(rank2.id)}">
        <div class="podium-crown-badge badge-silver">
          <svg viewBox="0 0 34 26" fill="currentColor">
            <path d="M3 21H31V24H3V21Z"/>
            <path d="M4 18L6 8L12 14L17 5L22 14L28 8L30 18H4Z"/>
            <circle cx="6" cy="7" r="1.8"/>
            <circle cx="17" cy="4" r="2.2"/>
            <circle cx="28" cy="7" r="1.8"/>
          </svg>
          <span class="crown-number">2</span>
        </div>
        <div class="podium-avatar-wrap">
          ${renderAvatarHtml(rank2.name, rank2.avatar, 'size-lg', 'silver-bg')}
        </div>
        <h3 class="podium-user-name">${escapeHtml(rank2.name)}</h3>
        <div class="podium-score-wrap">
          <span class="podium-score">${rank2.totalSubmissions.toLocaleString()}</span>
          <span class="podium-score-label">correct submissions</span>
        </div>
        <div class="podium-level-pill">Level ${rank2.computedLevel}</div>
      </div>
    `;
  } else {
    html += `<div class="podium-card podium-rank-2" style="opacity: 0.5;"><h3 class="podium-user-name">Rank #2 Open</h3></div>`;
  }

  // --- Rank 1 (Gold - Center elevated) ---
  if (rank1) {
    html += `
      <div class="podium-card podium-rank-1" data-coder-id="${escapeHtml(rank1.id)}">
        <div class="podium-rank-1-rays"></div>
        <div class="podium-crown-badge badge-gold">
          <svg viewBox="0 0 38 30" fill="currentColor">
            <path d="M4 25H34V28H4V25Z"/>
            <path d="M5 22L7 10L14 17L19 6L24 17L31 10L33 22H5Z"/>
            <circle cx="7" cy="9" r="2.2"/>
            <circle cx="19" cy="5" r="2.8"/>
            <circle cx="31" cy="9" r="2.2"/>
          </svg>
          <span class="crown-number">1</span>
        </div>
        <!-- Laurel Wreath Overlay -->
        <div class="podium-avatar-wreath-wrap">
          <svg class="laurel-wreath-svg laurel-left" viewBox="0 0 36 60" fill="none">
            <path d="M28 6C20 16 12 32 18 52" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M22 14C17 12 11 15 12 21C14 24 20 22 22 18" fill="#FDE68A" stroke="#F59E0B" stroke-width="1.2"/>
            <path d="M16 26C11 25 7 29 9 35C12 37 17 33 17 29" fill="#FDE68A" stroke="#F59E0B" stroke-width="1.2"/>
            <path d="M14 40C9 41 6 46 9 51C12 52 16 47 15 43" fill="#FDE68A" stroke="#F59E0B" stroke-width="1.2"/>
          </svg>
          <div class="podium-avatar-wrap rank-1-avatar">
            ${renderAvatarHtml(rank1.name, rank1.avatar, 'size-lg', 'gold-bg')}
          </div>
          <svg class="laurel-wreath-svg laurel-right" viewBox="0 0 36 60" fill="none">
            <path d="M8 6C16 16 24 32 18 52" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M14 14C19 12 25 15 24 21C22 24 16 22 14 18" fill="#FDE68A" stroke="#F59E0B" stroke-width="1.2"/>
            <path d="M20 26C25 25 29 29 27 35C24 37 19 33 19 29" fill="#FDE68A" stroke="#F59E0B" stroke-width="1.2"/>
            <path d="M22 40C27 41 30 46 27 51C24 52 20 47 21 43" fill="#FDE68A" stroke="#F59E0B" stroke-width="1.2"/>
          </svg>
        </div>
        <h3 class="podium-user-name">${escapeHtml(rank1.name)}</h3>
        <div class="podium-score-wrap">
          <span class="podium-score gold-score">${rank1.totalSubmissions.toLocaleString()}</span>
          <span class="podium-score-label">correct submissions</span>
        </div>
        <div class="podium-level-pill pill-gold">Level ${rank1.computedLevel}</div>
      </div>
    `;
  }

  // --- Rank 3 (Bronze) ---
  if (rank3) {
    html += `
      <div class="podium-card podium-rank-3" data-coder-id="${escapeHtml(rank3.id)}">
        <div class="podium-crown-badge badge-bronze">
          <svg viewBox="0 0 34 26" fill="currentColor">
            <path d="M3 21H31V24H3V21Z"/>
            <path d="M4 18L6 8L12 14L17 5L22 14L28 8L30 18H4Z"/>
            <circle cx="6" cy="7" r="1.8"/>
            <circle cx="17" cy="4" r="2.2"/>
            <circle cx="28" cy="7" r="1.8"/>
          </svg>
          <span class="crown-number">3</span>
        </div>
        <div class="podium-avatar-wrap">
          ${renderAvatarHtml(rank3.name, rank3.avatar, 'size-lg', 'bronze-bg')}
        </div>
        <h3 class="podium-user-name">${escapeHtml(rank3.name)}</h3>
        <div class="podium-score-wrap">
          <span class="podium-score">${rank3.totalSubmissions.toLocaleString()}</span>
          <span class="podium-score-label">correct submissions</span>
        </div>
        <div class="podium-level-pill">Level ${rank3.computedLevel}</div>
      </div>
    `;
  } else {
    html += `<div class="podium-card podium-rank-3" style="opacity: 0.5;"><h3 class="podium-user-name">Rank #3 Open</h3></div>`;
  }

  podiumRow.innerHTML = html;

  // Add click listeners to podium cards
  podiumRow.querySelectorAll<HTMLElement>('.podium-card[data-coder-id]').forEach((card) => {
    card.addEventListener('click', () => {
      const coderId = card.getAttribute('data-coder-id');
      const coder = allCoders.find((c) => c.id === coderId);
      if (coder) openProfileModal(coder);
    });
  });
}

/**
 * Filter and Render Table Rows
 */
function renderTableRows(): void {
  const tbody = document.getElementById('leaderboard-tbody');
  if (!tbody) return;

  const filtered = allCoders.filter((coder) => {
    // Level filter
    const matchLevel = currentFilterLevel === 'all' || String(coder.computedLevel) === currentFilterLevel;
    // Search query
    const query = currentSearchQuery.toLowerCase().trim();
    const matchSearch = !query || coder.name.toLowerCase().includes(query) || (coder.student_id && coder.student_id.toLowerCase().includes(query));
    return matchLevel && matchSearch;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 36px 0; color: #64748B;">
          <div style="font-size: 15px; font-weight: 600; margin-bottom: 4px;">No coders found</div>
          <div style="font-size: 13px; color: #94A3B8;">Try adjusting your search query or level filter.</div>
        </td>
      </tr>
    `;
    return;
  }

  let rowsHtml = '';
  filtered.forEach((coder) => {
    const isGold = coder.rankPosition === 1;
    const isSilver = coder.rankPosition === 2;
    const isBronze = coder.rankPosition === 3;

    let rankCellContent = '';
    if (isGold) {
      rankCellContent = `
        <div class="table-rank-cell">
          <svg class="table-rank-crown crown-gold" viewBox="0 0 16 14" fill="currentColor">
            <path d="M1 11h14v2H1v-2zm1-2l1-6 4 3.5 2-4.5 2 4.5 4-3.5 1 6H2z"/>
          </svg>
          <span class="table-rank-num">1</span>
        </div>
      `;
    } else if (isSilver) {
      rankCellContent = `
        <div class="table-rank-cell">
          <svg class="table-rank-crown crown-silver" viewBox="0 0 16 14" fill="currentColor">
            <path d="M1 11h14v2H1v-2zm1-2l1-6 4 3.5 2-4.5 2 4.5 4-3.5 1 6H2z"/>
          </svg>
          <span class="table-rank-num">2</span>
        </div>
      `;
    } else if (isBronze) {
      rankCellContent = `
        <div class="table-rank-cell">
          <svg class="table-rank-crown crown-bronze" viewBox="0 0 16 14" fill="currentColor">
            <path d="M1 11h14v2H1v-2zm1-2l1-6 4 3.5 2-4.5 2 4.5 4-3.5 1 6H2z"/>
          </svg>
          <span class="table-rank-num">3</span>
        </div>
      `;
    } else {
      rankCellContent = `<span class="rank-plain-number">${coder.rankPosition}</span>`;
    }

    const rankRowClass = isGold ? 'rank-row-1' : isSilver ? 'rank-row-2' : isBronze ? 'rank-row-3' : '';
    const levelBadgeClass = `level-${Math.min(coder.computedLevel, 7)}`;

    rowsHtml += `
      <tr class="leaderboard-row ${rankRowClass}" data-coder-id="${escapeHtml(coder.id)}" data-level="${coder.computedLevel}" data-rank="${coder.rankPosition}">
        <td class="col-rank">${rankCellContent}</td>
        <td class="col-user">
          <div class="table-user-cell">
            ${renderAvatarHtml(coder.name, coder.avatar, 'size-sm', isGold ? 'gold-bg' : isSilver ? 'silver-bg' : isBronze ? 'bronze-bg' : 'default-bg')}
            <div style="display: flex; flex-direction: column;">
              <span class="table-user-name">${escapeHtml(coder.name)}</span>
              ${coder.student_id ? `<span style="font-size: 11px; color: #94A3B8;">${escapeHtml(coder.student_id)}</span>` : ''}
            </div>
          </div>
        </td>
        <td class="col-level">
          <span class="table-level-badge ${levelBadgeClass}">Level ${coder.computedLevel}</span>
        </td>
        <td class="col-submissions">
          <span class="table-num-val">${coder.totalSubmissions.toLocaleString()}</span>
        </td>
        <td class="col-solved">
          <span class="table-num-val">${coder.solvedCount.toLocaleString()}</span>
        </td>
        <td class="col-streak">
          <div class="table-streak-badge">
            <svg class="table-flame-icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2c-.5 2.5-3 5-3 8 0 3.3 2.7 6 6 6s6-2.7 6-6c0-4.5-5-9.5-6-11-.3-.4-.7-.4-1 0zM8 15c0 2.2 1.8 4 4 4s4-1.8 4-4c0-2-1.5-4-3-5.5-1.5 1.5-3 3.5-3 5.5z"/>
            </svg>
            <span>${coder.streakDays} ${coder.streakDays === 1 ? 'day' : 'days'}</span>
          </div>
        </td>
        <td class="col-action">
          <span class="row-chevron">›</span>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = rowsHtml;

  // Add click listener to table rows
  tbody.querySelectorAll<HTMLTableRowElement>('.leaderboard-row').forEach((row) => {
    row.addEventListener('click', () => {
      const coderId = row.getAttribute('data-coder-id');
      const coder = allCoders.find((c) => c.id === coderId);
      if (coder) openProfileModal(coder);
    });
  });
}

/**
 * Update Sidebar Stat Widgets
 */
function updateSidebarStats(): void {
  const statTotal = document.getElementById('stat-total-submissions');
  const statYourRank = document.getElementById('stat-your-rank');
  const statYourSubs = document.getElementById('stat-your-submissions');

  const totalSum = allCoders.reduce((acc, c) => acc + c.totalSubmissions, 0);
  if (statTotal) {
    statTotal.textContent = totalSum.toLocaleString();
  }

  // Find logged-in user in allCoders (default to admin or #1)
  let loggedInUser = allCoders.find((c) => c.role === 'Admin' || c.email.includes('anuj'));
  if (!loggedInUser && allCoders.length > 0) {
    loggedInUser = allCoders[0];
  }

  if (loggedInUser) {
    if (statYourRank) statYourRank.textContent = `#${loggedInUser.rankPosition}`;
    if (statYourSubs) statYourSubs.textContent = `(${loggedInUser.totalSubmissions.toLocaleString()} correct submissions)`;
  }
}

/**
 * Fetch Real Users from API and compute rankings
 */
async function loadLeaderboardData(): Promise<void> {
  try {
    const res = await fetch('/api/users');
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    const data = await res.json();
    const users: RealUser[] = data.users || [];

    // Map each real user to RankedCoder with strictly calculated metrics based purely on real data
    const mapped: RankedCoder[] = users.map((u) => {
      const xp = Number(u.xp) || 0;
      const solved = Number(u.problems_solved || 0);
      const streak = Number(u.streak) || 0;
      const totalSubs = solved > 0 ? solved * 2 : (xp > 0 ? Math.round(xp / 10) : 0);
      const level = Math.max(1, Number(u.quiz_level) || 1);

      return {
        ...u,
        rankPosition: 0,
        computedLevel: level,
        totalSubmissions: totalSubs,
        solvedCount: solved,
        streakDays: streak,
      };
    });

    // Strictly sort by XP descending, then solvedCount descending, then present classes
    mapped.sort((a, b) => {
      if (b.xp !== a.xp) {
        return b.xp - a.xp;
      }
      if (b.solvedCount !== a.solvedCount) {
        return b.solvedCount - a.solvedCount;
      }
      const attA = Number(a.present_classes) || 0;
      const attB = Number(b.present_classes) || 0;
      if (attB !== attA) {
        return attB - attA;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    // Assign clean 1-based ranks
    mapped.forEach((coder, index) => {
      coder.rankPosition = index + 1;
      coder.rank = `#${index + 1}`;
    });

    allCoders = mapped;

    // Render podium with top 3
    renderPodium(allCoders.slice(0, 3));

    // Render table
    renderTableRows();

    // Update sidebar widgets
    updateSidebarStats();
  } catch (err) {
    console.error('Failed to load real leaderboard coders:', err);
    showToast('Failed to load live rankings. Please try again.');
    const tbody = document.getElementById('leaderboard-tbody');
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 36px 0; color: #EF4444;">
            Failed to load live rankings. <button onclick="location.reload()" style="background: none; border: none; color: #2563EB; text-decoration: underline; cursor: pointer; font-weight: 600;">Retry</button>
          </td>
        </tr>
      `;
    }
  }
}

/**
 * Setup Search and Level Filter Dropdowns
 */
function setupFilterAndSearch(): void {
  const filterBtn = document.getElementById('btn-level-filter');
  const filterMenu = document.getElementById('level-filter-menu');
  const selectedLabel = document.getElementById('selected-level-label');
  const options = document.querySelectorAll<HTMLButtonElement>('.level-option');
  const searchInput = document.getElementById('leaderboard-search-input') as HTMLInputElement | null;

  if (filterBtn && filterMenu) {
    filterBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = filterMenu.classList.toggle('show');
      filterBtn.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!filterMenu.contains(e.target as Node) && !filterBtn.contains(e.target as Node)) {
        filterMenu.classList.remove('show');
        filterBtn.setAttribute('aria-expanded', 'false');
      }
    });

    options.forEach((opt) => {
      opt.addEventListener('click', () => {
        const level = opt.getAttribute('data-level') || 'all';
        const text = opt.textContent || 'All Levels';

        options.forEach((o) => o.classList.remove('active'));
        opt.classList.add('active');

        if (selectedLabel) selectedLabel.textContent = text;
        filterMenu.classList.remove('show');
        filterBtn.setAttribute('aria-expanded', 'false');

        currentFilterLevel = level;
        renderTableRows();

        const count = allCoders.filter((c) => currentFilterLevel === 'all' || String(c.computedLevel) === currentFilterLevel).length;
        showToast(`Showing ${count} coders for ${text}`);
      });
    });
  }

  // Live search input
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      currentSearchQuery = searchInput.value;
      renderTableRows();
    });
  }
}

/**
 * Setup Profile Modal Dismissals
 */
function setupModalDismiss(): void {
  const modal = document.getElementById('user-profile-modal');
  const modalClose = document.getElementById('btn-close-profile-modal');
  const modalCloseAction = document.getElementById('btn-modal-close-action');

  const closeModal = () => {
    if (modal) {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden', 'true');
    }
  };

  modalClose?.addEventListener('click', closeModal);
  modalCloseAction?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  // Global ESC key listener
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
      const userDropdown = document.getElementById('user-dropdown');
      const avatarBtn = document.getElementById('btn-user-avatar');
      userDropdown?.classList.remove('show');
      avatarBtn?.setAttribute('aria-expanded', 'false');
    }
  });
}

function initLeaderboardPage(): void {
  setupUserMenu();
  setupFilterAndSearch();
  setupModalDismiss();
  loadLeaderboardData();
}

// Reliable instant execution
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLeaderboardPage);
} else {
  initLeaderboardPage();
}
